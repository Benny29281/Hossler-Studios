import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { authenticate, logout, requestReset, resetPassword } from '../../../lib/account.mjs';
import { adminAction } from '../../../lib/admin.mjs';
import { digest } from '../../../lib/crypto.mjs';
import { db, first, rows } from '../../../lib/db.mjs';
import { checkout, checkoutRates, paymentLink, simulatePayment } from '../../../lib/orders.mjs';
import { verifyAddressRegion } from '../../../lib/regions.mjs';
import { cart, fail, identity, limit } from '../../../lib/shop.mjs';
import { address, email, integer, loginPassword, newPassword, optional, postal, str, uuid } from '../../../lib/validation.mjs';

const checkoutInput = z.object({
  address, email, requestId: uuid, company: str(50), service: str(100), cost: integer(10_000_000),
  voucher: optional(32),
});

async function execute(action, data, actor) {
  const userId = actor.user?.id;
  if (action.startsWith('admin.')) {
    await adminAction(action, data, actor);
    return {};
  }
  switch (action) {
    case 'cart.update': {
      const { id, qty, add } = z.object({
        id: z.string().regex(/^[1-9][0-9]{0,17}$/), qty: integer(99), add: z.boolean().optional(),
      }).parse(data);
      return (await db()).transaction(async (connection) => {
        if (!qty) {
          await rows('DELETE FROM cart_items WHERE owner=$1 AND variant_id=$2', [actor.owner, id], connection);
        } else {
          const variant = await first(`SELECT v.stock,v.active,p.published FROM variants v
            JOIN products p ON p.slug=v.product_slug WHERE v.id=$1 FOR UPDATE OF v`, [id], connection);
          const item = await first('SELECT qty FROM cart_items WHERE owner=$1 AND variant_id=$2 FOR UPDATE', [actor.owner, id], connection);
          const target = add ? (item?.qty ?? 0) + qty : qty;
          if (!variant?.published || !variant.active || target > variant.stock || target > 99) fail('Jumlah melebihi stok yang tersedia.', 409);
          await rows(`INSERT INTO cart_items VALUES($1,$2,$3) ON CONFLICT(owner,variant_id) DO UPDATE SET qty=excluded.qty`,
            [actor.owner, id, target], connection);
        }
        return { cart: await cart(actor.owner, connection) };
      });
    }
    case 'rates':
      await limit('shipping:' + actor.owner, 35, 300);
      return { rates: await checkoutRates(actor.owner, postal.parse(data.postal)) };
    case 'checkout': {
      await limit('checkout:' + actor.owner, 8, 900);
      if (!process.env.MIDTRANS_SERVER_KEY && process.env.NODE_ENV === 'production') fail('Pembayaran belum dikonfigurasi.', 503);
      const input = checkoutInput.parse(data);
      return checkout(actor, { ...input, address: verifyAddressRegion(input.address) });
    }
    case 'payment':
      await limit('payment:' + actor.owner, 12, 900);
      return { url: await paymentLink(uuid.parse(data.id), actor) };
    case 'payment.demo':
      await simulatePayment(uuid.parse(data.id), actor);
      return {};
    case 'account.login':
    case 'account.register': {
      const register = action === 'account.register';
      const input = z.object({ email, password: register ? newPassword : loginPassword,
        name: register ? str(100) : optional(100) }).parse(data);
      await authenticate(actor, input, register);
      return {};
    }
    case 'account.logout':
      await logout();
      return {};
    case 'account.reset':
      await requestReset(email.parse(data.email));
      return { message: 'Jika email terdaftar, tautan pemulihan akan dikirim.' };
    case 'account.new-password': {
      const { code, password } = z.object({ code: z.string().regex(/^[a-f0-9]{64}$/), password: newPassword }).parse(data);
      await resetPassword(code, password);
      return {};
    }
    case 'account.profile': {
      if (!userId) fail('Masuk terlebih dahulu.', 401);
      const profile = z.object({ name: str(100), phone: optional(24) }).parse(data);
      await rows('UPDATE users SET name=$2,phone=$3 WHERE id=$1', [userId, profile.name, profile.phone]);
      return {};
    }
    case 'account.address': {
      if (!userId) fail('Masuk terlebih dahulu.', 401);
      const value = verifyAddressRegion(address.parse(data));
      if (data.id) {
        await rows('UPDATE addresses SET details=$3 WHERE id=$1 AND user_id=$2',
          [uuid.parse(data.id), userId, JSON.stringify(value)]);
      } else {
        const count = await first('SELECT count(*)::int AS count FROM addresses WHERE user_id=$1', [userId]);
        if (count.count >= 20) fail('Buku alamat telah penuh.');
        await rows('INSERT INTO addresses VALUES($1,$2,$3)', [randomUUID(), userId, JSON.stringify(value)]);
      }
      return {};
    }
    case 'account.address-delete':
      if (!userId) fail('Masuk terlebih dahulu.', 401);
      await rows('DELETE FROM addresses WHERE id=$1 AND user_id=$2', [uuid.parse(data.id), userId]);
      return {};
    case 'newsletter':
      await rows('INSERT INTO newsletter(email) VALUES($1) ON CONFLICT DO NOTHING', [email.parse(data.email)]);
      return { message: 'Email kamu sudah terdaftar.' };
    default:
      fail('Aksi tidak tersedia.', 404);
  }
}

export async function POST(request) {
  try {
    const origin = request.headers.get('origin');
    const configured = process.env.APP_URL && new URL(process.env.APP_URL).origin;
    const local = process.env.NODE_ENV !== 'production' && request.headers.get('host');
    const allowed = [request.nextUrl.origin, configured, local && request.nextUrl.protocol + '//' + local];
    if (!origin || !allowed.includes(origin)) {
      fail('Permintaan lintas situs ditolak.', 403);
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) fail('Format permintaan tidak valid.', 415);
    const raw = await request.text();
    if (raw.length > 32000) fail('Permintaan terlalu besar.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { fail('Format permintaan tidak valid.'); }
    const { action, data } = z.object({ action: str(60), data: z.record(z.string(), z.unknown()).default({}) }).parse(body);
    const actor = await identity(true);
    const network = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip');
    if (network) await limit('network:' + digest(network), 240, 300);
    await limit('request:' + actor.owner, 100, 300);
    return Response.json(await execute(action, data, actor));
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const message = issue.code === 'custom' && issue.path[0] === 'password'
        ? issue.message : 'Periksa kembali ' + (issue.path.join(' / ') || 'isi formulir') + '.';
      return Response.json({ error: message }, { status: 400 });
    }
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 500;
    if (status === 500) console.error(error);
    return Response.json({ error: status === 500 ? 'Terjadi gangguan. Coba lagi sebentar.' : error.message }, { status });
  }
}

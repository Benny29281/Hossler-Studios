import { randomUUID } from 'node:crypto';
import { db, first, rows } from './db.mjs';
import { cart, fail, ownedOrder, store } from './shop.mjs';
import { createPayment, demoPayment, orderEmail, paymentStatus, rates } from './providers.mjs';

export async function voucherDiscount(code, subtotal, connection, reserve = false) {
  if (!code) return 0;
  const voucher = await first(`SELECT * FROM vouchers WHERE code=$1 AND min_purchase<=$2
    AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now())
    AND (quota IS NULL OR reserved<quota)` + (reserve ? ' FOR UPDATE' : ''), [code, subtotal], connection);
  if (!voucher) fail('Voucher tidak berlaku untuk keranjang ini.');
  const amount = voucher.kind === 'percent' ? Math.floor(subtotal * voucher.value / 100) : voucher.value;
  if (reserve) await rows('UPDATE vouchers SET reserved=reserved+1 WHERE code=$1', [code], connection);
  return Math.min(amount, subtotal);
}

function checkItems(items) {
  if (!items.length) fail('Keranjang masih kosong.');
  if (items.some((item) => !item.available || item.stock < item.qty)) fail('Stok berubah. Perbarui keranjang sebelum checkout.', 409);
}

export async function checkoutRates(owner, postal) {
  const items = await cart(owner);
  checkItems(items);
  return rates(await store(), postal, items);
}

export async function enqueue(connection, id, ...kinds) {
  for (const kind of kinds) {
    await rows('INSERT INTO outbox(event_key,kind,order_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
      [kind + ':' + id, kind, id], connection);
  }
}

export async function checkout(actor, input) {
  const database = await db();
  const previous = await first('SELECT id FROM orders WHERE request_id=$1 AND (user_id=$2 OR guest_owner=$3)',
    [input.requestId, actor.user?.id ?? null, actor.guestOwner]);
  if (previous) return previous;
  const snapshot = await cart(actor.owner);
  checkItems(snapshot);
  const origin = await store();
  const options = await rates(origin, input.address.postal, snapshot);
  const courier = options.find(({ company, type, cost }) => company === input.company && type === input.service && cost === input.cost);
  if (!courier) fail('Tarif kurir berubah. Hitung ulang ongkir.', 409);
  return database.transaction(async (connection) => {
    const variantIds = snapshot.map(({ id }) => id);
    await rows('SELECT id FROM variants WHERE id=ANY($1::bigint[]) ORDER BY id FOR UPDATE', [variantIds], connection);
    await rows('SELECT variant_id FROM cart_items WHERE owner=$1 ORDER BY variant_id FOR UPDATE', [actor.owner], connection);
    const existing = await first('SELECT id FROM orders WHERE request_id=$1 AND (user_id=$2 OR guest_owner=$3)',
      [input.requestId, actor.user?.id ?? null, actor.guestOwner], connection);
    if (existing) return existing;
    const items = await cart(actor.owner, connection);
    checkItems(items);
    const fingerprint = (entries) => JSON.stringify(entries.map(({ id, qty, price, weight }) => [id, qty, price, weight]));
    if (fingerprint(items) !== fingerprint(snapshot)) fail('Keranjang berubah. Periksa kembali checkout.', 409);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discount = await voucherDiscount(input.voucher, subtotal, connection, true);
    const total = subtotal + courier.cost - discount;
    const id = randomUUID();
    const number = 'HS-' + id.replaceAll('-', '').slice(0, 20).toUpperCase();
    const email = actor.user?.email ?? input.email;
    await rows(`INSERT INTO orders (id,request_id,user_id,guest_owner,number,email,address,items,subtotal,shipping,discount,total,voucher,courier,origin,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now()+interval '24 hours')`, [
      id, input.requestId, actor.user?.id ?? null, actor.user ? null : actor.guestOwner, number, email,
      JSON.stringify(input.address), JSON.stringify(items), subtotal, courier.cost, discount, total,
      input.voucher || null, JSON.stringify(courier), JSON.stringify({
        originName: origin.originName, originPhone: origin.originPhone, originAddress: origin.originAddress, originPostal: origin.originPostal,
      }),
    ], connection);
    for (const { id: variant, qty } of items) {
      await rows('UPDATE variants SET stock=stock-$2 WHERE id=$1', [variant, qty], connection);
    }
    await rows('DELETE FROM cart_items WHERE owner=$1 AND variant_id=ANY($2::bigint[])', [actor.owner, variantIds], connection);
    await enqueue(connection, id, 'created', 'admin');
    if (items.some(({ stock, qty }) => stock > 5 && stock - qty <= 5)) await enqueue(connection, id, 'stock');
    if (total === 0) {
      await rows("UPDATE orders SET status='processing',paid_at=now(),provider_status='free' WHERE id=$1", [id], connection);
      await enqueue(connection, id, 'paid');
    }
    return { id };
  });
}

export async function paymentLink(id, actor) {
  const database = await db();
  return database.transaction(async (connection) => {
    await ownedOrder(id, actor, connection);
    const order = await first('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [id], connection);
    if (order.status !== 'pending' || new Date(order.expires_at) <= new Date()) fail('Pesanan ini tidak dapat dibayar.', 409);
    if (order.payment_url) return order.payment_url;
    const url = await createPayment(order, (await store(connection)).paymentMethods);
    if (url) await rows('UPDATE orders SET payment_url=$2 WHERE id=$1', [id, url], connection);
    return url;
  });
}

async function settle(connection, order, status) {
  if (order.status !== 'pending') return;
  await rows("UPDATE orders SET status='processing',paid_at=now(),provider_status=$2 WHERE id=$1", [order.id, status], connection);
  await enqueue(connection, order.id, 'paid');
}

async function cancel(connection, order, status) {
  if (order.status !== 'pending') return;
  for (const { id, qty } of order.items) {
    await rows('UPDATE variants SET stock=stock+$2 WHERE id=$1', [id, qty], connection);
  }
  if (order.voucher) await rows('UPDATE vouchers SET reserved=reserved-1 WHERE code=$1', [order.voucher], connection);
  await rows("UPDATE orders SET status='cancelled',provider_status=$2 WHERE id=$1", [order.id, status], connection);
}

export async function simulatePayment(id, actor) {
  if (!demoPayment()) fail('Metode demo tidak tersedia.', 404);
  return (await db()).transaction(async (connection) => {
    await ownedOrder(id, actor, connection);
    const order = await first('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [id], connection);
    if (new Date(order.expires_at) <= new Date()) return cancel(connection, order, 'expire');
    return settle(connection, order, 'demo');
  });
}

export async function reconcile(number, expiredOnly = false) {
  return (await db()).transaction(async (connection) => {
    const order = await first("SELECT * FROM orders WHERE number=$1 AND status='pending' FOR UPDATE", [number], connection);
    if (!order) return;
    const expired = new Date(order.expires_at) <= new Date();
    if (expiredOnly && !expired) return;
    const payment = await paymentStatus(number, expired && !!order.payment_url);
    const status = payment?.transaction_status;
    if (payment && (payment.order_id !== number || Number(payment.gross_amount) !== order.total)) {
      fail('Data pembayaran berbeda dari pesanan.', 409);
    }
    if (status === 'settlement' || (status === 'capture' && payment.fraud_status === 'accept')) {
      return settle(connection, order, status);
    }
    if (expired && (!payment || ['expire', 'cancel', 'deny', 'failure'].includes(status))) {
      return cancel(connection, order, status || 'expire');
    }
    if (status) await rows('UPDATE orders SET provider_status=$2 WHERE id=$1', [order.id, status], connection);
  });
}

export async function deliverOutbox() {
  const config = await store();
  const events = await rows(`UPDATE outbox SET leased_at=now() WHERE event_key IN (
    SELECT event_key FROM outbox WHERE sent_at IS NULL AND (leased_at IS NULL OR leased_at<now()-interval '5 minutes')
    ORDER BY event_key LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING *`);
  let pending = 0;
  for (const event of events) {
    try {
      const order = await first('SELECT * FROM orders WHERE id=$1', [event.order_id]);
      const sent = await orderEmail(event, order, config);
      if (sent) await rows('UPDATE outbox SET sent_at=now() WHERE event_key=$1', [event.event_key]);
      else pending += 1;
    } catch (error) {
      console.error('Outbox', event.event_key, error.message);
      pending += 1;
    }
  }
  return pending;
}

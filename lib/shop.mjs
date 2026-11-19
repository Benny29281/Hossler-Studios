import { cookies } from 'next/headers';
import { digest, token } from './crypto.mjs';
import { first, rows } from './db.mjs';
import { aceTeeImage } from './images.mjs';
import { journeySlug, journeyTitle, legacyJourneySlug } from './content.mjs';

export const demo = () => process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== '0';
export const statuses = {
  pending: 'Menunggu Pembayaran', processing: 'Diproses', shipped: 'Dikirim',
  complete: 'Selesai', cancelled: 'Dibatalkan',
};
export const money = (cost) => 'Rp' + new Intl.NumberFormat('id-ID').format(cost);
export const date = (value) => new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));
export const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export const cookieOptions = {
  httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && process.env.LOCAL_DATABASE !== '1',
  path: '/', maxAge: 60 * 60 * 24 * 30,
};

export async function identity(createGuest = false) {
  const jar = await cookies();
  const session = jar.get('hs_session')?.value;
  const user = session && await first(
    'SELECT u.id,u.name,u.email,u.phone,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=$1 AND s.expires_at > now()',
    [digest(session)]
  );
  let guest = jar.get('hs_guest')?.value;
  if (createGuest && !guest) {
    guest = token();
    jar.set('hs_guest', guest, { ...cookieOptions, maxAge: 60 * 60 * 24 * 90 });
  }
  const guestOwner = guest ? 'guest:' + digest(guest) : null;
  return { user: user || null, guestOwner, owner: user ? 'user:' + user.id : guestOwner };
}

export const store = async (connection) => (await first("SELECT value FROM settings WHERE key='store'", [], connection)).value;
export const collections = () => rows('SELECT * FROM collections ORDER BY name');
function pageTitle(page) {
  if (page?.slug === legacyJourneySlug && page.title.trim().toLowerCase() === 'community') {
    return { ...page, title: journeyTitle };
  }
  return page;
}

export const pages = async () => (await rows('SELECT * FROM pages ORDER BY slug')).map(pageTitle);
export const contentPage = async (slug) => pageTitle(await first('SELECT * FROM pages WHERE slug=$1',
  [slug === journeySlug ? legacyJourneySlug : slug]));
export const productImages = (product) => product.images.length ? product.images : [aceTeeImage];

export function products(includeDrafts = false) {
  return rows(`SELECT p.*, c.name AS category, coalesce((
    SELECT jsonb_agg(jsonb_build_object('id',v.id::text,'size',v.size,'stock',v.stock) ORDER BY v.id)
    FROM variants v WHERE v.product_slug=p.slug AND v.active
  ), '[]'::jsonb) AS variants FROM products p LEFT JOIN collections c ON p.collection=c.slug
  WHERE ($1::boolean OR p.published) ORDER BY p.position,p.created_at DESC`, [includeDrafts]);
}

export function cart(owner, connection) {
  if (!owner) return [];
  return rows(`SELECT v.id::text AS id,v.size,v.stock,p.slug,p.name,p.price,p.weight,
    p.images->>0 AS image,c.qty,p.published AND v.active AS available FROM cart_items c JOIN variants v ON v.id=c.variant_id
    JOIN products p ON p.slug=v.product_slug WHERE c.owner=$1 ORDER BY v.id`, [owner], connection);
}

export async function ownedOrder(id, actor, connection) {
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) fail('Pesanan tidak ditemukan.', 404);
  const order = await first(
    'SELECT * FROM orders WHERE id=$1 AND (user_id=$2 OR guest_owner=$3 OR $4::boolean)',
    [id, actor.user?.id ?? null, actor.guestOwner, actor.user?.role === 'admin'], connection
  );
  if (!order) fail('Pesanan tidak ditemukan.', 404);
  return order;
}

export async function limit(key, maximum, seconds) {
  const entry = await first(`INSERT INTO rate_limits AS r VALUES ($1,1,now()+$2::integer * interval '1 second')
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN r.expires_at<now() THEN 1 ELSE r.count+1 END,
    expires_at=CASE WHEN r.expires_at<now() THEN excluded.expires_at ELSE r.expires_at END RETURNING count`,
  [key, seconds]);
  if (entry.count > maximum) fail('Terlalu banyak percobaan. Coba beberapa saat lagi.', 429);
}

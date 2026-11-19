import { createHash } from 'node:crypto';
import { sameSecret } from './crypto.mjs';
import { demo, fail, money } from './shop.mjs';

async function request(url, { key, body, authorization = key, method = body ? 'POST' : 'GET' }) {
  const response = await fetch(url, {
    method, headers: { Authorization: authorization, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(12_000),
  });
  const data = await response.json();
  return { data, ok: response.ok, status: response.status };
}

const midtransLive = () => process.env.MIDTRANS_PRODUCTION === '1';
const midtransKey = () => process.env.MIDTRANS_SERVER_KEY;
const core = () => midtransLive() ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
const auth = () => 'Basic ' + Buffer.from(midtransKey() + ':').toString('base64');
const site = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
export const demoPayment = () => demo() && !midtransKey();

export async function createPayment(order, methods) {
  if (demoPayment()) return null;
  if (!midtransKey()) fail('Pembayaran belum dikonfigurasi.', 503);
  const snap = midtransLive() ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
  if (new Date(order.expires_at).getTime() - Date.now() < 5 * 60_000) fail('Waktu pembayaran hampir habis.', 409);
  const startTime = new Date(new Date(order.created_at).getTime() + 7 * 3_600_000)
    .toISOString().slice(0, 19).replace('T', ' ') + ' +0700';
  const { data, ok } = await request(snap + '/snap/v1/transactions', { authorization: auth(), body: {
    transaction_details: { order_id: order.number, gross_amount: order.total },
    customer_details: { first_name: order.address.name, email: order.email, phone: order.address.phone },
    expiry: { start_time: startTime, unit: 'hours', duration: 24 },
    callbacks: { finish: site() + '/orders/' + order.id },
    ...(methods ? { enabled_payments: methods.split(',').map((v) => v.trim()).filter(Boolean) } : {}),
  } });
  if (!ok || !data.redirect_url?.startsWith(snap + '/')) fail('Midtrans belum dapat membuka pembayaran. Coba lagi dari detail pesanan.', 502);
  return data.redirect_url;
}

export function verifyNotification(data) {
  return !!midtransKey() && typeof data.order_id === 'string' &&
    sameSecret(data.signature_key, createHash('sha512')
      .update(data.order_id + data.status_code + data.gross_amount + midtransKey()).digest('hex'));
}

export async function paymentStatus(number, expire = false) {
  if (demoPayment()) return null;
  if (!midtransKey()) fail('Midtrans belum dikonfigurasi.', 503);
  const endpoint = core() + '/v2/' + encodeURIComponent(number);
  if (expire) {
    // A concurrent settlement can win the race. Read the final status before releasing stock.
    await request(endpoint + '/expire', { authorization: auth(), method: 'POST' });
  }
  const { data, ok, status } = await request(endpoint + '/status', { authorization: auth() });
  if (status === 404 || String(data.status_code) === '404') return null;
  if (!ok || !data.transaction_status) fail('Status pembayaran belum dapat diperiksa.', 502);
  return data;
}

async function biteship(path, body) {
  const key = process.env.BITESHIP_API_KEY;
  if (!key) fail('Pengiriman belum dikonfigurasi.', 503);
  const { data, ok } = await request('https://api.biteship.com/v1' + path, { key, body });
  if (!ok || data.success === false) fail('Biteship belum dapat memproses permintaan. Periksa data pengiriman.', 502);
  return data;
}

export const shippingDemo = () => demo() && !process.env.BITESHIP_API_KEY;
export function shippingItems(items) {
  return items.map((item) => ({
    name: item.name + ' · ' + item.size, value: item.price, quantity: item.qty, weight: item.weight,
  }));
}

export async function rates(origin, postal, items) {
  if (shippingDemo()) return [
    { company: 'demo', type: 'reg', name: 'Kurir Reguler (Demo)', cost: 18000, duration: '2–4 hari', methods: ['pickup'] },
    { company: 'demo', type: 'exp', name: 'Kurir Ekspres (Demo)', cost: 32000, duration: '1–2 hari', methods: ['pickup'] },
  ];
  if (!/^\d{5}$/.test(origin.originPostal) || !origin.couriers) fail('Asal dan kurir pengiriman belum diatur.', 503);
  const data = await biteship('/rates/couriers', {
    origin_postal_code: Number(origin.originPostal), destination_postal_code: Number(postal), 
    couriers: origin.couriers, items: shippingItems(items),
  });
  return (data.pricing ?? []).map((rate) => ({
    company: rate.courier_code, type: rate.courier_service_code,
    name: [rate.courier_name, rate.courier_service_name].join(' '),
    cost: rate.price, duration: rate.duration || rate.shipment_duration_range,
    methods: rate.available_collection_method,
  })).filter((rate) => Number.isInteger(rate.cost) && rate.cost >= 0 && rate.company && rate.type);
}

export async function bookShipment(order) {
  const { origin, address, courier } = order;
  if (!origin.originName || !origin.originPhone || !origin.originAddress) fail('Lengkapi alamat gudang di Pengaturan.');
  const data = await biteship('/orders', {
    origin_contact_name: origin.originName, origin_contact_phone: origin.originPhone,
    origin_address: origin.originAddress, origin_postal_code: Number(origin.originPostal),
    destination_contact_name: address.name, destination_contact_phone: address.phone,
    destination_contact_email: order.email, destination_address: [address.detail, address.district, address.city, address.province].join(', '),
    destination_postal_code: Number(address.postal), courier_company: courier.company, courier_type: courier.type,
    origin_collection_method: courier.methods?.includes('pickup') ? 'pickup' : 'drop_off',
    delivery_type: 'now', reference_id: order.number, items: shippingItems(order.items),
  });
  if (typeof data.id !== 'string' || !data.id) fail('Biteship tidak mengembalikan ID pengiriman.', 502);
  return { id: data.id, tracking: data.courier?.waybill_id || null, link: shippingLink(data) };
}

export const shipmentStatus = (id) => biteship('/orders/' + encodeURIComponent(id));
export const shippingLink = (data) => {
  const value = data.courier?.link;
  if (typeof value !== 'string') return null;
  try { return new URL(value).protocol === 'https:' ? value : null; } catch { return null; }
};

export async function emailMessage(to, subject, message, key) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, text: message }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Resend gagal mengirim email.');
  return true;
}

export async function orderEmail(event, order, settings) {
  const labels = { created: 'Pesanan diterima', paid: 'Pembayaran diterima', shipped: 'Pesanan dikirim',
    admin: 'Pesanan baru', stock: 'Stok produk menipis' };
  const internal = ['admin', 'stock'].includes(event.kind);
  const to = internal ? settings.adminEmail : order.email;
  if (!to) return true;
  const message = [
    labels[event.kind] + ' · ' + order.number, 'Total ' + money(order.total),
    order.tracking ? 'Resi ' + order.tracking : '',
    event.kind === 'stock' ? site() + '/admin/reports' : site() + '/orders/' + order.id,
    settings.emailFooter,
  ].filter(Boolean).join('\n');
  return emailMessage(to, labels[event.kind] + ' · ' + settings.name, message, event.event_key);
}

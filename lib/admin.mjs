import { z } from 'zod';
import { db, first, rows } from './db.mjs';
import { enqueue } from './orders.mjs';
import { bookShipment, shipmentStatus, shippingLink } from './providers.mjs';
import { fail, store } from './shop.mjs';
import { code, email, image, integer, optional, postal, slug, str, uuid } from './validation.mjs';

const product = z.object({
  slug, name: str(), description: str(4000), material: optional(), seo: optional(),
  price: integer(20_000_000, 1), weight: integer(30_000, 1), collection: slug.or(z.literal('')),
  position: integer(100000), published: z.boolean(), images: z.array(image).min(1).max(8),
  variants: z.array(z.object({ size: str(20), stock: integer(100_000), previous: integer(100_000).optional() })).min(1).max(30),
}).refine(({ variants }) => new Set(variants.map(({ size }) => size)).size === variants.length, 'Ukuran tidak boleh ganda.');

const settings = z.object({
  name: str(80), heroTitle: str(100), heroDescription: str(220), heroImage: image,
  originName: optional(), originPhone: optional(25), originAddress: optional(500), originPostal: postal.or(z.literal('')),
  couriers: optional(160), instagram: z.url({ protocol: /^https$/ }).or(z.literal('')),
  adminEmail: email.or(z.literal('')), paymentMethods: optional(200), emailFooter: optional(800),
});

export async function adminAction(action, data, actor) {
  if (actor.user?.role !== 'admin') fail('Akses admin diperlukan.', 403);
  switch (action) {
    case 'admin.product': {
      const record = product.parse(data);
      return (await db()).transaction(async (connection) => {
        await rows(`INSERT INTO products(slug,name,description,material,seo,price,weight,collection,position,published,images)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(slug) DO UPDATE SET
          name=excluded.name,description=excluded.description,material=excluded.material,seo=excluded.seo,price=excluded.price,
          weight=excluded.weight,collection=excluded.collection,position=excluded.position,published=excluded.published,images=excluded.images`,
        [record.slug, record.name, record.description, record.material, record.seo, record.price, record.weight,
          record.collection || null, record.position, record.published, JSON.stringify(record.images)], connection);
        const current = await rows('SELECT size,stock FROM variants WHERE product_slug=$1 ORDER BY id FOR UPDATE', [record.slug], connection);
        await rows('UPDATE variants SET active=false WHERE product_slug=$1', [record.slug], connection);
        for (const { size, stock, previous } of record.variants) {
          const available = current.find((variant) => variant.size === size)?.stock;
          if (previous !== undefined && previous !== stock && available !== previous) {
            fail('Stok ukuran ' + size + ' berubah. Muat ulang halaman sebelum mengubah stok.', 409);
          }
          const quantity = previous === stock ? available : stock;
          await rows(`INSERT INTO variants(product_slug,size,stock) VALUES($1,$2,$3)
            ON CONFLICT(product_slug,size) DO UPDATE SET stock=excluded.stock,active=true`, [record.slug, size, quantity], connection);
        }
      });
    }
    case 'admin.archive':
      return rows('UPDATE products SET published=false WHERE slug=$1', [slug.parse(data.slug)]);
    case 'admin.collection': {
      const entry = z.object({ slug, name: str(100) }).parse(data);
      return rows('INSERT INTO collections VALUES($1,$2) ON CONFLICT(slug) DO UPDATE SET name=excluded.name', [entry.slug, entry.name]);
    }
    case 'admin.page': {
      const page = z.object({ slug, title: str(100), content: str(12000) }).parse(data);
      return rows('INSERT INTO pages VALUES($1,$2,$3) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,content=excluded.content',
        [page.slug, page.title, page.content]);
    }
    case 'admin.settings':
      return rows("UPDATE settings SET value=$1 WHERE key='store'", [JSON.stringify(settings.parse(data))]);
    case 'admin.voucher': {
      const voucher = z.object({
        code, kind: z.enum(['percent','fixed']), value: integer(20_000_000, 1), min: integer(200_000_000),
        quota: integer(1_000_000).nullable(), starts: z.iso.date().or(z.literal('')), ends: z.iso.date().or(z.literal('')),
      }).parse(data);
      if (voucher.kind === 'percent' && voucher.value > 100) fail('Persentase maksimal 100%.');
      if (voucher.starts && voucher.ends && voucher.starts > voucher.ends) fail('Tanggal akhir lebih awal dari tanggal mulai.');
      return rows(`INSERT INTO vouchers(code,kind,value,min_purchase,quota,starts_at,ends_at) VALUES($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT(code) DO UPDATE SET kind=excluded.kind,value=excluded.value,min_purchase=excluded.min_purchase,
        quota=excluded.quota,starts_at=excluded.starts_at,ends_at=excluded.ends_at`,
      [voucher.code, voucher.kind, voucher.value, voucher.min, voucher.quota,
        voucher.starts ? voucher.starts + 'T00:00:00+07:00' : null,
        voucher.ends ? voucher.ends + 'T23:59:59+07:00' : null]);
    }
    case 'admin.order': {
      const { id, mode, tracking } = z.object({
        id: uuid, mode: z.enum(['manual','book','sync','complete']), tracking: optional(120),
      }).parse(data);
      return (await db()).transaction(async (connection) => {
        const order = await first('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [id], connection);
        if (!order) fail('Pesanan tidak ditemukan.', 404);
        if (!['processing','shipped'].includes(order.status)) fail('Pesanan belum siap dikirim.');
        if (mode === 'complete') {
          if (order.status !== 'shipped') fail('Pesanan harus dikirim dahulu.');
          return rows("UPDATE orders SET status='complete' WHERE id=$1", [id], connection);
        }
        let waybill = tracking;
        if (mode === 'book') {
          if (order.status !== 'processing' || order.shipping_id || order.tracking) fail('Pengiriman sudah dibuat.');
          const shipment = await bookShipment(order);
          waybill = shipment.tracking;
          await rows('UPDATE orders SET shipping_id=$2,tracking_url=$3 WHERE id=$1', [id, shipment.id, shipment.link], connection);
        }
        if (mode === 'sync') {
          if (!order.shipping_id) fail('Pengiriman Biteship belum ada.');
          const shipment = await shipmentStatus(order.shipping_id);
          waybill = shipment.courier?.waybill_id || order.tracking;
          const link = shippingLink(shipment);
          if (link) await rows('UPDATE orders SET tracking_url=$2 WHERE id=$1', [id, link], connection);
          if (shipment.status === 'delivered' && waybill) {
            await rows("UPDATE orders SET status='complete',tracking=$2 WHERE id=$1", [id, waybill], connection);
            await enqueue(connection, id, 'shipped');
            return;
          }
        }
        if (mode === 'manual' && !waybill) fail('Isi nomor resi.');
        if (waybill) {
          await rows("UPDATE orders SET tracking=$2,status='shipped' WHERE id=$1", [id, waybill], connection);
          await enqueue(connection, id, 'shipped');
        }
      });
    }
    default: fail('Aksi tidak tersedia.', 404);
  }
}

export async function reports() {
  const [daily, monthly, best, low] = await Promise.all([
    rows(`SELECT (paid_at AT TIME ZONE 'Asia/Jakarta')::date::text AS period,count(*)::int AS count,sum(total)::int AS revenue
      FROM orders WHERE paid_at IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 30`),
    rows(`SELECT to_char(paid_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM') AS period,count(*)::int AS count,sum(total)::int AS revenue
      FROM orders WHERE paid_at IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 12`),
    rows(`SELECT i->>'name' AS name,sum((i->>'qty')::int)::int AS qty FROM orders CROSS JOIN LATERAL jsonb_array_elements(items) i
      WHERE paid_at IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
    rows(`SELECT p.name,v.size,v.stock FROM variants v JOIN products p ON p.slug=v.product_slug
      WHERE p.published AND v.active AND v.stock<=5 ORDER BY v.stock,p.name LIMIT 30`),
  ]);
  return { daily, monthly, best, low };
}

export async function adminCustomers() {
  return rows(`SELECT u.id,u.name,u.email,u.phone,count(o.id)::int AS orders,coalesce(sum(o.total) FILTER(WHERE o.paid_at IS NOT NULL),0)::int AS spending,
    coalesce(jsonb_agg(jsonb_build_object('id',o.id,'number',o.number,'status',o.status,'total',o.total) ORDER BY o.created_at DESC)
      FILTER(WHERE o.id IS NOT NULL),'[]'::jsonb) AS history
    FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.name LIMIT 100`);
}

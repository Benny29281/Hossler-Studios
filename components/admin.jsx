import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminCustomers, reports } from '../lib/admin.mjs';
import { rows } from '../lib/db.mjs';
import { collections, date, money, pages, products, statuses, store } from '../lib/shop.mjs';
import { ActionForm } from './client.jsx';
import { ProductForm, SettingsForm, VoucherForm } from './admin-forms.jsx';

const tabs = {
  orders: 'Pesanan', products: 'Produk', collections: 'Koleksi', customers: 'Pelanggan',
  vouchers: 'Voucher', content: 'Konten', reports: 'Laporan', settings: 'Pengaturan',
};

function Id({ id }) {
  return <input name="id" value={id} type="hidden"/>;
}

async function Orders({ filter }) {
  const status = typeof filter.status === 'string' && Object.hasOwn(statuses, filter.status) ? filter.status : '';
  const orders = await rows("SELECT * FROM orders WHERE ($1::text='' OR status=$1) ORDER BY created_at DESC LIMIT 100", [status]);
  return <>
    <form action="/admin/orders" className="filters"><label>Status<select name="status" defaultValue={status}><option value="">Semua status</option>{Object.entries(statuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="button secondary" type="submit">Terapkan</button></form>
    {!orders.length && <p>Belum ada pesanan.</p>}
    {orders.map((order) => <details className="admin-detail" key={order.id}><summary>{order.number} · {statuses[order.status]} · {money(order.total)}</summary>
      <p>{order.address.name} · {order.email} · {date(order.created_at)} WIB</p>
      <p>{order.courier.name}{order.tracking && ' · Resi ' + order.tracking}</p>
      <div className="cluster"><Link className="text-link" href={'/orders/' + order.id}>Detail & invoice</Link><Link className="text-link" href={'/orders/' + order.id + '?print=label'}>Label pengiriman</Link></div>
      {['processing','shipped'].includes(order.status) && <div className="cluster admin-order-actions">
        <ActionForm action="admin.order"><Id id={order.id}/><input name="mode" value="manual" type="hidden"/>
          <label>Nomor resi<input name="tracking" defaultValue={order.tracking} required/></label><button className="button secondary" type="submit">Simpan resi & kirim</button></ActionForm>
        {order.shipping_id ? <ActionForm action="admin.order"><Id id={order.id}/><input name="mode" value="sync" type="hidden"/><button className="button secondary" type="submit">Sinkronkan Biteship</button></ActionForm>
          : order.status === 'processing' && order.courier.company !== 'demo' && <ActionForm action="admin.order"><Id id={order.id}/><input name="mode" value="book" type="hidden"/><button className="button secondary" type="submit">Buat pengiriman Biteship</button></ActionForm>}
        {order.status === 'shipped' && <ActionForm action="admin.order"><Id id={order.id}/><input name="mode" value="complete" type="hidden"/><button className="button" type="submit">Tandai selesai</button></ActionForm>}
      </div>}
    </details>)}
  </>;
}

async function Products() {
  const [list, groups] = await Promise.all([products(true), collections()]);
  return <>
    <details className="admin-detail"><summary>Tambah produk</summary><ProductForm groups={groups}/></details>
    {list.map((item) => <details className="admin-detail" key={item.slug}>
      <summary>{item.name} · {money(item.price)} · {item.published ? 'Terbit' : 'Draf'}</summary>
      <ProductForm key={item.variants.map(({size, stock}) => size + '=' + stock).join(',')} item={item} groups={groups}/>
      {item.published && <ActionForm action="admin.archive"><input type="hidden" name="slug" value={item.slug}/><button className="plain" type="submit">Arsipkan produk</button></ActionForm>}
    </details>)}
  </>;
}

function CollectionForm({ item }) {
  return <ActionForm action="admin.collection" reset={!item}><div className="fields">
    <label>Nama koleksi<input name="name" defaultValue={item?.name} required /></label>
    <label>Slug<input name="slug" defaultValue={item?.slug} readOnly={!!item} required /></label></div>
    <button className="button" type="submit">Simpan koleksi</button></ActionForm>;
}

async function Collections() {
  return <>
    <details className="admin-detail"><summary>Tambah koleksi</summary><CollectionForm/></details>
    {(await collections()).map((item) => <details className="admin-detail" key={item.slug}><summary>{item.name}</summary><CollectionForm item={item}/></details>)}
    <p>Gunakan kolom Urutan di Produk untuk mengatur posisi produk dalam koleksi.</p>
  </>;
}

async function Customers() {
  const customers = await adminCustomers();
  return <>
    {!customers.length && <p>Belum ada pelanggan terdaftar.</p>}
    {customers.map((customer) => <details className="admin-detail" key={customer.id}><summary>{customer.name} · {customer.email} · {customer.orders} pesanan</summary>
      <p>Total belanja {money(customer.spending)}{customer.phone && ' · ' + customer.phone}</p>
      <ul>{(customer.orders ? customer.history : []).map((order) => <li key={order.id}><Link href={'/orders/' + order.id}>{order.number}</Link> · {statuses[order.status]} · {money(order.total)}</li>)}</ul>
    </details>)}
  </>;
}

async function Vouchers() {
  const vouchers = await rows(`SELECT *,to_char(starts_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD') AS starts,
    to_char(ends_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD') AS ends FROM vouchers ORDER BY code`);
  return <><details className="admin-detail"><summary>Tambah voucher</summary><VoucherForm/></details>
    {vouchers.map((item) => <details className="admin-detail" key={item.code}><summary>{item.code} · {item.reserved} terpakai / direservasi</summary><VoucherForm item={item}/></details>)}</>;
}

async function Content() {
  return <><p>Ubah banner Home dari tab <Link className="text-link" href="/admin/settings">Pengaturan</Link>.</p>
    {(await pages()).map((page) => <details className="admin-detail" key={page.slug}><summary>{page.title}</summary>
      <ActionForm action="admin.page"><input name="slug" type="hidden" value={page.slug}/><label>Judul<input name="title" defaultValue={page.title} required/></label>
        <label>Konten<textarea name="content" defaultValue={page.content} rows={6} required/></label><button className="button" type="submit">Simpan halaman</button>
      </ActionForm></details>)}
  </>;
}

async function Reports() {
  const data = await reports();
  return <div className="two-column">
    {[['Penjualan harian',data.daily], ['Penjualan bulanan',data.monthly]].map(([title, periods]) => <section className="panel" key={title}><h3>{title}</h3>
      {periods.map(({ period,count,revenue }) => <p className="spread" key={period}><span>{period} · {count} order</span><strong>{money(revenue)}</strong></p>)}
      {!periods.length && <p>Belum ada penjualan.</p>}</section>)}
    <section className="panel"><h3>Produk terlaris</h3>{data.best.map(({name, qty}) => <p className="spread" key={name}><span>{name}</span><strong>{qty}</strong></p>)}{!data.best.length && <p>Belum ada penjualan.</p>}</section>
    <section className="panel"><h3>Stok menipis</h3>{data.low.map(({name,size,stock}, index) => <p className="spread" key={index}><span>{name} · {size}</span><strong>{stock}</strong></p>)}{!data.low.length && <p>Stok dalam batas aman.</p>}</section>
  </div>;
}

export async function Admin({ tab, filter }) {
  if (!Object.hasOwn(tabs, tab)) notFound();
  const views = { orders: <Orders filter={filter}/>, products: <Products/>, collections: <Collections/>,
    customers: <Customers/>, vouchers: <Vouchers/>, content: <Content/>, reports: <Reports/> };
  return <section className="shell section admin"><h1>Dashboard<span className="red">.</span></h1>
    <nav aria-label="Menu admin" className="admin-nav">{Object.entries(tabs).map(([key, label]) => <Link key={key}
      href={'/admin/' + key} aria-current={key === tab ? 'page' : undefined}>{label}</Link>)}</nav>
    <h2>{tabs[tab]}</h2>{tab === 'settings' ? <SettingsForm settings={await store()}/> : views[tab]}
  </section>;
}

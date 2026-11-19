import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Admin } from '../../components/admin.jsx';
import { Login, Profile } from '../../components/account.jsx';
import { AddToCart, CartControls, ProductGallery } from '../../components/client.jsx';
import { Checkout, Payment, Print } from '../../components/checkout.jsx';
import { HomeSlideshow } from '../../components/home-slideshow.jsx';
import { journeySlug, publicPagePath } from '../../lib/content.mjs';
import { rows } from '../../lib/db.mjs';
import { aceTeeImage, homeSlides, hosslerLogo } from '../../lib/images.mjs';
import { demoPayment, shippingDemo } from '../../lib/providers.mjs';
import { cart, collections, contentPage, date, identity, money, ownedOrder, productImages, products, statuses, store } from '../../lib/shop.mjs';

export const dynamic = 'force-dynamic';
const hasStock = ({ variants }) => variants.some(({ stock }) => stock > 0);
const total = (items) => items.reduce((sum, { price, qty }) => sum + price * qty, 0);
const productUrl = (slug) => '/products/' + slug;

function Badge({ item }) {
  if (!hasStock(item)) return <span className="badge">Sold Out</span>;
  if (Date.now() - new Date(item.created_at).getTime() < 30 * 86400000) return <span className="badge new">New</span>;
  return null;
}

function Card({ item }) {
  return <article className="product-card">
    <Link href={productUrl(item.slug)} className="card-photo">
      <img src={productImages(item)[0]} alt={item.name} loading="lazy" width="627" height="627" />
      <Badge item={item} />
    </Link>
    <div className="card-copy"><Link href={productUrl(item.slug)}>{item.name}</Link><strong>{money(item.price)}</strong></div>
    {item.category && <p>{item.category}</p>}
  </article>;
}

function Listing({ list, groups, filter, group }) {
  const query = (key) => typeof filter[key] === 'string' ? filter[key] : '';
  const category = group?.slug || query('category');
  const minimum = Math.max(0, Number(query('min')) || 0);
  const maximum = Math.max(0, Number(query('max')) || Infinity);
  const sizes = [...new Set(list.flatMap(({ variants }) => variants.map(({ size }) => size)))];
  const results = list.filter((item) => (!category || item.collection === category) &&
    (!query('size') || item.variants.some(({ size }) => size === query('size'))) && item.price >= minimum && item.price <= maximum);
  if (query('sort') === 'low') results.sort((a, b) => a.price - b.price);
  if (query('sort') === 'high') results.sort((a, b) => b.price - a.price);
  if (query('sort') === 'new') results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return <section className="shell section">
    <h1>{group?.name || (query('sort') === 'new' ? 'New Arrivals' : 'All Products')}<span className="red">.</span></h1>
    <form action={group ? '/collections/' + group.slug : '/products'} className="filters">
      {!group && <label>Kategori<select name="category" defaultValue={category}><option value="">Semua kategori</option>{groups.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>}
      <label>Ukuran<select name="size" defaultValue={query('size')}><option value="">Semua ukuran</option>{sizes.map((size) => <option key={size}>{size}</option>)}</select></label>
      <label>Harga minimum<input type="number" step="1000" min="0" name="min" placeholder="Rp0" defaultValue={query('min')} /></label>
      <label>Harga maksimum<input type="number" step="1000" min="0" name="max" placeholder="Tanpa batas" defaultValue={query('max')} /></label>
      <label>Urutkan<select name="sort" defaultValue={query('sort')}><option value="">Unggulan</option><option value="new">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option></select></label>
      <button className="button secondary" type="submit">Terapkan</button>
    </form>
    <p className="muted">{results.length} produk</p>
    {results.length ? <div className="catalog">{results.map((item) => <Card key={item.slug} item={item} />)}</div> : <p>Belum ada produk yang sesuai.</p>}
  </section>;
}

function Product({ item, list }) {
  const images = productImages(item);
  const url = new URL(productUrl(item.slug), process.env.APP_URL || 'http://localhost:3000').href;
  const data = { '@context': 'https://schema.org', '@type': 'Product', name: item.name, description: item.description,
    image: images.map((image) => new URL(image, url).href), brand: { '@type': 'Brand', name: 'Hossler Studios' },
    offers: { '@type': 'Offer', url, priceCurrency: 'IDR', price: item.price, availability: 'https://schema.org/' + (hasStock(item) ? 'InStock' : 'OutOfStock') } };
  const related = list.filter((entry) => entry.slug !== item.slug && entry.collection === item.collection).slice(0, 4);
  return <section className="shell section">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
    <div className="breadcrumb"><Link href="/products">All Products</Link><span>/</span>{item.name}</div>
    <div className="product-layout"><ProductGallery images={images} name={item.name} />
      <div className="product-info"><p className="eyebrow red">{item.category || 'Hossler Studios'}</p><h1>{item.name}<span className="red">.</span></h1>
        <p className="price">{money(item.price)}</p><p className="product-description">{item.description}</p>
        <AddToCart variants={item.variants}/>
        {item.material && <details><summary>Bahan & perawatan</summary><p>{item.material}</p></details>}
        <details><summary>Pengiriman & retur</summary><p>Ongkir dihitung saat checkout. <Link href="/pages/shipping-returns">Lihat informasi pengiriman dan retur.</Link></p></details>
      </div>
    </div>
    {related.length > 0 && <div className="section"><h2>Produk terkait</h2><div className="catalog">{related.map((entry) => <Card key={entry.slug} item={entry}/>)}</div></div>}
  </section>;
}

function Empty({ title, text }) {
  return <section className="shell section empty"><h1>{title}<span className="red">.</span></h1><p>{text}</p><Link className="button" href="/products">Lihat produk</Link></section>;
}

function Cart({ items }) {
  if (!items.length) return <Empty title="Keranjang" text="Keranjangmu masih kosong." />;
  const available = items.every((item) => item.available && item.stock >= item.qty);
  const subtotal = total(items);
  return <section className="shell section"><h1>Keranjang<span className="red">.</span></h1>
    <div className="two-column"><div>{items.map((item) => <article className="cart-row" key={item.id}>
      <Link className="cart-row-photo" href={productUrl(item.slug)}><img src={item.image || aceTeeImage} alt={item.name} width="112" height="124"/></Link>
      <div><Link className="text-link" href={productUrl(item.slug)}>{item.name}</Link><p>Ukuran {item.size} · {money(item.price)}</p>
        {(!item.available || item.stock < item.qty) && <p className="red">Jumlah ini tidak tersedia.</p>}</div>
      <strong>{money(item.price * item.qty)}</strong>
      <CartControls item={item}/>
    </article>)}</div>
    <aside className="panel summary"><h2>Ringkasan</h2><p className="spread"><span>Subtotal</span><strong>{money(subtotal)}</strong></p>
      <p className="muted">Ongkir dihitung saat checkout.</p>{available && <Link className="button wide" href="/checkout">Checkout</Link>}</aside></div>
  </section>;
}

function OrderTable({ orders }) {
  if (!orders.length) return <p>Belum ada pesanan.</p>;
  return <div className="table-scroll"><table><thead><tr><th>Pesanan</th><th>Tanggal</th><th>Status</th><th>Total</th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.id}><td><Link className="text-link" href={'/orders/' + order.id}>{order.number}</Link></td><td>{date(order.created_at)}</td><td><span className={'status ' + order.status}>{statuses[order.status]}</span></td><td>{money(order.total)}</td></tr>)}
  </tbody></table></div>;
}

function OrderDetail({ order, isNew, label }) {
  const { address } = order;
  const trackUrl = order.tracking_url || 'https://cekresi.com/?noresi=' + encodeURIComponent(order.tracking || '');
  if (label) return <section className="shell section invoice"><h1>Label Pengiriman</h1><p>{order.number}</p>
    <p>Dari {order.origin.originName || 'Hossler Studios'} · {order.origin.originAddress}</p>
    <h2>{address.name}</h2><p>{address.phone}</p><p>{address.detail}, {address.district}, {address.city}, {address.province} {address.postal}</p>
    <p>{order.courier.name} · {order.tracking || 'Resi belum tersedia'}</p><Print name="Cetak label"/></section>;
  return <section className="shell section invoice">
    <div className="breadcrumb no-print"><Link href="/orders">Pesanan</Link><span>/</span>{order.number}</div>
    <h1>{isNew ? 'Pesanan diterima' : 'Detail pesanan'}<span className="red">.</span></h1>
    <p>{order.number} · {date(order.created_at)} WIB</p>
    <div className="two-column">
      <div>
        <div className="panel"><h2>Status</h2><p className={'status ' + order.status}>{statuses[order.status]}</p>
          {order.status === 'pending' && <><p>Bayar sebelum {date(order.expires_at)} WIB.</p><div className="no-print"><Payment id={order.id} demo={demoPayment()} providerStatus={order.provider_status}/></div></>}
          {order.tracking && <p>Resi {order.tracking} · <a className="text-link" href={trackUrl} target="_blank" rel="noreferrer">Lacak pengiriman</a></p>}
          <p>{order.courier.name}{order.courier.duration ? ' · ' + order.courier.duration : ''}</p>
        </div>
        <div className="panel"><h2>Alamat pengiriman</h2><p>{address.name} · {address.phone}<br/>{address.detail}<br/>{address.district}, {address.city}, {address.province} {address.postal}</p></div>
      </div>
      <aside className="panel summary"><h2>Invoice</h2>
        {order.items.map((item) => <p className="spread" key={item.id}><span>{item.name} · {item.size} × {item.qty}</span><strong>{money(item.price * item.qty)}</strong></p>)}
        <p className="spread"><span>Subtotal</span><strong>{money(order.subtotal)}</strong></p>
        <p className="spread"><span>Ongkir</span><strong>{money(order.shipping)}</strong></p>
        {order.discount > 0 && <p className="spread"><span>Diskon</span><strong>−{money(order.discount)}</strong></p>}
        <p className="spread rule"><strong>Total</strong><strong>{money(order.total)}</strong></p><Print/>
      </aside>
    </div>
  </section>;
}

const simpleTitles = { products: 'All Products', collections: 'Collections', cart: 'Keranjang', checkout: 'Checkout', orders: 'Pesanan', account: 'Akun', admin: 'Admin' };

export async function generateMetadata({ params }) {
  const [root, slug] = (await params).path ?? [];
  if (!root) return {
    title: { absolute: 'Hossler Studios' },
    description: 'Toko resmi Hossler Studios dan koleksi Poker Tees\'26.',
    alternates: { canonical: '/' },
    openGraph: { title: 'Hossler Studios', description: 'Toko resmi Hossler Studios.', images: [hosslerLogo] },
  };
  if (root === 'products' && slug) {
    const item = (await products()).find((item) => item.slug === slug);
    if (item) return { title: item.name, description: item.seo || item.description,
      alternates: { canonical: productUrl(slug) }, openGraph: { title: item.name, description: item.seo || item.description, images: [productImages(item)[0]] } };
  }
  if (root === 'pages' && slug) {
    const content = await contentPage(slug);
    if (content) return { title: content.title, alternates: { canonical: publicPagePath(content.slug) } };
  }
  if (root) return { title: simpleTitles[root] || 'Hossler Studios', ...(!['products', 'collections'].includes(root) && { robots: { index: false, follow: false } }) };
}

export default async function Page({ params, searchParams }) {
  const path = (await params).path ?? [];
  const [root, slug] = path;
  const query = await searchParams;
  if (path.length > 2) notFound();
  if (!root) return <HomeSlideshow slides={homeSlides(await store())} />;
  if (root === 'products') {
    const list = await products();
    if (!slug) return <Listing list={list} groups={await collections()} filter={query}/>;
    const item = list.find((record) => record.slug === slug);
    if (!item) notFound();
    return <Product item={item} list={list}/>;
  }
  if (root === 'collections') {
    const groups = await collections();
    if (!slug) return <section className="shell section"><h1>Collections<span className="red">.</span></h1><div className="catalog">{groups.map((group) => <Link className="panel collection-link" key={group.slug} href={'/collections/' + group.slug}>{group.name}</Link>)}</div></section>;
    const group = groups.find((item) => item.slug === slug);
    if (!group) notFound();
    return <Listing list={await products()} groups={groups} filter={query} group={group}/>;
  }
  if (root === 'pages' && slug) {
    const page = await contentPage(slug);
    if (!page) notFound();
    return <article className="shell section prose"><h1>{page.title}<span className="red">.</span></h1><p>{page.content}</p>
      {slug === journeySlug && <img className="journey-visual" src="/images/our-journey.webp" alt="Hossler Fucking Studios" width="1280" height="800" />}
    </article>;
  }
  if (!['cart', 'checkout', 'orders', 'account', 'admin'].includes(root) || (slug && root !== 'orders' && root !== 'admin')) notFound();
  const actor = await identity();
  if (root === 'cart') return <Cart items={await cart(actor.owner)}/>;
  if (root === 'checkout') {
    const items = await cart(actor.owner);
    if (!items.length) return <Empty title="Checkout" text="Tambahkan produk ke keranjang untuk mulai." />;
    const user = actor.user;
    const addresses = user ? await rows('SELECT id,details FROM addresses WHERE user_id=$1 ORDER BY id', [user.id]) : [];
    return <section className="shell section"><h1>Checkout<span className="red">.</span></h1><Checkout items={items} addresses={addresses}
      user={user ? { name: user.name, email: user.email, phone: user.phone } : null} demo={shippingDemo()}/></section>;
  }
  if (root === 'account') {
    if (!actor.user || typeof query.reset === 'string') return <section className="shell section"><Login mode={query.mode} reset={query.reset} checkout={query.checkout === '1'}/></section>;
    const addresses = await rows('SELECT id,details FROM addresses WHERE user_id=$1 ORDER BY id', [actor.user.id]);
    return <section className="shell section"><h1>Akun<span className="red">.</span></h1><Profile user={actor.user} addresses={addresses}/></section>;
  }
  if (root === 'orders') {
    if (slug) {
      const order = await ownedOrder(slug, actor).catch((error) => { if (error.status === 404) notFound(); throw error; });
      return <OrderDetail order={order} isNew={query.new === '1'} label={query.print === 'label' && actor.user?.role === 'admin'}/>;
    }
    const orders = await rows('SELECT id,number,created_at,status,total FROM orders WHERE user_id=$1 OR guest_owner=$2 ORDER BY created_at DESC LIMIT 100', [actor.user?.id ?? null, actor.guestOwner]);
    return <section className="shell section"><h1>Pesanan<span className="red">.</span></h1>{!actor.user && <p>Masuk untuk melihat pesanan akunmu. <Link className="text-link" href="/account">Masuk</Link></p>}<OrderTable orders={orders}/></section>;
  }
  if (!actor.user) redirect('/account');
  if (actor.user.role !== 'admin') notFound();
  return <Admin tab={slug || 'orders'} filter={query}/>;
}

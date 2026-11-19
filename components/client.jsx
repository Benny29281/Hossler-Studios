'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { aceTeeImage } from '../lib/images.mjs';

export const rupiah = (amount) => 'Rp' + new Intl.NumberFormat('id-ID').format(amount);

export async function send(action, data = {}) {
  const response = await fetch('/api/shop', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Terjadi gangguan.');
  return result;
}

export function Icon({ name, size = 20 }) {
  const paths = {
    bag: <><path d="M4 7h16l1 14H3L4 7Z"/><path d="M8 9V6a4 4 0 1 1 8 0v3"/></>,
    user: <><circle cx="12" cy="7" r="3.2"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/></>,
    box: <><path d="M4 6l8-3 8 3v12l-8 3-8-3V6Z"/><path d="m4 6 8 4 8-4m-8 4v11M8 4l8 4"/></>,
    menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
    close: <path d="m5 5 14 14M19 5 5 19"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    minus: <path d="M5 12h14"/>,
    zoom: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6m-3-3v6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const navigation = [
  ['/', 'Home'], ['/products?sort=new', 'New Arrivals'], ['/products', 'All Products'],
  ['/collections', 'Collections'], ['/pages/community', 'Community'], ['/pages/about', 'About'],
];

export function SiteHeader({ items, account }) {
  const [menu, setMenu] = useState(false);
  const drawer = useRef(null);
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  return <>
    <div className="announcement"><span aria-hidden="true">♥</span> HOSSLER STUDIOS · DROP PERDANA</div>
    <header className="site-header">
      <div className="nav-shell">
        <button className="icon mobile-menu" type="button" onClick={() => setMenu(!menu)} aria-label={menu ? 'Tutup menu' : 'Buka menu'} aria-expanded={menu} aria-controls="mobile-navigation"><Icon name={menu ? 'close' : 'menu'} /></button>
        <Link href="/" className="wordmark" aria-label="Hossler Studios, beranda">HOSSLER<span>STUDIOS</span><b aria-hidden="true">♥</b></Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">{navigation.map(([href, name]) => <Link key={href} href={href}>{name}</Link>)}</nav>
        <div className="nav-tools">
          <Link aria-label="Pesanan" title="Pesanan" href="/orders" className="icon desktop-tool"><Icon name="box" /></Link>
          <Link aria-label="Akun" title="Akun" href="/account" className="icon desktop-tool"><Icon name="user" /></Link>
          <button className="icon cart-button" aria-label={'Buka keranjang, ' + count + ' barang'} type="button" onClick={() => drawer.current.showModal()}><Icon name="bag" /><span>{count}</span></button>
          <span className="currency" aria-label="Mata uang rupiah">IDR</span>
        </div>
      </div>
      {menu && <nav className="mobile-nav" id="mobile-navigation" aria-label="Navigasi utama">{[...navigation, ['/orders','Orders'], ['/account','Account'], ...(account === 'admin' ? [['/admin','Admin']] : [])].map(([href, name]) => <Link key={href} href={href} onClick={() => setMenu(false)}>{name}</Link>)}</nav>}
    </header>
    <dialog ref={drawer} className="cart-dialog" onClick={(event) => { if (event.target === event.currentTarget) drawer.current.close(); }}>
      <div className="drawer-inner">
        <div className="spread"><h2>Keranjang ({count})</h2><button className="icon" autoFocus aria-label="Tutup keranjang" onClick={() => drawer.current.close()}><Icon name="close" /></button></div>
        {items.length ? <>
          {items.map((item) => <div className="mini-item" key={item.id}><img src={item.image || aceTeeImage} alt="" width="58" height="64"/><div><strong>{item.name}</strong><p>{item.size} · {item.qty} × {rupiah(item.price)}</p></div></div>)}
          <div className="drawer-total spread"><strong>Subtotal</strong><strong>{rupiah(items.reduce((sum, item) => sum + item.price * item.qty, 0))}</strong></div>
          <Link className="button" href="/cart" onClick={() => drawer.current.close()}>Lihat keranjang</Link>
        </> : <><p>Keranjangmu masih kosong.</p><Link className="button" href="/products" onClick={() => drawer.current.close()}>Lihat produk</Link></>}
      </div>
    </dialog>
  </>;
}

export function SiteFooter({ instagram }) {
  return <footer className="footer"><div className="shell footer-grid">
    <div><Link href="/" className="wordmark">HOSSLER<span>STUDIOS</span><b aria-hidden="true">♥</b></Link><p>Independent streetwear.</p></div>
    <nav aria-label="Informasi toko"><strong>Informasi</strong><Link href="/pages/size-guide">Panduan ukuran</Link><Link href="/pages/shipping-returns">Pengiriman & retur</Link><Link href="/pages/terms">Syarat & ketentuan</Link><Link href="/pages/privacy">Kebijakan privasi</Link>{instagram && <a href={instagram} target="_blank" rel="noreferrer">Instagram</a>}</nav>
    <div><strong>Newsletter</strong><p>Kabar tentang drop berikutnya.</p><ActionForm action="newsletter" className="newsletter"><input type="email" name="email" placeholder="Alamat email" aria-label="Alamat email" required/><button type="submit">Daftar</button></ActionForm></div>
    <small>© Hossler Studios</small>
  </div></footer>;
}

export function ActionForm({ action, children, transform, navigate, reset, className = '', onSuccess }) {
  const router = useRouter();
  const [state, setState] = useState({ busy: false, message: '', failed: false });
  async function submit(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    const submitter = event.nativeEvent.submitter;
    if (submitter?.name) form.set(submitter.name, submitter.value);
    setState({ busy: true, message: '' });
    try {
      const result = await send(action, transform ? transform(form) : Object.fromEntries(form));
      if (reset) target.reset();
      setState({ busy: false, message: result.message || 'Tersimpan.', failed: false });
      if (navigate) router.push(navigate);
      onSuccess?.(result);
      router.refresh();
    } catch (error) {
      setState({ busy: false, message: error.message, failed: true });
    }
  }
  return <form className={className} onSubmit={submit}><fieldset disabled={state.busy}>{children}</fieldset>
    {state.message && <p className={state.failed ? 'feedback bad' : 'feedback'} role={state.failed ? 'alert' : 'status'}>{state.message}</p>}
  </form>;
}

export function ProductGallery({ images, name }) {
  const [active, setActive] = useState(0);
  const zoom = useRef(null);
  return <div className="gallery"><button className="photo zoom" onClick={() => zoom.current.showModal()} aria-label="Perbesar foto produk">
    <img src={images[active]} alt={name + ' · foto ' + (active + 1)} fetchPriority="high" /><span><Icon name="zoom" /></span></button>
    <div className="thumbs">{images.map((image, index) => <button key={image + index} onClick={() => setActive(index)} aria-pressed={index === active} aria-label={'Foto ' + (index + 1)}><img src={image} alt="" loading="lazy"/></button>)}</div>
    <dialog className="zoom-dialog" ref={zoom} onClick={() => zoom.current.close()}><button className="icon" autoFocus aria-label="Tutup zoom"><Icon name="close"/></button><img src={images[active]} alt={name} /></dialog>
  </div>;
}

export function AddToCart({ variants }) {
  const [size, setSize] = useState('');
  const available = variants.some(({ stock }) => stock > 0);
  return <ActionForm action="cart.update" className="buy-form" transform={() => ({ id: size, qty: 1, add: true })}>
    <div className="spread"><strong>Pilih ukuran</strong><Link className="text-link" href="/pages/size-guide">Panduan ukuran</Link></div>
    <div className="sizes">{variants.map((variant) => <button type="button" disabled={!variant.stock} key={variant.id} aria-pressed={size === variant.id}
      title={variant.stock ? variant.stock + ' tersedia' : 'Stok habis'} onClick={() => setSize(variant.id)}>{variant.size}</button>)}</div>
    <button className="button wide" type="submit" disabled={!size || !available}>{available ? 'Tambah ke keranjang' : 'Sold Out'}</button>
  </ActionForm>;
}

export function CartControls({ item }) {
  return <ActionForm action="cart.update" className="cart-controls" transform={(form) => ({
    id: item.id, qty: form.get('intent') === 'remove' ? 0 : Number(form.get('qty')),
  })}>
    <input type="number" name="qty" aria-label={'Jumlah ' + item.name + ' ukuran ' + item.size} min="1" max={Math.max(1, Math.min(item.stock, 99))} defaultValue={item.qty} required />
    <button type="submit" name="intent" value="update">Perbarui</button>
    <button type="submit" name="intent" value="remove" formNoValidate>Hapus</button>
  </ActionForm>;
}

export function Voucher({ subtotal, editable = true }) {
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState(0);
  useEffect(() => { setCode(sessionStorage.getItem('hs_voucher') || ''); }, []);
  useEffect(() => { setDiscount(0); }, [subtotal, code]);
  if (!editable) return <p>{code ? 'Voucher: ' + code : ''}</p>;
  return <><ActionForm action="voucher" onSuccess={(result) => {
    sessionStorage.setItem('hs_voucher', code.trim().toUpperCase());
    setDiscount(result.discount);
  }}><label>Kode voucher<input name="code" value={code} onChange={(event) => { setCode(event.target.value); sessionStorage.removeItem('hs_voucher'); }} required maxLength={32} /></label><button className="button secondary" type="submit">Terapkan</button></ActionForm>
    {discount > 0 && <p className="spread"><span>Estimasi setelah diskon</span><strong>{rupiah(subtotal - discount)}</strong></p>}
  </>;
}

export function CookieNotice() {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(!localStorage.getItem('hs_consent')); }, []);
  function select(value) {
    localStorage.setItem('hs_consent', value);
    setOpen(false);
    window.dispatchEvent(new Event('hossler:consent'));
  }
  if (!open) return null;
  return <aside className="cookie-notice" aria-label="Preferensi cookie"><div><strong>Preferensi cookie</strong><p>Cookie penting menyimpan keranjang dan sesi. Kamu dapat mengizinkan cookie analitik. <Link href="/pages/privacy">Kebijakan privasi</Link></p></div><div><button className="button secondary" onClick={() => select('essential')}>Cookie penting saja</button><button className="button" onClick={() => select('all')}>Izinkan analitik</button></div></aside>;
}

export function Analytics({ ga, pixel }) {
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    const read = () => setConsent(localStorage.getItem('hs_consent') === 'all');
    read();
    window.addEventListener('hossler:consent', read);
    return () => window.removeEventListener('hossler:consent', read);
  }, []);
  if (!consent) return null;
  return <>
    {/^G-[A-Z0-9]+$/.test(ga ?? '') && <><Script src={'https://www.googletagmanager.com/gtag/js?id=' + ga} /><Script id="ga">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(ga)});`}</Script></>}
    {/^\d{6,30}$/.test(pixel ?? '') && <Script id="meta-pixel">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};n.queue=[];n.loaded=true;n.version='2.0';t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixel)});fbq('track','PageView');`}</Script>}
  </>;
}

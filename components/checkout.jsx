'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ActionForm, rupiah, send } from './client.jsx';
import { AddressFields } from './address-fields.jsx';

export function Checkout({ items, user, addresses, demo }) {
  const router = useRouter();
  const [addressId, setAddressId] = useState('');
  const [postal, setPostal] = useState('');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const idempotency = useRef('');
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const courier = options[selected];
  const savedAddress = addresses.find(({ id }) => id === addressId)?.details;
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const address = Object.fromEntries(form);
    setBusy(true); setFeedback('');
    try {
      if (event.nativeEvent.submitter?.value === 'rates' || !courier) {
        const result = await send('rates', { postal: address.postal });
        setOptions(result.rates); setSelected(0);
        if (!result.rates.length) setFeedback('Kurir belum tersedia untuk alamat ini.');
        return;
      }
      idempotency.current ||= crypto.randomUUID();
      const { id } = await send('checkout', {
        requestId: idempotency.current, email: user?.email || form.get('email'), address,
        company: courier.company, service: courier.type, cost: courier.cost,
      });
      router.push('/orders/' + id + '?new=1');
      router.refresh();
    } catch (error) { setFeedback(error.message); }
    finally { setBusy(false); }
  }
  return <form className="two-column checkout" onSubmit={submit}>
    <fieldset disabled={busy}>
      <section className="panel"><h2>Kontak & alamat</h2>
        {!user && <p>Belanja sebagai tamu atau <Link className="text-link" href="/account?checkout=1">masuk ke akun</Link>.</p>}
        <label>Email<input name="email" type="email" autoComplete="email" value={user?.email} readOnly={!!user} required /></label>
        {addresses.length > 0 && <label>Alamat tersimpan<select value={addressId} onChange={(event) => {
          const id = event.target.value;
          setAddressId(id);
          setPostal(addresses.find((entry) => entry.id === id)?.details.postal || '');
          setOptions([]);
          setFeedback('');
        }}><option value="">Masukkan alamat baru</option>{addresses.map(({id, details}) => <option key={id} value={id}>{details.name} · {details.district}, {details.city}</option>)}</select></label>}
        <AddressFields key={addressId} value={savedAddress || { name: user?.name, phone: user?.phone }} onRegionChange={(code) => {
          setPostal(code);
          setOptions([]);
          setFeedback('');
        }} />
        <button className="button secondary" type="submit" value="rates" disabled={!postal}>Hitung ongkir</button>
      </section>
      <section className="panel"><h2>Pengiriman</h2>{demo && <p className="muted">Tarif simulasi untuk pengujian lokal.</p>}
        {options.length ? <div className="shipping-options">{options.map((rate, index) => <label key={rate.company + rate.type}>
          <input type="radio" name="courier" checked={index === selected} onChange={() => setSelected(index)} />
          <span>{rate.name}<small>{rate.duration}</small></span><strong>{rupiah(rate.cost)}</strong></label>)}</div>
          : <p>Masukkan alamat untuk melihat layanan kurir.</p>}
      </section>
    </fieldset>
    <fieldset className="panel summary" disabled={busy}><h2>Ringkasan pesanan</h2>
      {items.map((item) => <p className="spread" key={item.id}><span>{item.name} · {item.size} × {item.qty}</span><strong>{rupiah(item.price * item.qty)}</strong></p>)}
      <p className="spread"><span>Subtotal</span><strong>{rupiah(subtotal)}</strong></p>
      <p className="spread"><span>Ongkir</span><strong>{courier ? rupiah(courier.cost) : '—'}</strong></p>
      <div className="rule spread"><b>Total</b><b>{rupiah(subtotal + (courier?.cost || 0))}</b></div>
      <p className="muted">Pilih QRIS, e-wallet, virtual account, atau kartu dari halaman pembayaran Midtrans sesuai metode yang aktif.</p>
      {feedback && <p className="feedback bad" role="alert">{feedback}</p>}
      <button className="button wide" disabled={!courier || busy} type="submit" value="order">{busy ? 'Memproses…' : 'Buat pesanan'}</button>
    </fieldset>
  </form>;
}

export function Payment({ id, demo, providerStatus }) {
  const router = useRouter();
  return <div className="cluster">
    {providerStatus && <p>Status Midtrans: {providerStatus}</p>}
    {demo ? <ActionForm action="payment.demo" transform={() => ({ id })} onSuccess={() => router.refresh()}>
      <button className="button" type="submit">Simulasikan pembayaran berhasil</button>
    </ActionForm> : <ActionForm action="payment" transform={() => ({ id })} onSuccess={({ url }) => { if (url) window.location.assign(url); }}>
      <button className="button" type="submit">Bayar dengan Midtrans</button>
    </ActionForm>}
  </div>;
}

export function Print({ name = 'Cetak invoice' }) {
  return <button className="button secondary no-print" type="button" onClick={() => window.print()}>{name}</button>;
}

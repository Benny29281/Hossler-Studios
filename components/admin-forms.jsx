'use client';

import { ActionForm } from './client.jsx';
import { homeSlides } from '../lib/images.mjs';

const values = (form) => Object.fromEntries(form);

export function ProductForm({ item, groups }) {
  const initial = Object.fromEntries((item?.variants || []).map(({ size, stock }) => [size, stock]));
  return <ActionForm action="admin.product" reset={!item} transform={(form) => {
    const { sizes, images, ...record } = values(form);
    return { ...record, published: form.has('published'), images: images.split('\n').map((url) => url.trim()).filter(Boolean),
      variants: sizes.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
        const [size, stock] = line.split('=');
        return { size: size.trim(), stock: stock?.trim() || 0, previous: initial[size.trim()] };
      }) };
  }}>
    <div className="fields">
      <label>Nama<input name="name" defaultValue={item?.name} required /></label>
      <label>Slug<input name="slug" defaultValue={item?.slug} readOnly={!!item} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
      <label>Harga IDR<input name="price" type="number" min="1" defaultValue={item?.price} required /></label>
      <label>Berat (gram)<input name="weight" type="number" min="1" defaultValue={item?.weight || 250} required /></label>
      <label>Koleksi<select name="collection" defaultValue={item?.collection || ''}><option value="">Tanpa koleksi</option>{groups.map((entry) => <option key={entry.slug} value={entry.slug}>{entry.name}</option>)}</select></label>
      <label>Urutan<input name="position" type="number" min="0" defaultValue={item?.position || 0} required /></label>
      <label className="full">Deskripsi<textarea name="description" defaultValue={item?.description} required rows={3} /></label>
      <label>Bahan dan perawatan<input name="material" defaultValue={item?.material} /></label>
      <label>Deskripsi SEO<input name="seo" defaultValue={item?.seo} /></label>
      <label>Gambar (satu URL HTTPS per baris)<textarea name="images" defaultValue={item?.images.join('\n')} required rows={4} /></label>
      <label>Ukuran dan stok (format S=5 per baris)<textarea name="sizes" defaultValue={item?.variants.map(({size, stock}) => size + '=' + stock).join('\n') || 'S=0\nM=0\nL=0\nXL=0'} required rows={4} /></label>
    </div>
    <label className="checkbox"><input name="published" type="checkbox" defaultChecked={item?.published} />Terbitkan di toko</label>
    <button className="button" type="submit">Simpan produk</button>
  </ActionForm>;
}

export function SettingsForm({ settings }) {
  const [firstSlide, secondSlide] = homeSlides(settings);
  const fields = [
    ['name','Nama toko'], ['homeSlideOne','Foto Home pertama (URL gambar)',firstSlide.src],
    ['homeSlideTwo','Foto Home kedua (URL gambar)',secondSlide.src], ['originName','Nama pengirim'], ['originPhone','Telepon pengirim'],
    ['originAddress','Alamat gudang'], ['originPostal','Kode pos gudang'], ['couriers','Kode kurir Biteship (pisahkan dengan koma)'],
    ['paymentMethods','Metode Snap (kosongkan untuk pengaturan akun Midtrans)'], ['instagram','URL Instagram'],
    ['adminEmail','Email notifikasi admin'], ['emailFooter','Catatan penutup email'],
  ];
  return <ActionForm action="admin.settings"><div className="fields">
    {fields.map(([name, label, initial]) => <label key={name}>{label}{name === 'emailFooter' ?
      <textarea name={name} defaultValue={settings[name]} rows={3} /> :
      <input name={name} defaultValue={initial ?? settings[name]} required={name.startsWith('homeSlide')} />}</label>)}
  </div><button className="button" type="submit">Simpan pengaturan</button></ActionForm>;
}

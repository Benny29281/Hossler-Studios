import Link from 'next/link';
export default function NotFound() {
  return <div className="shell section empty"><h1>Halaman tidak ditemukan</h1><Link className="button" href="/products">Lihat produk</Link></div>;
}

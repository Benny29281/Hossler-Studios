# PRD — Hossler Studios Online Store

> Product Requirements Document (v1.0) — 19 November 2026
> Referensi UI/UX: calledelarache.com (struktur navigasi, alur cart → orders → account)

---

## 1. Ringkasan

**Hossler Studios Store** adalah website e-commerce brand fashion streetwear milik sendiri (direct-to-consumer). Toko menjual produk dengan satu halaman toko yang bersih, minimalis, dan mobile-first, mengikuti pola referensi Calle de Larache: Home, All Products, Categories, Community, About, Cart, Orders, dan Account.

**Produk awal (launch):**

| Atribut | Detail |
|---|---|
| Nama produk | Ace of Hearts Tee (nama sementara) |
| Tipe | Kaos oversized / boxy fit, warna putih |
| Desain | Graphic "Ace of Hearts": bordir patch hati merah di tengah, huruf "A" + chip poker merah di pojok kiri atas dan kanan bawah (terbalik, seperti kartu remi) |
| Harga | **Rp219.000** |
| Mata uang | IDR |

> Asumsi: nama brand diambil dari nama file upload (*Hossler Studios*). Silakan ganti jika berbeda.

---

## 2. Tujuan & Metrik Sukses

### Tujuan
1. Memiliki toko online sendiri yang bisa menerima order, pembayaran, dan pengiriman otomatis.
2. Membangun identitas brand yang kuat lewat tampilan visual yang konsisten.
3. Mudah menambah produk/koleksi baru tanpa coding (admin panel).

### Metrik (90 hari pertama)
| Metrik | Target |
|---|---|
| Conversion rate | ≥ 1,5% |
| Waktu muat halaman (mobile, LCP) | < 2,5 detik |
| Cart abandonment | < 70% |
| Order sukses tanpa error pembayaran | ≥ 98% |
| Repeat customer | ≥ 10% |

---

## 3. Target Pengguna

- **Persona utama:** Pria/wanita usia 17–30, Indonesia, suka streetwear dan graphic tee, belanja lewat HP, terbiasa bayar via e-wallet / QRIS / transfer VA.
- **Persona sekunder:** Pembeli hadiah, kolektor merchandise brand lokal.
- **Pemilik toko (admin):** Mengelola produk, stok, pesanan, dan resi tanpa keahlian teknis.

---

## 4. Ruang Lingkup

### 4.1 In Scope (MVP)
- Storefront publik (Home, Products, Product Detail, Cart, Checkout)
- Akun pelanggan & riwayat pesanan (Orders)
- Pembayaran online (QRIS, e-wallet, VA bank, kartu)
- Ongkos kirim otomatis & pelacakan resi
- Admin dashboard (produk, stok, pesanan, pelanggan)
- Notifikasi email/WhatsApp status pesanan
- SEO dasar & analytics

### 4.2 Out of Scope (fase berikutnya)
- Aplikasi mobile native
- Multi-bahasa & multi-currency (awal: ID & IDR saja)
- Marketplace sync (Shopee/Tokopedia)
- Program loyalti/poin
- Pre-order & flash sale kompleks

---

## 5. Struktur Halaman & Navigasi

Mengikuti referensi: header dengan logo, menu utama, ikon cart & orders, dan selector mata uang.

```
Header: [Logo]  HOME | NEW ARRIVALS | ALL PRODUCTS | COLLECTIONS | COMMUNITY | ABOUT   [Cart] [Orders/Account] [IDR]

/                      → Home
/products              → Semua produk
/collections/[slug]    → Halaman koleksi/kategori
/products/[slug]       → Detail produk
/cart                  → Keranjang
/checkout              → Checkout
/account               → Profil & alamat
/orders                → Riwayat pesanan
/orders/[id]           → Detail & tracking pesanan
/pages/community       → Komunitas (galeri foto pelanggan, IG feed)
/pages/about           → Tentang brand
/pages/size-guide      → Panduan ukuran
/pages/shipping-returns→ Pengiriman & retur
/admin                 → Dashboard admin (terproteksi)
```

---

## 6. Kebutuhan Fungsional

### 6.1 Storefront

**FR-01 Home**
- Hero banner (foto/visual produk) dengan CTA "Shop Now".
- Section New Arrivals & produk unggulan.
- Section komunitas (galeri foto pelanggan).
- Footer: link kebijakan, sosial media, newsletter.

**FR-02 Listing Produk**
- Grid produk responsif (2 kolom mobile, 4 kolom desktop).
- Filter: kategori, ukuran, harga. Sort: terbaru, harga naik/turun.
- Badge "Sold Out" / "New".

**FR-03 Detail Produk**
- Galeri gambar (depan, belakang, detail bordir, foto model) dengan zoom.
- Nama, harga (**Rp219.000**), deskripsi, bahan, detail desain.
- Pilihan ukuran (S, M, L, XL — dapat dikonfigurasi) dengan indikator stok.
- Tombol Add to Cart & tabel ukuran (size guide).
- Produk terkait.

**FR-04 Cart**
- Tambah/ubah jumlah/hapus item; subtotal real-time.
- Cart tersimpan (guest via cookie, user via akun).
- Input kode voucher.

**FR-05 Checkout**
- Guest checkout atau login.
- Form alamat (provinsi → kota → kecamatan → kode pos) dan nomor WhatsApp.
- Pilihan kurir dengan ongkir real-time (JNE, J&T, SiCepat, AnterAja, dll).
- Pilihan metode pembayaran, ringkasan pesanan, konfirmasi.
- Halaman sukses + email/WA konfirmasi.

**FR-06 Akun Pelanggan** (`/account`)
- Registrasi/login (email + password, opsional Google login).
- Kelola profil dan buku alamat.
- Reset password.

**FR-07 Orders** (`/orders`)
- Daftar pesanan dengan status: *Menunggu Pembayaran, Diproses, Dikirim, Selesai, Dibatalkan*.
- Detail pesanan, nomor resi, link lacak, invoice.
- Tombol bayar ulang untuk pesanan yang belum dibayar.

**FR-08 Halaman Konten**
- About, Community, Size Guide, Shipping & Returns, Terms, Privacy — dikelola dari admin.

### 6.2 Pembayaran
- Gateway: **Midtrans** atau **Xendit** (pilih salah satu).
- Metode: QRIS, GoPay, OVO, DANA, ShopeePay, Virtual Account (BCA, BNI, BRI, Mandiri, Permata), kartu kredit/debit.
- Webhook untuk update status pembayaran otomatis.
- Batas waktu pembayaran 24 jam, lalu pesanan otomatis batal dan stok dikembalikan.

### 6.3 Pengiriman
- Integrasi **Biteship** atau **RajaOngkir** untuk ongkir, pembuatan resi, dan tracking.
- Asal pengiriman: alamat gudang/pemilik toko (dapat diatur di admin).
- Estimasi hari pengiriman ditampilkan saat checkout.

### 6.4 Admin Dashboard

| Modul | Fitur |
|---|---|
| Produk | CRUD produk, varian (ukuran), harga, stok, gambar, SEO, status publish |
| Koleksi | Buat/atur koleksi & urutan produk |
| Pesanan | Daftar, filter status, ubah status, cetak label & invoice, input/auto resi |
| Pelanggan | Daftar pelanggan & riwayat belanja |
| Voucher | Diskon persen/nominal, minimum belanja, masa berlaku |
| Konten | Banner Home, halaman statis |
| Laporan | Penjualan harian/bulanan, produk terlaris, stok menipis |
| Pengaturan | Info toko, alamat asal kirim, kurir aktif, metode bayar, template email |

### 6.5 Notifikasi
- Email transaksional: konfirmasi pesanan, pembayaran diterima, pesanan dikirim (+ resi).
- WhatsApp (opsional via Fonnte/Twilio/WA Business API) untuk status yang sama.
- Notifikasi admin saat ada pesanan baru dan stok menipis.

---

## 7. Kebutuhan Non-Fungsional

| Kategori | Persyaratan |
|---|---|
| Performa | LCP < 2,5 dtk di 4G; gambar WebP/AVIF + lazy loading; CDN |
| Responsif | Mobile-first (≥ 80% traffic diperkirakan dari HP) |
| Keamanan | HTTPS, hash password (bcrypt/argon2), proteksi CSRF/XSS, rate limiting, verifikasi signature webhook, data kartu tidak disimpan (ditangani gateway) |
| Privasi | Sesuai UU PDP Indonesia; halaman Privacy Policy dan persetujuan cookie |
| Ketersediaan | Uptime ≥ 99,5% |
| SEO | Meta tag, Open Graph, sitemap.xml, robots.txt, structured data Product |
| Aksesibilitas | Kontras warna memadai, alt text gambar, navigasi keyboard |
| Skalabilitas | Mampu menangani lonjakan trafik saat drop produk (caching + antrean order) |

---

## 8. Desain & Branding

- **Gaya:** Minimalis, putih-hitam dengan aksen **merah** (selaras dengan visual produk Ace of Hearts), tipografi tegas ala streetwear.
- **Layout:** Banyak ruang kosong, foto produk besar, menu horizontal sederhana seperti referensi.
- **Aset yang dibutuhkan:** logo (hitam & putih), foto produk (depan/belakang/detail/model), foto lifestyle, favicon, banner Home.
- **Komponen UI:** Header sticky, mini-cart drawer, toast notifikasi, skeleton loading.

Palet awal (dapat disesuaikan):

| Peran | Warna |
|---|---|
| Background | `#FFFFFF` |
| Teks utama | `#111111` |
| Aksen | `#E00000` |
| Netral | `#363636` / `#F5F5F5` |

---

## 9. Data Produk Awal

```json
{
  "name": "Ace of Hearts Tee",
  "slug": "ace-of-hearts-tee",
  "price": 219000,
  "currency": "IDR",
  "color": "White",
  "fit": "Oversized / Boxy",
  "category": "T-Shirts",
  "variants": [
    { "size": "S",  "stock": 0 },
    { "size": "M",  "stock": 0 },
    { "size": "L",  "stock": 0 },
    { "size": "XL", "stock": 0 }
  ],
  "images": ["back.png", "front.png", "detail-embroidery.png"],
  "description": "Kaos putih boxy fit dengan bordir patch hati merah dan detail chip poker, terinspirasi kartu Ace of Hearts.",
  "details": [
    "Bordir patch hati merah (embroidered)",
    "Print huruf A + chip poker di dua sisi",
    "Bahan: [isi, mis. cotton combed 24s 240gsm]"
  ]
}
```

> Isi stok, bahan, dan ukuran sebenarnya sebelum launch.

---

## 10. Arsitektur & Tech Stack (Rekomendasi)

| Layer | Pilihan |
|---|---|
| Frontend | **Next.js** (React) + Tailwind CSS |
| Backend/API | Next.js API routes / Route Handlers |
| Database | **PostgreSQL** (Supabase / Neon) + Prisma ORM |
| Auth | NextAuth / Supabase Auth |
| Storage gambar | Cloudinary / Supabase Storage / S3 + CDN |
| Pembayaran | Midtrans Snap atau Xendit |
| Ongkir & resi | Biteship atau RajaOngkir |
| Email | Resend / SendGrid |
| Hosting | Vercel (frontend) + managed DB |
| Analytics | Google Analytics 4 + Meta Pixel |
| Monitoring | Sentry |

**Alternatif no-code/low-code:** Shopify, WooCommerce, atau platform lokal (mis. Jubelio, BukaOlshop) bila ingin cepat meluncur tanpa pengembangan custom.

---

## 11. Model Data (Ringkas)

```
users(id, name, email, phone, password_hash, role, created_at)
addresses(id, user_id, recipient, phone, province, city, district, postal_code, detail, is_default)
products(id, name, slug, description, price, status, category_id, created_at)
product_variants(id, product_id, size, sku, stock)
product_images(id, product_id, url, position)
categories(id, name, slug)
carts(id, user_id/session_id) + cart_items(id, cart_id, variant_id, qty)
orders(id, order_no, user_id, status, subtotal, shipping_cost, discount, total, payment_status, courier, tracking_no, address_snapshot, created_at)
order_items(id, order_id, variant_id, name_snapshot, price_snapshot, qty)
payments(id, order_id, gateway, method, status, transaction_id, paid_at)
vouchers(id, code, type, value, min_purchase, quota, starts_at, ends_at)
pages(id, slug, title, content)
```

---

## 12. Alur Utama (User Flow)

1. **Pembelian:** Home → Product → pilih ukuran → Add to Cart → Cart → Checkout (alamat → kurir → bayar) → Pembayaran → Konfirmasi → Orders.
2. **Pembayaran gagal/kedaluwarsa:** Order status *Menunggu Pembayaran* → bayar ulang dari `/orders` atau otomatis batal setelah 24 jam, stok dikembalikan.
3. **Fulfilment (admin):** Notifikasi order baru → cek pembayaran → packing → cetak label/resi → ubah status *Dikirim* → pelanggan menerima nomor resi.

---

## 13. Rencana Rilis (Roadmap)

| Fase | Durasi | Cakupan |
|---|---|---|
| **0. Persiapan** | Minggu 1 | Finalisasi brand, foto produk, domain, akun payment gateway & kurir |
| **1. Desain** | Minggu 2 | Wireframe & UI (mobile + desktop) |
| **2. Core build** | Minggu 3–5 | Storefront, cart, checkout, auth, database |
| **3. Integrasi** | Minggu 6 | Pembayaran, ongkir, email/WA, webhook |
| **4. Admin** | Minggu 6–7 | Dashboard produk, pesanan, laporan |
| **5. QA & UAT** | Minggu 8 | Testing end-to-end, uji pembayaran sandbox, perbaikan bug |
| **6. Launch** | Minggu 9 | Go-live, monitoring, kampanye peluncuran |
| **7. Iterasi** | Setelah launch | Voucher, abandoned cart, review produk, koleksi baru |

---

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Stok habis saat banyak order bersamaan (overselling) | Order dibatalkan, pelanggan kecewa | Reservasi stok saat checkout, transaksi database atomik |
| Webhook pembayaran gagal | Status order tidak sinkron | Retry + rekonsiliasi berkala dengan API gateway |
| Ongkir tidak akurat | Margin terkikis | Validasi berat produk, markup kecil jika perlu |
| Foto produk kurang berkualitas | Konversi rendah | Alokasikan sesi foto profesional sebelum launch |
| Trafik lonjakan saat drop | Website lambat/down | CDN, caching, load test |
| Hanya 1 produk di awal | Toko terlihat kosong | Tambah halaman brand story, komunitas, dan rencana koleksi berikutnya |

---

## 15. Acceptance Criteria MVP

- [ ] Pelanggan dapat melihat produk, memilih ukuran, dan menambahkan ke cart.
- [ ] Checkout berhasil dengan alamat valid dan ongkir real-time.
- [ ] Pembayaran via QRIS, e-wallet, dan VA berjalan di production; status order terupdate otomatis.
- [ ] Stok berkurang setelah pembayaran dan kembali jika order kedaluwarsa/batal.
- [ ] Pelanggan dapat melihat riwayat pesanan dan nomor resi di `/orders`.
- [ ] Admin dapat menambah/edit produk, mengelola stok, dan memproses pesanan.
- [ ] Email konfirmasi terkirim untuk pesanan baru dan pesanan dikirim.
- [ ] Situs lolos uji responsif (iOS Safari, Android Chrome, desktop) dan LCP < 2,5 dtk.
- [ ] Halaman legal (Terms, Privacy, Shipping & Returns) tersedia.

---

## 16. Pertanyaan Terbuka

1. Nama brand/domain final? (Hossler Studios / lainnya)
2. Bahan, gramasi, dan ukuran yang tersedia + stok awal?
3. Payment gateway pilihan: Midtrans atau Xendit?
4. Kurir mana yang ingin diaktifkan, dan apakah ada gratis ongkir?
5. Apakah ingin dibangun custom (Next.js) atau pakai platform siap pakai (Shopify/WooCommerce)?
6. Apakah akan ada koleksi/produk lain dalam 3 bulan ke depan?

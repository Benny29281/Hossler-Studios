# Hossler Studios Store

Toko streetwear berbahasa Indonesia berdasarkan [PRD](./prd%20%288%29.md). Dibangun dengan Next.js App Router, React, dan PostgreSQL. Pengembangan lokal memakai PostgreSQL tertanam melalui PGlite sehingga bisa dimulai tanpa menyalakan service database atau Laragon.

## Menjalankan di Windows

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Buka `http://localhost:3000`. Ace of Hearts Tee seharga Rp219.000 mendapat stok demo 10 per ukuran (S, M, L, dan XL) saat penyiapan PGlite lokal. Stok ini diberikan sekali dan pengaturan stok produksi dilakukan melalui admin.

Untuk membuat akun admin, isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` (minimal 12 karakter) di `.env.local`. Jalankan `npm.cmd run db:init` sebelum menyalakan server, lalu masuk melalui `/account` dan buka `/admin`. Perintah inisialisasi dapat dijalankan ulang dan mempertahankan data yang sudah ada. Simpan file konfigurasi lokal di luar version control.

Untuk mencoba transaksi, pilih ukuran produk dan tambah ke keranjang dari etalase. Checkout lokal menggunakan tarif simulasi dan tombol **Simulasikan pembayaran berhasil** saat kunci penyedia kosong. Admin bisa mengubah stok, memasukkan resi uji, dan menandai pesanan selesai. Database pengembangan berada di `.data/store`.

## Konfigurasi peluncuran

1. Isi `DATABASE_URL` dengan PostgreSQL terkelola. Jalankan `npm.cmd run db:init` dengan URL database target untuk menerapkan skema dan membuat akun admin. Gunakan HTTPS dan isi `APP_URL` dengan domain publik.
2. Masukkan kunci **Midtrans Snap**. Atur URL notifikasi ke `https://domain-toko/api/midtrans` dan aktifkan metode yang disetujui Midtrans. Aplikasi memeriksa signature dan mengonfirmasi status melalui API Midtrans sebelum menandai pembayaran berhasil. Uji dengan kunci sandbox terlebih dahulu. [Panduan Snap](https://docs.midtrans.com/docs/snap-snap-integration-guide)
3. Masukkan kunci **Biteship**. Isi data gudang dan kurir aktif di **Pengaturan**. Uji pilihan wilayah, ongkir, booking, dan penerbitan resi sebelum mengganti kunci ke live. Dropdown alamat memakai [snapshot wilayah dan kode pos lokal](./lib/regions-LICENSE.txt). Resi dapat diisi manual atau disinkronkan melalui tombol Biteship di dashboard. [Referensi Biteship](https://biteship.com/en/docs/intro)
4. Verifikasi domain pengirim **Resend**, lalu isi `RESEND_API_KEY`, `MAIL_FROM`, dan email admin di **Pengaturan**. Jalankan scheduler setiap beberapa menit untuk memanggil `GET /api/jobs` dengan `Authorization: Bearer <CRON_SECRET>`. Job tersebut mengantrekan ulang email yang tertunda, memeriksa status pembayaran, dan melepas reservasi saat pesanan kedaluwarsa. [API email Resend](https://resend.com/docs/api-reference/emails/send-email)
5. Isi bahan, berat, stok, dan ukuran aktual, lalu finalisasi halaman legal di **Konten**. Galeri pelanggan dan tautan Instagram menunggu materi komunitas serta akun resmi. Pengaturan analitik opsional tersedia melalui ID GA4 dan Meta Pixel.
6. Jalankan `npm.cmd run build` untuk verifikasi build. Uji pembayaran dan pengiriman sandbox, email, Safari iOS, Chrome Android, dan target LCP di 4G sebelum mengaktifkan indeks mesin pencari dengan `INDEX_STORE=1`.

Pembeli tamu dapat membuka riwayat dan detail pesanan dari browser tempat checkout. Jika mendaftar atau masuk dengan email yang sama pada browser tersebut, pesanannya muncul di akun. WhatsApp dan Google login adalah opsi lanjutan dalam PRD.

## Visual produk

Gambar utama `public/images/ace-of-hearts.webp` dan potongan detail `public/images/ace-of-hearts-detail.webp` berasal dari PDF desain yang diberikan untuk Ace of Hearts Tee. Jalankan `npm.cmd run db:init` untuk memperbarui referensi gambar bawaan pada basis data lama.

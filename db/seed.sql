INSERT INTO collections VALUES ('t-shirts','T-Shirts') ON CONFLICT DO NOTHING;
INSERT INTO products(slug,name,description,price,weight,images,collection,published,seo)
VALUES ('ace-of-hearts-tee','Poker Tees''26','Kaos putih dengan siluet oversized / boxy. Patch hati merah di tengah dan aksen A dengan chip poker di dua sudut terinspirasi kartu Ace of Hearts.',219000,250,'["/images/ace-of-hearts.webp","/images/ace-of-hearts-detail.webp"]','t-shirts',true,'Poker Tees''26 dari Hossler Studios. Kaos putih boxy fit dengan patch hati merah.') ON CONFLICT DO NOTHING;
UPDATE products SET name='Poker Tees''26',seo=replace(seo,'Ace of Hearts Tee','Poker Tees''26')
WHERE slug='ace-of-hearts-tee' AND name='Ace of Hearts Tee';
UPDATE products SET images='["/images/ace-of-hearts.webp","/images/ace-of-hearts-detail.webp"]'
WHERE slug='ace-of-hearts-tee'
  AND images='["/images/front.webp","/images/back.webp","/images/detail.webp","/images/model.webp"]'::jsonb;
INSERT INTO variants(product_slug,size,stock) VALUES ('ace-of-hearts-tee','S',0),('ace-of-hearts-tee','M',0),('ace-of-hearts-tee','L',0),('ace-of-hearts-tee','XL',0) ON CONFLICT DO NOTHING;
INSERT INTO pages VALUES
 ('about','About Hossler Studios','Hossler Studios adalah brand streetwear independen. Drop pertama kami berangkat dari satu kartu: Ace of Hearts. Siluet boxy, warna putih, dan satu aksen merah.'),
 ('community','Our Journey','Ruang untuk orang-orang yang memakai Hossler dengan caranya sendiri. Galeri pelanggan akan hadir setelah drop pertama.'),
 ('size-guide','Panduan Ukuran','Poker Tees''26 memiliki siluet oversized / boxy dan pilihan S, M, L, serta XL. Ukuran lebar dada dan panjang badan akan dicantumkan setelah pengukuran sampel produksi.'),
 ('shipping-returns','Pengiriman & Retur','Ongkos dan estimasi pengiriman tampil sebelum pembayaran. Nomor resi tersedia di detail pesanan setelah paket dikirim. Ketentuan dan kontak retur akan dipublikasikan setelah kebijakan resmi ditetapkan.'),
 ('terms','Syarat & Ketentuan','Harga ditampilkan dalam rupiah. Ketersediaan barang dikonfirmasi saat checkout. Pesanan menunggu pembayaran hingga 24 jam. Ketentuan lengkap akan dipublikasikan sebelum toko menerima pembayaran produksi.'),
 ('privacy','Kebijakan Privasi','Data akun dan alamat dipakai untuk mengelola pesanan dan pengiriman. Pembayaran diproses melalui penyedia pembayaran. Cookie sesi membantu menyimpan keranjang dan akses akun. Kebijakan lengkap dan kontak privasi akan dipublikasikan sebelum peluncuran.')
 ON CONFLICT DO NOTHING;
UPDATE pages SET content=replace(content,'Ace of Hearts Tee','Poker Tees''26')
WHERE slug='size-guide' AND content LIKE '%Ace of Hearts Tee%';
INSERT INTO settings VALUES ('store','{"name":"Hossler Studios","heroTitle":"Poker\nTees''26","heroImage":"/images/ace-of-hearts.webp","heroDescription":"Kaos boxy putih dengan detail bordir hati merah.","originName":"","originPhone":"","originAddress":"","originPostal":"","couriers":"jne,jnt,sicepat,anteraja","instagram":"","adminEmail":"","paymentMethods":"","emailFooter":""}') ON CONFLICT DO NOTHING;
UPDATE settings SET value=jsonb_set(value,'{heroTitle}',to_jsonb(E'Poker\nTees''26'::text))
WHERE key='store' AND btrim(regexp_replace(value->>'heroTitle','[[:space:]]+',' ','g')) ~* '^aces? of hearts( tee)?[.!]?$';
UPDATE settings SET value=jsonb_set(value,'{heroImage}','"/images/ace-of-hearts.webp"'::jsonb)
WHERE key='store' AND value->>'heroImage'='/images/model.webp';

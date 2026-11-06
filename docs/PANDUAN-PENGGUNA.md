# Panduan Pengguna Lumen Invest

Dokumen ini dibuat otomatis dari halaman Bantuan di aplikasi. Untuk mengubah isinya, edit `lib/help/content.ts`, lalu jalankan `npm run docs`.

## Daftar isi

- [Mulai di sini](#mulai-di-sini)
- [Dashboard dan portofolio](#dashboard-dan-portofolio)
- [Jurnal dan kalender](#jurnal-dan-kalender)
- [Riset Pasar (Premium)](#riset-pasar-premium)
- [Masalah umum](#masalah-umum)
- [Istilah](#istilah)
- [Keamanan dan batasan](#keamanan-dan-batasan)
- [Referensi dan dokumentasi](#referensi-dan-dokumentasi)
- [Hubungi kami](#hubungi-kami)

## Mulai di sini

Kenalan dengan Lumen Invest dan cara membaca menunya.

### Apa itu Lumen Invest?

_Gambaran singkat fungsi aplikasi._

Lumen Invest membantu kamu mencatat transaksi saham, crypto, dan meme coin, melihat hasil portofoliomu, memantau pasar, dan membaca riset dalam satu tempat.

Lumen adalah alat bantu, bukan penasihat investasi. Setiap keputusan membeli atau menjual tetap menjadi tanggung jawabmu.

### Cara membaca menu dan tanda PRO

_Arti pengelompokan menu dan lencana PRO._

Menu di sisi kiri dikelompokkan menjadi tiga bagian:

* Aset Saya berisi Dashboard, Portofolio, Jurnal, dan Kalender.
* Riset Pasar berisi Analisis, Futures, Pasar, dan Berita.
* Pengelola hanya tampil untuk admin.

Menu yang bertanda PRO hanya bisa dibuka dengan paket Premium. Kalau kamu klik menu itu dengan paket Free, kamu akan diarahkan ke halaman Upgrade.

> Catatan penting: Di layar kecil, menu bisa diciutkan. Ikon gembok tetap terlihat supaya kamu tahu menu mana yang terkunci.

### Bedanya paket Free dan Premium

_Apa saja yang didapat di tiap paket._

Paket Free sudah mencakup Dashboard, Portofolio, dan Jurnal dengan batas tertentu. Paket Premium membuka seluruh Riset Pasar dan fitur analisis.

* Free: jurnal sampai 30 transaksi, kalender PnL 3 bulan terakhir, watchlist 3 saham, grafik 1D, 1W, dan 1M.
* Premium: jurnal tanpa batas, kalender tanpa batas, watchlist 5 saham, grafik 6M dan 1Y, Riset Pasar lengkap (Analisis, Futures, Pasar, Berita), analitik jurnal, deteksi overtrading dan pola transaksi, serta ekspor CSV.

Perbandingan lengkapnya ada di halaman Upgrade. Kalau ingin pindah ke Premium, hubungi tim kami lewat email di bagian Hubungi kami.

### Akun dan keamanan

_Cara menjaga akunmu tetap aman dan cara keluar._

1. Masuk lewat halaman login dengan akunmu.
2. Untuk keluar, tekan ikon panah keluar di pojok kanan atas.
3. Pada komputer bersama, selalu keluar setelah selesai.

> Catatan penting: Jangan bagikan akun atau kata sandimu ke siapa pun, termasuk orang yang mengaku dari tim Lumen. Kalau ragu, hubungi tim lewat email resmi di bagian Hubungi kami.

## Dashboard dan portofolio

Ringkasan akunmu dan posisi yang sedang kamu pegang.

### Membaca Dashboard

_Isi halaman ringkasan dan watchlist._

Dashboard adalah halaman pertama setelah masuk. Di sana kamu melihat ringkasan nilai portofolio, grafik performa, dan watchlist saham yang kamu pantau.

Rentang grafik bisa kamu ganti. Paket Free melihat 1D, 1W, dan 1M. Paket Premium juga bisa melihat 6M dan 1Y.

Watchlist dibatasi sesuai paket: 3 saham untuk Free dan 5 saham untuk Premium.

### Portofolio: posisi dan alokasi

_Posisi dari jurnal, dinilai dengan harga terkini._

Portofolio menampilkan posisi yang kamu punya. Semua datanya berasal dari jurnal, lalu dinilai dengan harga pasar terkini.

Bagian alokasi menunjukkan seberapa besar porsi tiap jenis aset: saham IDX, saham US, crypto, dan meme coin.

> Catatan penting: Kalau posisi di portofolio tidak sesuai, periksa lagi transaksi di Jurnal. Portofolio tidak bisa diedit langsung dari sini.

## Jurnal dan kalender

Mencatat transaksi dengan benar supaya portofolio dan kalender akurat.

### Cara mencatat transaksi

_Langkah lengkap menambah transaksi baru._

1. Buka menu Jurnal, lalu pilih jenis aset: Saham IDX, Saham US, Crypto, atau Meme coin.
2. Ketik kode aset. Pilih hasilnya dari daftar yang muncul supaya nama dan harganya terisi otomatis.
3. Pilih harga Live untuk mengambil harga terkini, atau Manual untuk mengisi harga sendiri.
4. Isi jumlah, tanggal, dan jenis transaksi (beli atau jual).
5. Tekan simpan. Transaksi langsung masuk ke portofolio dan kalender.

> Catatan penting: Paket Free bisa mencatat sampai 30 transaksi. Paket Premium tanpa batas.

### Mencatat meme coin

_Cara mencari meme coin dengan nama atau alamat kontrak._

Untuk meme coin, kamu bisa mengetik nama token atau alamat kontraknya. Hasil pencarian diambil dari DexScreener dan menampilkan chain serta alamat kontrak token itu.

1. Pilih jenis aset Meme coin di Jurnal.
2. Ketik nama token, misalnya PEPE, atau tempel alamat kontraknya.
3. Pilih token yang benar dari daftar. Chain dan alamat kontrak akan terisi otomatis.
4. Harga Live hanya bisa diambil kalau chain dan alamat kontrak sudah terisi.

> Catatan penting: Satu nama token bisa dipakai banyak token berbeda, dan sebagian dibuat untuk menipu. Selalu cocokkan alamat kontrak dengan sumber yang kamu percaya sebelum membeli.

### Harga Live atau Manual

_Kapan pakai harga otomatis dan kapan mengisi sendiri._

Harga Live mengambil harga terkini dari sumber pasar. Cocok untuk transaksi yang baru terjadi.

Harga Manual cocok untuk transaksi lama, atau kalau harga live tidak tersedia. Kamu bebas mengisi harga yang sebenarnya kamu dapat.

> Catatan penting: Kalau harga live tidak muncul, cek dulu koneksi dan pastikan kode aset atau alamat kontraknya benar. Kalau masih gagal, pakai Manual.

### Mengganti kode aset yang sudah dipilih

_Kenapa alamat kontrak ikut kosong saat kode diubah._

Kalau kamu mengubah kode aset setelah memilih sesuatu, alamat kontrak meme coin dikosongkan. Itu disengaja, supaya tidak ada alamat dari token lain yang terbawa.

Pilih lagi token yang benar dari daftar hasil pencarian.

### Kalender untung rugi

_Membaca untung rugi terealisasi per hari._

Kalender menunjukkan untung rugi terealisasi per hari, yaitu hasil dari posisi yang sudah kamu tutup. Posisi yang masih terbuka tidak dihitung di sini.

Paket Free melihat riwayat 3 bulan terakhir. Paket Premium melihat semua riwayat.

### Analitik jurnal dan pola transaksi

_Fitur Premium untuk membaca kebiasaan trading kamu._

Analitik jurnal (khusus Premium) membaca riwayat transaksimu untuk melihat kebiasaan, misalnya transaksi yang terlalu sering dalam satu hari atau pola yang berulang.

Fitur ini untuk refleksi, bukan saran. Pola di masa lalu tidak menjamin hasil di masa depan.

## Riset Pasar (Premium)

Pasar, berita, analisis, dan futures. Bagian ini khusus Premium.

### Halaman Pasar

_Daftar saham, crypto, dan meme coin yang sedang ramai._

Pasar dibagi menjadi empat tab: Saham IDX, Saham US, Crypto, dan Meme coin. Setiap tab punya daftar sendiri.

* Sering dilihat untuk saham dan crypto. Sumbernya Pluang dan CoinMarketCap.
* Naik dan Turun untuk melihat yang bergerak paling kuat.
* Sering diboost untuk meme coin. Sumbernya DexScreener.

Data pasar untuk paket Premium diperbarui paling lama setiap 5 menit.

> Catatan penting: Daftar di Pasar menunjukkan apa yang ramai, bukan apa yang layak dibeli. Cek sendiri sebelum mengambil keputusan.

### Halaman Berita dan narasi

_Cara membaca berita dan kelompok narasinya._

Berita mengumpulkan artikel dari Google News dan beberapa media, lalu mengelompokkannya menurut narasi. Judul dan sumber selalu tampil, supaya kamu bisa membuka artikel aslinya.

1. Pilih pasar di bagian atas: Saham IDX, Saham US, atau Crypto.
2. Lihat Narasi utama. Setiap kartu menunjukkan kelompok topik yang paling banyak muncul.
3. Tekan jumlah berita di kartu, atau pilih kategori di bawah, untuk melihat berita dalam satu narasi.
4. Tekan judul untuk membuka artikel di situs media aslinya.

Berita diperbarui sekitar setiap 15 menit. Kalau sumber sedang tidak bisa dijangkau, halaman menampilkan pesan dan kamu bisa mencoba lagi nanti.

> Catatan penting: Berita menjelaskan apa yang sedang terjadi, tetapi tidak selalu menjelaskan dampaknya ke harga. Baca dari beberapa sumber sebelum menyimpulkan.

### Kalender ekonomi dan dampak kripto

_Rilis data ekonomi AS, perkiraan, dan dampaknya ke kripto dan saham._

Kalender ekonomi menampilkan rilis data ekonomi AS, seperti inflasi, tenaga kerja, dan keputusan suku bunga, lengkap dengan waktu rilis dalam WIB.

1. Buka menu Kalender, lalu pilih tab Kalender ekonomi.
2. Pilih filter Berdampak tinggi, Dampak kripto, atau Dampak saham.
3. Baca kartu rilis: Actual adalah angka yang sudah keluar, dan Perkiraan adalah ekspektasi pasar.
4. Baca bagian arah untuk kripto. Arah ini dihitung dari selisih Actual dan Perkiraan.

> Catatan penting: Arah dampak adalah heuristik, bukan prediksi. Pasar bisa bereaksi berbeda dari arah itu, terutama kalau rilisnya sudah diperkirakan sebelumnya.

### Halaman Analisis

_Risiko, kinerja, dan alokasi portofolio._

Analisis membantu kamu melihat risiko dan kinerja portofoliomu lebih dalam: alokasi per jenis aset, kontributor untung rugi, dan sebaran risiko.

Analisis dihitung dari transaksi yang sudah kamu catat. Semakin lengkap jurnalmu, semakin akurat hasilnya.

### Futures Sentiment: cara membaca kartu

_Arti LONG, SHORT, dan Netral, serta isi tiap kartu koin._

Futures Sentiment memantau sentimen pasar futures untuk beberapa koin. Setiap koin tampil sebagai kartu berisi arah sinyal, tingkat keyakinan, dan alasannya.

* LONG berarti tekanan beli lebih dominan dibanding tekanan jual.
* SHORT berarti tekanan jual lebih dominan.
* NETRAL berarti sinyal belum searah. Tidak masuk posisi juga keputusan yang sah.
* Keyakinan menunjukkan seberapa kuat sinyalnya. Makin tinggi, makin banyak indikator yang sepakat.

Di dalam kartu ada dua bagian. Konfluensi teknikal harian membaca tren, momentum, dan volume. Screening derivatif membaca open interest, funding rate, dan long short ratio dari pasar futures.

1. Tekan Cari koin untuk menambah koin. Maksimal 6 koin, dan Binance Spot dipakai sebagai sumber utama.
2. Pilih ukuran kartu Besar, Sedang, atau Kecil. Makin banyak koin, kartu makin kecil otomatis.
3. Tekan Tampilkan chart untuk melihat grafik TradingView di tiap kartu. Matikan kalau terasa berat.
4. Tekan Lihat detail analisis di kartu untuk melihat rincian indikatornya.
5. Tekan Perbarui untuk mengambil data terbaru. Tombol ini bisa dipakai lagi setelah 10 detik.

> Catatan penting: Futures Sentiment adalah alat screening, bukan ajakan membeli atau menjual. Selalu tentukan batas kerugian sebelum masuk posisi.

## Masalah umum

Solusi untuk masalah yang paling sering muncul.

### Harga tidak muncul di jurnal

_Langkah cek kalau harga live tidak terisi._

1. Cek koneksi internetmu, lalu coba lagi.
2. Untuk meme coin, pastikan chain dan alamat kontrak sudah terisi. Pilih ulang token dari daftar.
3. Kalau masih gagal, pilih Manual dan isi harganya sendiri.

### Chart TradingView tidak tampil

_Penyebab umum chart kosong atau loading terus._

1. Matikan pemblokir iklan untuk situs ini, lalu muat ulang halaman.
2. Cek koneksi internetmu.
3. Kalau tetap tidak tampil, tekan Buka di TradingView untuk melihat grafik di situs TradingView.

### Futures belum bisa mengambil data

_Muncul pesan perangkat belum bisa menjangkau Binance._

Pesan ini biasanya muncul kalau jaringanmu memblokir akses ke Binance, misalnya jaringan kantor atau kampus, atau kalau kamu memakai VPN tertentu.

1. Matikan VPN, atau coba jaringan lain seperti data seluler.
2. Tunggu beberapa saat. Data akan dicoba lagi otomatis setiap menit.

### Berita belum bisa dimuat

_Apa yang dilakukan kalau halaman Berita menampilkan pesan gagal._

Berita bergantung pada beberapa sumber di luar Lumen. Kalau semuanya sedang tidak bisa dijangkau, halaman menampilkan pesan. Coba beberapa menit lagi.

Kalau hanya sebagian sumber yang bermasalah, halaman tetap menampilkan berita dari sumber yang berhasil. Angka sumber terbaca di atas daftar membantu kamu memastikan.

### Menu bertanda PRO tidak bisa dibuka

_Kenapa menu terkunci dan apa yang harus dilakukan._

Menu bertanda PRO hanya tersedia untuk paket Premium. Kalau kamu sudah membayar tetapi menu masih terkunci, hubungi tim kami lewat email dengan menyertakan email akunmu.

### Tombol Perbarui tidak bisa ditekan

_Tombol diberi jeda beberapa detik supaya tidak membebani sumber data._

Tombol Perbarui di Futures Sentiment diberi jeda 10 detik setelah dipakai. Tunggu hitungan mundurnya habis, lalu tekan lagi.

### Watchlist sudah penuh

_Batas watchlist per paket dan cara menambah ruang._

Watchlist dibatasi 3 saham untuk Free dan 5 saham untuk Premium. Kalau penuh, hapus satu saham yang tidak lagi kamu pantau, atau pertimbangkan paket Premium.

## Istilah

Arti istilah yang sering muncul di aplikasi.

### Istilah futures

_Long, short, funding rate, open interest, dan istilah turunannya._

* Long: posisi yang untung kalau harga naik.
* Short: posisi yang untung kalau harga turun.
* Spot: transaksi jual beli aset langsung, bukan kontrak.
* Futures: kontrak untuk membeli atau menjual aset di kemudian hari dengan harga yang disepakati sekarang.
* Funding rate: biaya berkala antara pemegang long dan short di pasar futures. Kalau positif, long membayar short.
* Open interest: total kontrak futures yang masih terbuka.
* Long short ratio: perbandingan jumlah posisi long dan short.

### Istilah indikator teknikal

_Arti EMA, MACD, RSI, dan indikator lain di kartu Futures._

* EMA 21: rata-rata harga eksponensial 21 periode. Dipakai untuk melihat arah tren.
* MACD: selisih dua rata-rata bergerak, dipakai untuk melihat momentum dan perubahan tren.
* ADX: kekuatan tren. Angka tinggi berarti tren kuat, tetapi tidak menunjukkan arahnya.
* RSI: indeks kekuatan relatif dengan skala 0 sampai 100. Di atas 70 sering dianggap jenuh beli, di bawah 30 jenuh jual.
* Stochastic: posisi harga terhadap rentang harga terakhir.
* Williams %R: mirip stochastic dengan skala -100 sampai 0.
* OBV: volume kumulatif. Naik berarti volume lebih banyak di sisi beli.
* CMF: aliran uang berdasarkan volume. Positif berarti tekanan beli.
* POC: Point of Control, harga yang paling banyak diperdagangkan dalam periode tertentu.

### Istilah jurnal dan meme coin

_PnL, overtrading, chain, dan alamat kontrak._

* PnL terealisasi: untung atau rugi dari posisi yang sudah ditutup.
* Overtrading: transaksi yang berlebihan dibanding kebiasaanmu sendiri.
* Chain: jaringan blockchain tempat sebuah token berada, misalnya Solana, Ethereum, Base, atau BSC.
* Alamat kontrak: identitas unik sebuah token di dalam satu chain. Nama yang sama bisa punya alamat yang berbeda.
* Meme coin: token yang nilainya banyak digerakkan oleh perhatian dan tren, bukan oleh fundamental proyek.

### Istilah berita dan narasi

_Arti kelompok narasi yang dipakai di halaman Berita._

* Akuisisi dan merger: satu perusahaan membeli atau bergabung dengan perusahaan lain.
* Aliran dana asing: net buy atau net sell, yaitu selisih pembelian dan penjualan oleh investor asing dalam satu periode.
* IPO: penawaran saham perdana ke publik, saat sebuah perusahaan pertama kali dicatatkan di bursa.
* Dividen dan buyback: pembagian laba kepada pemegang saham, dan pembelian kembali saham oleh perusahaan sendiri.
* Suku bunga dan inflasi: kebijakan bank sentral dan kenaikan harga umum, yang sering memengaruhi pasar.
* Geopolitik dan perang: konflik atau kebijakan antarnegara seperti sanksi dan tarif, yang bisa menggerakkan pasar.

## Keamanan dan batasan

Hal-hal yang perlu kamu tahu tentang data dan keputusan investasi.

### Lumen bukan penasihat investasi

_Batasan fungsi Lumen dan tanggung jawab keputusanmu._

Semua sinyal, skor, dan berita di Lumen adalah alat bantu untuk membaca pasar. Bukan ajakan membeli atau menjual, dan bukan jaminan hasil.

Sebelum mengambil keputusan, pertimbangkan kondisi keuanganmu, tujuanmu, dan risiko yang bisa kamu tanggung.

### Dari mana datanya berasal

_Sumber data pasar, derivatif, dan berita._

* Saham IDX dan US: Pluang.
* Crypto: CoinMarketCap dan Binance.
* Meme coin: DexScreener.
* Futures Sentiment: Binance Spot dan Binance Futures.
* Berita: Google News dan feed beberapa media.
* Chart: TradingView.

Data dari pihak ketiga bisa tertunda, berubah format, atau sementara tidak tersedia. Kalau ada yang tidak sesuai dengan sumber aslinya, percayai sumber aslinya.

## Referensi dan dokumentasi

* [Dokumentasi API DexScreener](https://docs.dexscreener.com/api/reference): Sumber data harga dan pencarian meme coin.
* [OWASP: Cross Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html): Panduan pengamanan tampilan dan tautan.
* [OWASP: Server Side Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html): Panduan pengamanan pengambilan data dari server.
* [Google News](https://news.google.com): Sumber berita di halaman Berita.
* [TradingView](https://www.tradingview.com): Chart yang tampil di Futures Sentiment.

## Hubungi kami

Email: support@lumen.example

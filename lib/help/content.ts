/**
 * Isi pusat bantuan. Satu sumber untuk halaman Bantuan di aplikasi dan dokumen docs/PANDUAN-PENGGUNA.md.
 * Ubah teks di sini, lalu jalankan `npm run docs` untuk memperbarui dokumen.
 * Format tiap bagian: "p" paragraf, "steps" langkah berurutan, "list" daftar, "tip" catatan penting.
 */

export type Block =
  | { t: "p"; text: string }
  | { t: "steps"; items: string[] }
  | { t: "list"; items: string[] }
  | { t: "tip"; text: string };

export type Article = {
  id: string;
  title: string;
  summary: string;
  /** Kata lain yang dipakai orang saat mencari, supaya pencarian menemukan artikel ini. */
  keywords: string;
  blocks: Block[];
};

export type Category = { id: string; title: string; intro: string; articles: Article[] };

export const HELP_CATEGORIES: Category[] = [
  {
    id: "mulai",
    title: "Mulai di sini",
    intro: "Kenalan dengan Lumen Invest dan cara membaca menunya.",
    articles: [
      {
        id: "apa-itu-lumen",
        title: "Apa itu Lumen Invest?",
        summary: "Gambaran singkat fungsi aplikasi.",
        keywords: "tentang aplikasi lumen invest fungsi",
        blocks: [
          { t: "p", text: "Lumen Invest membantu kamu mencatat transaksi saham, crypto, dan meme coin, melihat hasil portofoliomu, memantau pasar, dan membaca riset dalam satu tempat." },
          { t: "p", text: "Lumen adalah alat bantu, bukan penasihat investasi. Setiap keputusan membeli atau menjual tetap menjadi tanggung jawabmu." },
        ],
      },
      {
        id: "membaca-menu",
        title: "Cara membaca menu dan tanda PRO",
        summary: "Arti pengelompokan menu dan lencana PRO.",
        keywords: "menu sidebar navigasi pro kunci terkunci",
        blocks: [
          { t: "p", text: "Menu di sisi kiri dikelompokkan menjadi tiga bagian:" },
          { t: "list", items: [
            "Aset Saya berisi Dashboard, Portofolio, Jurnal, dan Kalender.",
            "Riset Pasar berisi Analisis, Futures, Pasar, dan Berita.",
            "Pengelola hanya tampil untuk admin.",
          ] },
          { t: "p", text: "Menu yang bertanda PRO hanya bisa dibuka dengan paket Premium. Kalau kamu klik menu itu dengan paket Free, kamu akan diarahkan ke halaman Upgrade." },
          { t: "tip", text: "Di layar kecil, menu bisa diciutkan. Ikon gembok tetap terlihat supaya kamu tahu menu mana yang terkunci." },
        ],
      },
      {
        id: "paket",
        title: "Bedanya paket Free dan Premium",
        summary: "Apa saja yang didapat di tiap paket.",
        keywords: "free premium paket harga upgrade batas limit",
        blocks: [
          { t: "p", text: "Paket Free sudah mencakup Dashboard, Portofolio, dan Jurnal dengan batas tertentu. Paket Premium membuka seluruh Riset Pasar dan fitur analisis." },
          { t: "list", items: [
            "Free: jurnal sampai 30 transaksi, kalender PnL 3 bulan terakhir, watchlist 3 saham, grafik 1D, 1W, dan 1M.",
            "Premium: jurnal tanpa batas, kalender tanpa batas, watchlist 5 saham, grafik 6M dan 1Y, Riset Pasar lengkap (Analisis, Futures, Pasar, Berita), analitik jurnal, deteksi overtrading dan pola transaksi, serta ekspor CSV.",
          ] },
          { t: "p", text: "Perbandingan lengkapnya ada di halaman Upgrade. Kalau ingin pindah ke Premium, hubungi tim kami lewat email di bagian Hubungi kami." },
        ],
      },
      {
        id: "akun-keamanan",
        title: "Akun dan keamanan",
        summary: "Cara menjaga akunmu tetap aman dan cara keluar.",
        keywords: "login masuk keluar logout password kata sandi akun aman",
        blocks: [
          { t: "steps", items: [
            "Masuk lewat halaman login dengan akunmu.",
            "Untuk keluar, tekan ikon panah keluar di pojok kanan atas.",
            "Pada komputer bersama, selalu keluar setelah selesai.",
          ] },
          { t: "tip", text: "Jangan bagikan akun atau kata sandimu ke siapa pun, termasuk orang yang mengaku dari tim Lumen. Kalau ragu, hubungi tim lewat email resmi di bagian Hubungi kami." },
        ],
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard dan portofolio",
    intro: "Ringkasan akunmu dan posisi yang sedang kamu pegang.",
    articles: [
      {
        id: "dashboard",
        title: "Membaca Dashboard",
        summary: "Isi halaman ringkasan dan watchlist.",
        keywords: "dashboard ringkasan watchlist grafik beranda",
        blocks: [
          { t: "p", text: "Dashboard adalah halaman pertama setelah masuk. Di sana kamu melihat ringkasan nilai portofolio, grafik performa, dan watchlist saham yang kamu pantau." },
          { t: "p", text: "Rentang grafik bisa kamu ganti. Paket Free melihat 1D, 1W, dan 1M. Paket Premium juga bisa melihat 6M dan 1Y." },
          { t: "p", text: "Watchlist dibatasi sesuai paket: 3 saham untuk Free dan 5 saham untuk Premium." },
        ],
      },
      {
        id: "portofolio",
        title: "Portofolio: posisi dan alokasi",
        summary: "Posisi dari jurnal, dinilai dengan harga terkini.",
        keywords: "portofolio posisi alokasi nilai untung rugi aset",
        blocks: [
          { t: "p", text: "Portofolio menampilkan posisi yang kamu punya. Semua datanya berasal dari jurnal, lalu dinilai dengan harga pasar terkini." },
          { t: "p", text: "Bagian alokasi menunjukkan seberapa besar porsi tiap jenis aset: saham IDX, saham US, crypto, dan meme coin." },
          { t: "tip", text: "Kalau posisi di portofolio tidak sesuai, periksa lagi transaksi di Jurnal. Portofolio tidak bisa diedit langsung dari sini." },
        ],
      },
    ],
  },
  {
    id: "jurnal",
    title: "Jurnal dan kalender",
    intro: "Mencatat transaksi dengan benar supaya portofolio dan kalender akurat.",
    articles: [
      {
        id: "catat-transaksi",
        title: "Cara mencatat transaksi",
        summary: "Langkah lengkap menambah transaksi baru.",
        keywords: "jurnal catat transaksi tambah beli jual input",
        blocks: [
          { t: "steps", items: [
            "Buka menu Jurnal, lalu pilih jenis aset: Saham IDX, Saham US, Crypto, atau Meme coin.",
            "Ketik kode aset. Pilih hasilnya dari daftar yang muncul supaya nama dan harganya terisi otomatis.",
            "Pilih harga Live untuk mengambil harga terkini, atau Manual untuk mengisi harga sendiri.",
            "Isi jumlah, tanggal, dan jenis transaksi (beli atau jual).",
            "Tekan simpan. Transaksi langsung masuk ke portofolio dan kalender.",
          ] },
          { t: "tip", text: "Paket Free bisa mencatat sampai 30 transaksi. Paket Premium tanpa batas." },
        ],
      },
      {
        id: "meme-coin",
        title: "Mencatat meme coin",
        summary: "Cara mencari meme coin dengan nama atau alamat kontrak.",
        keywords: "meme coin memecoin kontrak alamat chain solana ethereum base bsc dexscreener",
        blocks: [
          { t: "p", text: "Untuk meme coin, kamu bisa mengetik nama token atau alamat kontraknya. Hasil pencarian diambil dari DexScreener dan menampilkan chain serta alamat kontrak token itu." },
          { t: "steps", items: [
            "Pilih jenis aset Meme coin di Jurnal.",
            "Ketik nama token, misalnya PEPE, atau tempel alamat kontraknya.",
            "Pilih token yang benar dari daftar. Chain dan alamat kontrak akan terisi otomatis.",
            "Harga Live hanya bisa diambil kalau chain dan alamat kontrak sudah terisi.",
          ] },
          { t: "tip", text: "Satu nama token bisa dipakai banyak token berbeda, dan sebagian dibuat untuk menipu. Selalu cocokkan alamat kontrak dengan sumber yang kamu percaya sebelum membeli." },
        ],
      },
      {
        id: "harga-live-manual",
        title: "Harga Live atau Manual",
        summary: "Kapan pakai harga otomatis dan kapan mengisi sendiri.",
        keywords: "harga live manual otomatis isi sendiri gagal harga tidak muncul",
        blocks: [
          { t: "p", text: "Harga Live mengambil harga terkini dari sumber pasar. Cocok untuk transaksi yang baru terjadi." },
          { t: "p", text: "Harga Manual cocok untuk transaksi lama, atau kalau harga live tidak tersedia. Kamu bebas mengisi harga yang sebenarnya kamu dapat." },
          { t: "tip", text: "Kalau harga live tidak muncul, cek dulu koneksi dan pastikan kode aset atau alamat kontraknya benar. Kalau masih gagal, pakai Manual." },
        ],
      },
      {
        id: "ganti-kode",
        title: "Mengganti kode aset yang sudah dipilih",
        summary: "Kenapa alamat kontrak ikut kosong saat kode diubah.",
        keywords: "ganti kode ubah aset alamat kontrak kosong",
        blocks: [
          { t: "p", text: "Kalau kamu mengubah kode aset setelah memilih sesuatu, alamat kontrak meme coin dikosongkan. Itu disengaja, supaya tidak ada alamat dari token lain yang terbawa." },
          { t: "p", text: "Pilih lagi token yang benar dari daftar hasil pencarian." },
        ],
      },
      {
        id: "kalender",
        title: "Kalender untung rugi",
        summary: "Membaca untung rugi terealisasi per hari.",
        keywords: "kalender pnl untung rugi realisasi harian bulan",
        blocks: [
          { t: "p", text: "Kalender menunjukkan untung rugi terealisasi per hari, yaitu hasil dari posisi yang sudah kamu tutup. Posisi yang masih terbuka tidak dihitung di sini." },
          { t: "p", text: "Paket Free melihat riwayat 3 bulan terakhir. Paket Premium melihat semua riwayat." },
        ],
      },
      {
        id: "analitik-jurnal",
        title: "Analitik jurnal dan pola transaksi",
        summary: "Fitur Premium untuk membaca kebiasaan trading kamu.",
        keywords: "analitik overtrading pola hoki perilaku trading premium",
        blocks: [
          { t: "p", text: "Analitik jurnal (khusus Premium) membaca riwayat transaksimu untuk melihat kebiasaan, misalnya transaksi yang terlalu sering dalam satu hari atau pola yang berulang." },
          { t: "p", text: "Fitur ini untuk refleksi, bukan saran. Pola di masa lalu tidak menjamin hasil di masa depan." },
        ],
      },
    ],
  },
  {
    id: "riset",
    title: "Riset Pasar (Premium)",
    intro: "Pasar, berita, analisis, dan futures. Bagian ini khusus Premium.",
    articles: [
      {
        id: "pasar",
        title: "Halaman Pasar",
        summary: "Daftar saham, crypto, dan meme coin yang sedang ramai.",
        keywords: "pasar market saham idx us crypto meme naik turun sering dilihat boost",
        blocks: [
          { t: "p", text: "Pasar dibagi menjadi empat tab: Saham IDX, Saham US, Crypto, dan Meme coin. Setiap tab punya daftar sendiri." },
          { t: "list", items: [
            "Sering dilihat untuk saham dan crypto. Sumbernya Pluang dan CoinMarketCap.",
            "Naik dan Turun untuk melihat yang bergerak paling kuat.",
            "Sering diboost untuk meme coin. Sumbernya DexScreener.",
          ] },
          { t: "p", text: "Data pasar untuk paket Premium diperbarui paling lama setiap 5 menit." },
          { t: "tip", text: "Daftar di Pasar menunjukkan apa yang ramai, bukan apa yang layak dibeli. Cek sendiri sebelum mengambil keputusan." },
        ],
      },
      {
        id: "berita",
        title: "Halaman Berita dan narasi",
        summary: "Cara membaca berita dan kelompok narasinya.",
        keywords: "berita news narasi akuisisi asing ipo dividen suku bunga perang teknologi sumber rss",
        blocks: [
          { t: "p", text: "Berita mengumpulkan artikel dari Google News dan beberapa media, lalu mengelompokkannya menurut narasi. Judul dan sumber selalu tampil, supaya kamu bisa membuka artikel aslinya." },
          { t: "steps", items: [
            "Pilih pasar di bagian atas: Saham IDX, Saham US, atau Crypto.",
            "Lihat Narasi utama. Setiap kartu menunjukkan kelompok topik yang paling banyak muncul.",
            "Tekan jumlah berita di kartu, atau pilih kategori di bawah, untuk melihat berita dalam satu narasi.",
            "Tekan judul untuk membuka artikel di situs media aslinya.",
          ] },
          { t: "p", text: "Berita diperbarui sekitar setiap 15 menit. Kalau sumber sedang tidak bisa dijangkau, halaman menampilkan pesan dan kamu bisa mencoba lagi nanti." },
          { t: "tip", text: "Berita menjelaskan apa yang sedang terjadi, tetapi tidak selalu menjelaskan dampaknya ke harga. Baca dari beberapa sumber sebelum menyimpulkan." },
        ],
      },
      {
        id: "analisis",
        title: "Halaman Analisis",
        summary: "Risiko, kinerja, dan alokasi portofolio.",
        keywords: "analisis risiko kinerja sektor kontributor alokasi premium",
        blocks: [
          { t: "p", text: "Analisis membantu kamu melihat risiko dan kinerja portofoliomu lebih dalam: alokasi per jenis aset, kontributor untung rugi, dan sebaran risiko." },
          { t: "p", text: "Analisis dihitung dari transaksi yang sudah kamu catat. Semakin lengkap jurnalmu, semakin akurat hasilnya." },
        ],
      },
      {
        id: "futures",
        title: "Futures Sentiment: cara membaca kartu",
        summary: "Arti LONG, SHORT, dan Netral, serta isi tiap kartu koin.",
        keywords: "futures sentiment funding open interest long short ratio konfluensi keyakinan spot chart tradingview",
        blocks: [
          { t: "p", text: "Futures Sentiment memantau sentimen pasar futures untuk beberapa koin. Setiap koin tampil sebagai kartu berisi arah sinyal, tingkat keyakinan, dan alasannya." },
          { t: "list", items: [
            "LONG berarti tekanan beli lebih dominan dibanding tekanan jual.",
            "SHORT berarti tekanan jual lebih dominan.",
            "NETRAL berarti sinyal belum searah. Tidak masuk posisi juga keputusan yang sah.",
            "Keyakinan menunjukkan seberapa kuat sinyalnya. Makin tinggi, makin banyak indikator yang sepakat.",
          ] },
          { t: "p", text: "Di dalam kartu ada dua bagian. Konfluensi teknikal harian membaca tren, momentum, dan volume. Screening derivatif membaca open interest, funding rate, dan long short ratio dari pasar futures." },
          { t: "steps", items: [
            "Tekan Cari koin untuk menambah koin. Maksimal 6 koin, dan Binance Spot dipakai sebagai sumber utama.",
            "Pilih ukuran kartu Besar, Sedang, atau Kecil. Makin banyak koin, kartu makin kecil otomatis.",
            "Tekan Tampilkan chart untuk melihat grafik TradingView di tiap kartu. Matikan kalau terasa berat.",
            "Tekan Lihat detail analisis di kartu untuk melihat rincian indikatornya.",
            "Tekan Perbarui untuk mengambil data terbaru. Tombol ini bisa dipakai lagi setelah 10 detik.",
          ] },
          { t: "tip", text: "Futures Sentiment adalah alat screening, bukan ajakan membeli atau menjual. Selalu tentukan batas kerugian sebelum masuk posisi." },
        ],
      },
    ],
  },
  {
    id: "masalah",
    title: "Masalah umum",
    intro: "Solusi untuk masalah yang paling sering muncul.",
    articles: [
      {
        id: "harga-tidak-muncul",
        title: "Harga tidak muncul di jurnal",
        summary: "Langkah cek kalau harga live tidak terisi.",
        keywords: "harga tidak muncul kosong gagal live error",
        blocks: [
          { t: "steps", items: [
            "Cek koneksi internetmu, lalu coba lagi.",
            "Untuk meme coin, pastikan chain dan alamat kontrak sudah terisi. Pilih ulang token dari daftar.",
            "Kalau masih gagal, pilih Manual dan isi harganya sendiri.",
          ] },
        ],
      },
      {
        id: "chart-tidak-tampil",
        title: "Chart TradingView tidak tampil",
        summary: "Penyebab umum chart kosong atau loading terus.",
        keywords: "chart tradingview tidak tampil loading kosong iklan blokir",
        blocks: [
          { t: "steps", items: [
            "Matikan pemblokir iklan untuk situs ini, lalu muat ulang halaman.",
            "Cek koneksi internetmu.",
            "Kalau tetap tidak tampil, tekan Buka di TradingView untuk melihat grafik di situs TradingView.",
          ] },
        ],
      },
      {
        id: "binance-tidak-terjangkau",
        title: "Futures belum bisa mengambil data",
        summary: "Muncul pesan perangkat belum bisa menjangkau Binance.",
        keywords: "binance tidak terjangkau vpn jaringan kantor kampus blokir futures data gagal",
        blocks: [
          { t: "p", text: "Pesan ini biasanya muncul kalau jaringanmu memblokir akses ke Binance, misalnya jaringan kantor atau kampus, atau kalau kamu memakai VPN tertentu." },
          { t: "steps", items: [
            "Matikan VPN, atau coba jaringan lain seperti data seluler.",
            "Tunggu beberapa saat. Data akan dicoba lagi otomatis setiap menit.",
          ] },
        ],
      },
      {
        id: "berita-gagal",
        title: "Berita belum bisa dimuat",
        summary: "Apa yang dilakukan kalau halaman Berita menampilkan pesan gagal.",
        keywords: "berita gagal error kosong sumber tidak bisa dijangkau",
        blocks: [
          { t: "p", text: "Berita bergantung pada beberapa sumber di luar Lumen. Kalau semuanya sedang tidak bisa dijangkau, halaman menampilkan pesan. Coba beberapa menit lagi." },
          { t: "p", text: "Kalau hanya sebagian sumber yang bermasalah, halaman tetap menampilkan berita dari sumber yang berhasil. Angka sumber terbaca di atas daftar membantu kamu memastikan." },
        ],
      },
      {
        id: "menu-terkunci",
        title: "Menu bertanda PRO tidak bisa dibuka",
        summary: "Kenapa menu terkunci dan apa yang harus dilakukan.",
        keywords: "pro terkunci gembok premium tidak bisa dibuka upgrade",
        blocks: [
          { t: "p", text: "Menu bertanda PRO hanya tersedia untuk paket Premium. Kalau kamu sudah membayar tetapi menu masih terkunci, hubungi tim kami lewat email dengan menyertakan email akunmu." },
        ],
      },
      {
        id: "tombol-perbarui",
        title: "Tombol Perbarui tidak bisa ditekan",
        summary: "Tombol diberi jeda beberapa detik supaya tidak membebani sumber data.",
        keywords: "perbarui refresh tombol tidak aktif tunggu jeda",
        blocks: [
          { t: "p", text: "Tombol Perbarui di Futures Sentiment diberi jeda 10 detik setelah dipakai. Tunggu hitungan mundurnya habis, lalu tekan lagi." },
        ],
      },
      {
        id: "watchlist-penuh",
        title: "Watchlist sudah penuh",
        summary: "Batas watchlist per paket dan cara menambah ruang.",
        keywords: "watchlist penuh batas 3 5 saham tambah hapus",
        blocks: [
          { t: "p", text: "Watchlist dibatasi 3 saham untuk Free dan 5 saham untuk Premium. Kalau penuh, hapus satu saham yang tidak lagi kamu pantau, atau pertimbangkan paket Premium." },
        ],
      },
    ],
  },
  {
    id: "glosarium",
    title: "Istilah",
    intro: "Arti istilah yang sering muncul di aplikasi.",
    articles: [
      {
        id: "istilah-futures",
        title: "Istilah futures",
        summary: "Long, short, funding rate, open interest, dan istilah turunannya.",
        keywords: "long short funding open interest ratio futures spot leverage kontrak",
        blocks: [
          { t: "list", items: [
            "Long: posisi yang untung kalau harga naik.",
            "Short: posisi yang untung kalau harga turun.",
            "Spot: transaksi jual beli aset langsung, bukan kontrak.",
            "Futures: kontrak untuk membeli atau menjual aset di kemudian hari dengan harga yang disepakati sekarang.",
            "Funding rate: biaya berkala antara pemegang long dan short di pasar futures. Kalau positif, long membayar short.",
            "Open interest: total kontrak futures yang masih terbuka.",
            "Long short ratio: perbandingan jumlah posisi long dan short.",
          ] },
        ],
      },
      {
        id: "istilah-teknikal",
        title: "Istilah indikator teknikal",
        summary: "Arti EMA, MACD, RSI, dan indikator lain di kartu Futures.",
        keywords: "ema macd rsi adx stochastic williams obv cmf poc indikator teknikal",
        blocks: [
          { t: "list", items: [
            "EMA 21: rata-rata harga eksponensial 21 periode. Dipakai untuk melihat arah tren.",
            "MACD: selisih dua rata-rata bergerak, dipakai untuk melihat momentum dan perubahan tren.",
            "ADX: kekuatan tren. Angka tinggi berarti tren kuat, tetapi tidak menunjukkan arahnya.",
            "RSI: indeks kekuatan relatif dengan skala 0 sampai 100. Di atas 70 sering dianggap jenuh beli, di bawah 30 jenuh jual.",
            "Stochastic: posisi harga terhadap rentang harga terakhir.",
            "Williams %R: mirip stochastic dengan skala -100 sampai 0.",
            "OBV: volume kumulatif. Naik berarti volume lebih banyak di sisi beli.",
            "CMF: aliran uang berdasarkan volume. Positif berarti tekanan beli.",
            "POC: Point of Control, harga yang paling banyak diperdagangkan dalam periode tertentu.",
          ] },
        ],
      },
      {
        id: "istilah-jurnal",
        title: "Istilah jurnal dan meme coin",
        summary: "PnL, overtrading, chain, dan alamat kontrak.",
        keywords: "pnl terealisasi overtrading chain alamat kontrak meme coin token",
        blocks: [
          { t: "list", items: [
            "PnL terealisasi: untung atau rugi dari posisi yang sudah ditutup.",
            "Overtrading: transaksi yang berlebihan dibanding kebiasaanmu sendiri.",
            "Chain: jaringan blockchain tempat sebuah token berada, misalnya Solana, Ethereum, Base, atau BSC.",
            "Alamat kontrak: identitas unik sebuah token di dalam satu chain. Nama yang sama bisa punya alamat yang berbeda.",
            "Meme coin: token yang nilainya banyak digerakkan oleh perhatian dan tren, bukan oleh fundamental proyek.",
          ] },
        ],
      },
      {
        id: "istilah-berita",
        title: "Istilah berita dan narasi",
        summary: "Arti kelompok narasi yang dipakai di halaman Berita.",
        keywords: "akuisisi merger ipo dividen buyback net buy asing suku bunga perang narasi",
        blocks: [
          { t: "list", items: [
            "Akuisisi dan merger: satu perusahaan membeli atau bergabung dengan perusahaan lain.",
            "Aliran dana asing: net buy atau net sell, yaitu selisih pembelian dan penjualan oleh investor asing dalam satu periode.",
            "IPO: penawaran saham perdana ke publik, saat sebuah perusahaan pertama kali dicatatkan di bursa.",
            "Dividen dan buyback: pembagian laba kepada pemegang saham, dan pembelian kembali saham oleh perusahaan sendiri.",
            "Suku bunga dan inflasi: kebijakan bank sentral dan kenaikan harga umum, yang sering memengaruhi pasar.",
            "Geopolitik dan perang: konflik atau kebijakan antarnegara seperti sanksi dan tarif, yang bisa menggerakkan pasar.",
          ] },
        ],
      },
    ],
  },
  {
    id: "keamanan",
    title: "Keamanan dan batasan",
    intro: "Hal-hal yang perlu kamu tahu tentang data dan keputusan investasi.",
    articles: [
      {
        id: "bukan-nasihat",
        title: "Lumen bukan penasihat investasi",
        summary: "Batasan fungsi Lumen dan tanggung jawab keputusanmu.",
        keywords: "nasihat saran investasi tanggung jawab risiko disclaimer",
        blocks: [
          { t: "p", text: "Semua sinyal, skor, dan berita di Lumen adalah alat bantu untuk membaca pasar. Bukan ajakan membeli atau menjual, dan bukan jaminan hasil." },
          { t: "p", text: "Sebelum mengambil keputusan, pertimbangkan kondisi keuanganmu, tujuanmu, dan risiko yang bisa kamu tanggung." },
        ],
      },
      {
        id: "data-sumber",
        title: "Dari mana datanya berasal",
        summary: "Sumber data pasar, derivatif, dan berita.",
        keywords: "sumber data binance pluang coinmarketcap dexscreener google news tradingview",
        blocks: [
          { t: "list", items: [
            "Saham IDX dan US: Pluang.",
            "Crypto: CoinMarketCap dan Binance.",
            "Meme coin: DexScreener.",
            "Futures Sentiment: Binance Spot dan Binance Futures.",
            "Berita: Google News dan feed beberapa media.",
            "Chart: TradingView.",
          ] },
          { t: "p", text: "Data dari pihak ketiga bisa tertunda, berubah format, atau sementara tidak tersedia. Kalau ada yang tidak sesuai dengan sumber aslinya, percayai sumber aslinya." },
        ],
      },
    ],
  },
];

export type HelpLink = { label: string; href: string; note: string };

/** Referensi resmi. Tautan ini diambil dari dokumentasi yang sudah dibaca saat pengembangan. */
export const HELP_REFERENCES: HelpLink[] = [
  { label: "Dokumentasi API DexScreener", href: "https://docs.dexscreener.com/api/reference", note: "Sumber data harga dan pencarian meme coin." },
  { label: "OWASP: Cross Site Scripting Prevention", href: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html", note: "Panduan pengamanan tampilan dan tautan." },
  { label: "OWASP: Server Side Request Forgery Prevention", href: "https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html", note: "Panduan pengamanan pengambilan data dari server." },
  { label: "Google News", href: "https://news.google.com", note: "Sumber berita di halaman Berita." },
  { label: "TradingView", href: "https://www.tradingview.com", note: "Chart yang tampil di Futures Sentiment." },
];

export const GLOSSARY_NOTE = "Istilah lengkap ada di kategori Istilah di atas.";

export const SUPPORT_EMAIL = "support@lumen.example";

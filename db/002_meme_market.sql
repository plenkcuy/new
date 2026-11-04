-- Pasar meme coin (DexScreener). Jalankan sekali di Neon setelah 001_journal.sql.
-- Menambah nilai 'meme' ke daftar pasar yang diizinkan.
alter table market_lists drop constraint if exists market_lists_market_check;
alter table market_lists add constraint market_lists_market_check check (market in ('idx', 'us', 'crypto', 'meme'));

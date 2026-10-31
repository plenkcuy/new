-- Jalankan sekali di Neon (SQL Editor atau psql "$DATABASE_URL" -f db/002_futures.sql).
-- Aman dijalankan ulang.

create table if not exists futures_snapshot (
  id               bigint generated always as identity primary key,
  symbol           text not null,
  label            text not null,
  bias             text not null check (bias in ('LONG', 'SHORT', 'NETRAL')),
  derivative_score int,
  payload          jsonb not null,
  created_at       timestamptz not null default now()
);

create index if not exists futures_snapshot_symbol_time
  on futures_snapshot (symbol, created_at desc);

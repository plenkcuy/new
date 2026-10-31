-- Jalankan sekali di Neon (SQL Editor atau psql "$DATABASE_URL" -f db/002_futures.sql).
-- Aman dijalankan ulang, termasuk di database yang sudah punya versi lama tabel ini.

create table if not exists futures_snapshot (
  id               bigint generated always as identity primary key,
  user_id          text,
  symbol           text not null,
  label            text not null,
  bias             text not null check (bias in ('LONG', 'SHORT', 'NETRAL')),
  derivative_score int,
  payload          jsonb,
  created_at       timestamptz not null default now()
);

alter table futures_snapshot add column if not exists user_id text;
alter table futures_snapshot alter column payload drop not null;

create index if not exists futures_snapshot_user_symbol_time
  on futures_snapshot (user_id, symbol, created_at desc);

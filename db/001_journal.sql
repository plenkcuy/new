-- Jalankan sekali di Neon (SQL Editor atau psql "$DATABASE_URL" -f db/001_journal.sql).
-- Aman dijalankan ulang.

create table if not exists journal_assets (
  id            bigint generated always as identity primary key,
  asset_class   text not null check (asset_class in ('idx', 'us_stock', 'crypto', 'meme')),
  symbol        text not null,
  name          text not null,
  ccy           text not null check (ccy in ('IDR', 'USD')),
  chain         text,
  contract_addr text,
  price_source  text not null check (price_source in ('yahoo', 'dexscreener')),
  price_ref     text not null,
  created_at    timestamptz not null default now()
);

create unique index if not exists journal_assets_uniq
  on journal_assets (asset_class, symbol, coalesce(chain, ''), coalesce(contract_addr, ''));

create table if not exists journal_trades (
  id          bigint generated always as identity primary key,
  user_id     text not null,
  asset_id    bigint not null references journal_assets (id),
  side        text not null check (side in ('buy', 'sell')),
  qty         numeric(38, 18) not null check (qty > 0),
  price       numeric(38, 18) not null check (price > 0),
  fee         numeric(38, 18) not null default 0 check (fee >= 0),
  usd_idr     numeric(20, 6) not null check (usd_idr > 0),
  traded_at   timestamptz not null,
  stop_loss   numeric(38, 18) check (stop_loss is null or stop_loss > 0),
  take_profit numeric(38, 18) check (take_profit is null or take_profit > 0),
  setup       text,
  emotion     text,
  notes       text,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists journal_trades_user_time on journal_trades (user_id, traded_at desc);
create index if not exists journal_trades_user_asset on journal_trades (user_id, asset_id);

create table if not exists journal_prices (
  asset_id bigint not null references journal_assets (id) on delete cascade,
  day      date not null,
  close    numeric(38, 18) not null,
  primary key (asset_id, day)
);

create table if not exists journal_fx (
  day     date primary key,
  usd_idr numeric(20, 6) not null check (usd_idr > 0)
);

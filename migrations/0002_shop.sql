-- Shop data schema (optional server path).
--
-- StockScan's live shop data lives in the phone (Zustand persist, version 10).
-- This file is the upgrade path when DATABASE_URL is set: Neon / PGLite apply
-- it once via scripts/migrate.mjs and src/lib/db.ts.
--
-- Client migrations (v8 → v9 settings → v10 demo + RBAC) run in
-- src/lib/shop-migrate.ts and do not need this SQL.
--
-- Every shop table is scoped by user_id (TEXT — preview user is 'dev-user').

create table if not exists shop_meta (
  user_id text not null,
  shop_data_version integer not null default 10,
  demo_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

create table if not exists shop_profile (
  id text primary key,
  user_id text not null,
  name text not null,
  phone text,
  shop_name text,
  roles text not null,
  is_guest boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shop_profile_user_idx on shop_profile (user_id);

create table if not exists shop_product (
  id text primary key,
  user_id text not null,
  code text not null,
  name text not null,
  quantity numeric not null default 0,
  pending_quantity numeric not null default 0,
  unit_cost numeric not null default 0,
  unit_price numeric not null default 0,
  expiry_date date,
  barcode text,
  reorder_level numeric not null default 10,
  hsn text,
  gst_rate numeric,
  updated_at timestamptz not null default now()
);
create index if not exists shop_product_user_idx on shop_product (user_id);

create table if not exists shop_sale (
  id text primary key,
  user_id text not null,
  bill_no text not null,
  total_revenue numeric not null,
  amount_paid numeric not null default 0,
  payment_status text not null,
  customer_id text,
  created_at timestamptz not null default now()
);
create index if not exists shop_sale_user_idx on shop_sale (user_id);

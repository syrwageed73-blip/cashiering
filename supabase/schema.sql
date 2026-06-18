-- =============================================================================
-- POS — Normalized relational schema (PostgreSQL 17 / Supabase)
-- Idempotent: safe to re-run. Non-destructive (no DROP TABLE of live data).
-- All tenant rows are scoped by owner_id = auth.users.id (RLS enforced).
-- The Express server uses each caller's bearer token together with the anon key,
-- so RLS remains the primary per-user access control layer.
-- =============================================================================

-- Needed for gen_random_uuid() on older PG; harmless if already present.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared: updated_at trigger function (reusable across tables)
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- user_profiles  (pre-existing — aligned, non-destructive)
-- -----------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null default '',
  role       text not null default 'cashier' check (role in ('admin', 'cashier')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.touch_updated_at();

-- Auth hook: create profile on signup
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'cashier')
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

alter table public.user_profiles enable row level security;

drop policy if exists "Users read own profile" on public.user_profiles;
create policy "Users read own profile"
  on public.user_profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.user_profiles;
create policy "Users update own profile"
  on public.user_profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  owner_id   uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  unique (owner_id, name)
);

create index if not exists idx_categories_owner on public.categories (owner_id);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.touch_updated_at();

alter table public.categories enable row level security;

drop policy if exists "Users read own categories" on public.categories;
create policy "Users read own categories"
  on public.categories for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users insert own categories" on public.categories;
create policy "Users insert own categories"
  on public.categories for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users update own categories" on public.categories;
create policy "Users update own categories"
  on public.categories for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users delete own categories" on public.categories;
create policy "Users delete own categories"
  on public.categories for delete to authenticated
  using (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- products
--   category column holds the category NAME (denormalized, per frontend contract).
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  owner_id        uuid not null references auth.users (id) on delete cascade,
  id              text not null,
  barcode         text not null default '',
  name            text not null default '',
  price           numeric(12,2) not null default 0,
  stock           integer not null default 0,
  category        text not null default '',
  image           text,
  low_stock_alert integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (owner_id, id)
);

create index if not exists idx_products_owner        on public.products (owner_id);
create index if not exists idx_products_owner_barcode on public.products (owner_id, barcode);
create index if not exists idx_products_owner_name    on public.products (owner_id, name);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

drop policy if exists "Users read own products" on public.products;
create policy "Users read own products"
  on public.products for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users insert own products" on public.products;
create policy "Users insert own products"
  on public.products for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users update own products" on public.products;
create policy "Users update own products"
  on public.products for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users delete own products" on public.products;
create policy "Users delete own products"
  on public.products for delete to authenticated
  using (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- invoices  (header)
-- -----------------------------------------------------------------------------
create table if not exists public.invoices (
  owner_id       uuid not null references auth.users (id) on delete cascade,
  id             text not null,
  invoice_number text not null default '',
  datetime       timestamptz not null default now(),
  subtotal       numeric(12,2) not null default 0,
  discount       numeric(12,2) not null default 0,
  tax            numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  payment_method text not null default 'cash' check (payment_method in ('cash','card','mobile')),
  cash_given     numeric(12,2),
  change_given   numeric(12,2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (owner_id, id)
);

create index if not exists idx_invoices_owner          on public.invoices (owner_id);
create index if not exists idx_invoices_owner_datetime on public.invoices (owner_id, datetime desc);

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.touch_updated_at();

alter table public.invoices enable row level security;

drop policy if exists "Users read own invoices" on public.invoices;
create policy "Users read own invoices"
  on public.invoices for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users insert own invoices" on public.invoices;
create policy "Users insert own invoices"
  on public.invoices for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users update own invoices" on public.invoices;
create policy "Users update own invoices"
  on public.invoices for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users delete own invoices" on public.invoices;
create policy "Users delete own invoices"
  on public.invoices for delete to authenticated
  using (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- invoice_items  (lines; FK → invoices with cascade)
--   No FK to products: invoices must survive product deletion/rename
--   (name/barcode are embedded snapshots, matching the frontend contract).
-- -----------------------------------------------------------------------------
create table if not exists public.invoice_items (
  owner_id    uuid not null references auth.users (id) on delete cascade,
  invoice_id  text not null,
  line_no     integer not null,
  product_id  text not null default '',
  name        text not null default '',
  price       numeric(12,2) not null default 0,
  quantity    integer not null default 0,
  barcode     text not null default '',
  subtotal    numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  primary key (owner_id, invoice_id, line_no),
  foreign key (owner_id, invoice_id)
    references public.invoices (owner_id, id)
    on delete cascade on update cascade
);

create index if not exists idx_invoice_items_owner_invoice on public.invoice_items (owner_id, invoice_id);

alter table public.invoice_items enable row level security;

drop policy if exists "Users read own invoice_items" on public.invoice_items;
create policy "Users read own invoice_items"
  on public.invoice_items for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users insert own invoice_items" on public.invoice_items;
create policy "Users insert own invoice_items"
  on public.invoice_items for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users update own invoice_items" on public.invoice_items;
create policy "Users update own invoice_items"
  on public.invoice_items for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users delete own invoice_items" on public.invoice_items;
create policy "Users delete own invoice_items"
  on public.invoice_items for delete to authenticated
  using (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- stock_logs
-- -----------------------------------------------------------------------------
create table if not exists public.stock_logs (
  owner_id     uuid not null references auth.users (id) on delete cascade,
  id           text not null,
  product_id   text not null default '',
  product_name text not null default '',
  barcode      text not null default '',
  type         text not null default 'adjust' check (type in ('sale','add','subtract','adjust')),
  quantity     integer not null default 0,
  datetime     timestamptz not null default now(),
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  primary key (owner_id, id)
);

create index if not exists idx_stock_logs_owner          on public.stock_logs (owner_id);
create index if not exists idx_stock_logs_owner_datetime on public.stock_logs (owner_id, datetime desc);
create index if not exists idx_stock_logs_owner_product  on public.stock_logs (owner_id, product_id);

alter table public.stock_logs enable row level security;

drop policy if exists "Users read own stock_logs" on public.stock_logs;
create policy "Users read own stock_logs"
  on public.stock_logs for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users insert own stock_logs" on public.stock_logs;
create policy "Users insert own stock_logs"
  on public.stock_logs for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users update own stock_logs" on public.stock_logs;
create policy "Users update own stock_logs"
  on public.stock_logs for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users delete own stock_logs" on public.stock_logs;
create policy "Users delete own stock_logs"
  on public.stock_logs for delete to authenticated
  using (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- store_settings  (one row per owner; PK = owner_id)
--   Columns are snake_case; the Express layer maps to camelCase in the API.
-- -----------------------------------------------------------------------------
create table if not exists public.store_settings (
  owner_id             uuid primary key references auth.users (id) on delete cascade,
  store_name           text not null default '',
  store_logo           text not null default '',
  address              text not null default '',
  phone_number         text not null default '',
  receipt_footer       text not null default '',
  currency_symbol      text not null default '',
  tax_percentage       numeric(5,2) not null default 0,
  low_stock_alert_qty  integer not null default 5,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_store_settings_owner on public.store_settings (owner_id);

drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.touch_updated_at();

alter table public.store_settings enable row level security;

drop policy if exists "Users read own store_settings" on public.store_settings;
create policy "Users read own store_settings"
  on public.store_settings for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users upsert own store_settings" on public.store_settings;
create policy "Users upsert own store_settings"
  on public.store_settings for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users update own store_settings" on public.store_settings;
create policy "Users update own store_settings"
  on public.store_settings for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users delete own store_settings" on public.store_settings;
create policy "Users delete own store_settings"
  on public.store_settings for delete to authenticated
  using (auth.uid() = owner_id);

-- =============================================================================
-- read_user_state(p_owner uuid)
-- Returns the full AppStatePayload as one JSON document so the backend can fetch
-- a user's state in a single RPC instead of multiple table roundtrips.
-- =============================================================================
create or replace function public.read_user_state(p_owner uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_products      jsonb;
  v_categories    jsonb;
  v_invoices      jsonb;
  v_stock_logs    jsonb;
  v_settings      jsonb;
  v_has_settings  boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' and auth.uid() is distinct from p_owner then
    raise exception 'Authenticated user does not match target owner.' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'barcode', coalesce(p.barcode, ''),
        'name', coalesce(p.name, ''),
        'price', p.price,
        'stock', p.stock,
        'category', coalesce(p.category, ''),
        'image', p.image,
        'lowStockAlert', p.low_stock_alert
      )
      order by p.created_at asc
    ),
    '[]'::jsonb
  )
  into v_products
  from public.products p
  where p.owner_id = p_owner;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', coalesce(c.name, '')
      )
      order by c.created_at asc
    ),
    '[]'::jsonb
  )
  into v_categories
  from public.categories c
  where c.owner_id = p_owner;

  select coalesce(
    jsonb_agg(invoice_json order by invoice_datetime desc),
    '[]'::jsonb
  )
  into v_invoices
  from (
    select
      i.datetime as invoice_datetime,
      jsonb_build_object(
        'id', i.id,
        'invoiceNumber', coalesce(i.invoice_number, ''),
        'datetime', to_char(i.datetime at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'items', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'productId', coalesce(ii.product_id, ''),
              'name', coalesce(ii.name, ''),
              'price', ii.price,
              'quantity', ii.quantity,
              'barcode', coalesce(ii.barcode, ''),
              'subtotal', ii.subtotal
            )
            order by ii.line_no asc
          )
          from public.invoice_items ii
          where ii.owner_id = i.owner_id and ii.invoice_id = i.id
        ), '[]'::jsonb),
        'subtotal', i.subtotal,
        'discount', i.discount,
        'tax', i.tax,
        'total', i.total,
        'paymentMethod', coalesce(i.payment_method, 'cash'),
        'cashGiven', i.cash_given,
        'changeGiven', i.change_given
      ) as invoice_json
    from public.invoices i
    where i.owner_id = p_owner
  ) invoices_with_items;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'productId', coalesce(s.product_id, ''),
        'productName', coalesce(s.product_name, ''),
        'barcode', coalesce(s.barcode, ''),
        'type', coalesce(s.type, 'adjust'),
        'quantity', s.quantity,
        'datetime', to_char(s.datetime at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'notes', coalesce(s.notes, '')
      )
      order by s.datetime desc
    ),
    '[]'::jsonb
  )
  into v_stock_logs
  from public.stock_logs s
  where s.owner_id = p_owner;

  select
    exists(select 1 from public.store_settings ss where ss.owner_id = p_owner),
    coalesce((
      select jsonb_build_object(
        'storeName', ss.store_name,
        'storeLogo', ss.store_logo,
        'address', ss.address,
        'phoneNumber', ss.phone_number,
        'receiptFooter', ss.receipt_footer,
        'currencySymbol', ss.currency_symbol,
        'taxPercentage', ss.tax_percentage,
        'lowStockAlertQty', ss.low_stock_alert_qty
      )
      from public.store_settings ss
      where ss.owner_id = p_owner
    ), '{}'::jsonb)
  into v_has_settings, v_settings;

  if v_products = '[]'::jsonb and not v_has_settings then
    return null;
  end if;

  return jsonb_build_object(
    'products', v_products,
    'categories', v_categories,
    'invoices', v_invoices,
    'settings', v_settings,
    'stockLogs', v_stock_logs
  );
end;
$$;

revoke execute on function public.read_user_state(uuid) from public;
revoke execute on function public.read_user_state(uuid) from anon;
grant execute on function public.read_user_state(uuid) to authenticated;
grant execute on function public.read_user_state(uuid) to service_role;

-- =============================================================================
-- replace_user_state(p_owner uuid, p_payload jsonb)
-- Atomically replaces ALL of an owner's data (last-write-wins) inside a single
-- transaction. Called by the Express server via .rpc('replace_user_state', ...).
-- The payload is the FULL AppStatePayload (camelCase) exactly as the frontend
-- sends it on PUT /api/state.
--
-- SECURITY DEFINER keeps the full-replace write atomic even though it spans
-- multiple tables. The function validates that the caller is writing only their
-- own owner_id before performing any change. search_path is locked to public.
-- =============================================================================
create or replace function public.replace_user_state(p_owner uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings     jsonb := coalesce(p_payload -> 'settings', '{}'::jsonb);
  v_products     jsonb := coalesce(p_payload -> 'products', '[]'::jsonb);
  v_categories   jsonb := coalesce(p_payload -> 'categories', '[]'::jsonb);
  v_invoices     jsonb := coalesce(p_payload -> 'invoices', '[]'::jsonb);
  v_stock_logs   jsonb := coalesce(p_payload -> 'stockLogs', '[]'::jsonb);
begin
  if coalesce(auth.role(), '') <> 'service_role' and auth.uid() is distinct from p_owner then
    raise exception 'Authenticated user does not match target owner.' using errcode = '42501';
  end if;

  -- ---- store_settings (upsert) ----
  insert into public.store_settings (
    owner_id, store_name, store_logo, address, phone_number, receipt_footer,
    currency_symbol, tax_percentage, low_stock_alert_qty
  )
  select
    p_owner,
    coalesce(v_settings ->> 'storeName', ''),
    coalesce(v_settings ->> 'storeLogo', ''),
    coalesce(v_settings ->> 'address', ''),
    coalesce(v_settings ->> 'phoneNumber', ''),
    coalesce(v_settings ->> 'receiptFooter', ''),
    coalesce(v_settings ->> 'currencySymbol', ''),
    coalesce((v_settings ->> 'taxPercentage')::numeric, 0),
    coalesce((v_settings ->> 'lowStockAlertQty')::integer, 5)
  on conflict (owner_id) do update
  set
    store_name          = excluded.store_name,
    store_logo          = excluded.store_logo,
    address             = excluded.address,
    phone_number        = excluded.phone_number,
    receipt_footer      = excluded.receipt_footer,
    currency_symbol     = excluded.currency_symbol,
    tax_percentage      = excluded.tax_percentage,
    low_stock_alert_qty = excluded.low_stock_alert_qty,
    updated_at          = now();

  -- ---- categories (full replace) ----
  -- ON CONFLICT DO NOTHING: gracefully de-dupes any repeated client ids within
  -- a single payload (defensive; jsonb_array_elements preserves document order
  -- so the first occurrence wins, matching the old JSONB last-write semantics).
  delete from public.categories where owner_id = p_owner;
  insert into public.categories (owner_id, id, name)
  select
    p_owner,
    coalesce(elem ->> 'id', ''),
    coalesce(elem ->> 'name', '')
  from jsonb_array_elements(v_categories) as t(elem)
  where coalesce(elem ->> 'id', '') <> ''
  on conflict (owner_id, id) do nothing;

  -- ---- products (full replace) ----
  delete from public.products where owner_id = p_owner;
  insert into public.products (
    owner_id, id, barcode, name, price, stock, category, image, low_stock_alert
  )
  select
    p_owner,
    coalesce(elem ->> 'id', ''),
    coalesce(elem ->> 'barcode', ''),
    coalesce(elem ->> 'name', ''),
    coalesce((elem ->> 'price')::numeric, 0),
    coalesce((elem ->> 'stock')::integer, 0),
    coalesce(elem ->> 'category', ''),
    elem ->> 'image',
    nullif(elem ->> 'lowStockAlert', '')::integer
  from jsonb_array_elements(v_products) as t(elem)
  where coalesce(elem ->> 'id', '') <> ''
  on conflict (owner_id, id) do nothing;

  -- ---- invoices + invoice_items (full replace; cascade clears items) ----
  delete from public.invoices where owner_id = p_owner;

  insert into public.invoices (
    owner_id, id, invoice_number, datetime, subtotal, discount, tax, total,
    payment_method, cash_given, change_given
  )
  select
    p_owner,
    coalesce(inv ->> 'id', ''),
    coalesce(inv ->> 'invoiceNumber', ''),
    coalesce((inv ->> 'datetime')::timestamptz, now()),
    coalesce((inv ->> 'subtotal')::numeric, 0),
    coalesce((inv ->> 'discount')::numeric, 0),
    coalesce((inv ->> 'tax')::numeric, 0),
    coalesce((inv ->> 'total')::numeric, 0),
    coalesce(inv ->> 'paymentMethod', 'cash'),
    nullif(inv ->> 'cashGiven', '')::numeric,
    nullif(inv ->> 'changeGiven', '')::numeric
  from jsonb_array_elements(v_invoices) as t(inv)
  where coalesce(inv ->> 'id', '') <> ''
  on conflict (owner_id, id) do nothing;

  -- items: line_no derived per-invoice from array position (0-based).
  insert into public.invoice_items (
    owner_id, invoice_id, line_no, product_id, name, price, quantity, barcode, subtotal
  )
  select
    p_owner,
    coalesce(inv ->> 'id', ''),
    row_number() over (partition by p_owner, inv ->> 'id' order by ord) - 1,
    coalesce(item ->> 'productId', ''),
    coalesce(item ->> 'name', ''),
    coalesce((item ->> 'price')::numeric, 0),
    coalesce((item ->> 'quantity')::integer, 0),
    coalesce(item ->> 'barcode', ''),
    coalesce((item ->> 'subtotal')::numeric, 0)
  from jsonb_array_elements(v_invoices) with ordinality as t(inv, ord)
  cross join lateral jsonb_array_elements(coalesce(inv -> 'items', '[]'::jsonb)) as i(item)
  where coalesce(inv ->> 'id', '') <> ''
  on conflict (owner_id, invoice_id, line_no) do nothing;

  -- ---- stock_logs (full replace) ----
  delete from public.stock_logs where owner_id = p_owner;
  insert into public.stock_logs (
    owner_id, id, product_id, product_name, barcode, type, quantity, datetime, notes
  )
  select
    p_owner,
    coalesce(elem ->> 'id', ''),
    coalesce(elem ->> 'productId', ''),
    coalesce(elem ->> 'productName', ''),
    coalesce(elem ->> 'barcode', ''),
    coalesce(elem ->> 'type', 'adjust'),
    coalesce((elem ->> 'quantity')::integer, 0),
    coalesce((elem ->> 'datetime')::timestamptz, now()),
    coalesce(elem ->> 'notes', '')
  from jsonb_array_elements(v_stock_logs) as t(elem)
  where coalesce(elem ->> 'id', '') <> ''
  on conflict (owner_id, id) do nothing;
end;
$$;

-- SECURITY: the function checks auth.uid() against p_owner, so authenticated
-- callers may execute it only for their own dataset. service_role remains
-- allowed for compatibility with older backends.
revoke execute on function public.replace_user_state(uuid, jsonb) from public;
revoke execute on function public.replace_user_state(uuid, jsonb) from anon;
grant  execute on function public.replace_user_state(uuid, jsonb) to authenticated;
grant  execute on function public.replace_user_state(uuid, jsonb) to service_role;

-- =============================================================================
-- Legacy aggregate table — KEPT for backward-compat / rollback.
-- The Express server no longer reads/writes it after the refactor, but existing
-- data is preserved. Safe to drop later once the normalized migration is verified.
-- (Defined here only if it doesn't already exist; existing rows are untouched.)
-- =============================================================================
create table if not exists public.app_state (
  owner_id   uuid primary key references auth.users (id) on delete cascade,
  products   jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  invoices   jsonb not null default '[]'::jsonb,
  settings   jsonb not null default '{}'::jsonb,
  stock_logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_state_set_updated_at on public.app_state;
create trigger app_state_set_updated_at
  before update on public.app_state
  for each row execute function public.touch_updated_at();

alter table public.app_state enable row level security;

drop policy if exists "Users read own app state" on public.app_state;
create policy "Users read own app state"
  on public.app_state for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users upsert own app state" on public.app_state;
create policy "Users upsert own app state"
  on public.app_state for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

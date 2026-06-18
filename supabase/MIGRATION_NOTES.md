# Migration Notes — Normalized Relational Schema

## What changed

The POS backend previously persisted the entire app state as a single JSONB blob
row per user in `public.app_state` (one row, columns: `products`, `categories`,
`invoices`, `settings`, `stock_logs`). That made reporting, indexing, constraints,
and per-entity queries impossible.

This migration introduces a **normalized relational schema** while keeping the
frontend API contract byte-identical. The server decomposes the aggregate into
rows on write and reassembles it on read.

### Files

- `supabase/schema.sql` — full idempotent schema (tables, RLS, functions, triggers, indexes).
- `supabase/migrations/0001_normalized_schema.sql` — same content, ordered for the
  Supabase Management API SQL endpoint. **Apply this one.**
- `server.js` — refactored GET/PUT `/api/state` to use the relational tables and
  the `replace_user_state` RPC.

## Aggregate → table mapping

| Frontend field (`AppStatePayload`) | Table | Notes |
|---|---|---|
| `products[]` | `products` | `category` stored as the category **name** string (denormalized, per contract). `image` nullable; `low_stock_alert` nullable. |
| `categories[]` | `categories` | `PK (owner_id, id)`, `UNIQUE (owner_id, name)`. |
| `invoices[]` (header) | `invoices` | money `numeric(12,2)`; `payment_method` CHECK `cash/card/mobile`; `cash_given`/`change_given` nullable. |
| `invoices[].items[]` | `invoice_items` | `PK (owner_id, invoice_id, line_no)`; FK→invoices `ON DELETE CASCADE`. `product_id`/`name`/`barcode` are **embedded snapshots** (no FK to products), so historical invoices survive catalog edits. `line_no` is 0-based array position. |
| `stockLogs[]` | `stock_logs` | response key is camel `stockLogs`, DB table is snake `stock_logs`. `type` CHECK `sale/add/subtract/adjust`. |
| `settings` | `store_settings` | one row per owner (`PK owner_id`). Snake_case columns mapped to camelCase in the server. |
| (auth) | `user_profiles` | unchanged shape; aligned + added update policy. |

All tenant tables are scoped by `owner_id uuid references auth.users(id) on delete cascade`
and have RLS enabled with `using (auth.uid() = owner_id)` / matching `WITH CHECK`.
The server uses the caller's bearer token together with the public anon key, so
RLS remains the primary access control layer for all per-user reads and writes.

## Money / quantity / date types

- Money columns: `numeric(12,2)` (price, subtotal, discount, tax, total, cash_given, change_given).
- `tax_percentage`: `numeric(5,2)`.
- Quantities / stock: `integer`.
- Timestamps: `timestamptz`. `datetime` (invoices, stock_logs) round-trips as ISO-8601 UTC.

PostgREST returns `numeric` columns as **strings**. The Express mappers coerce
them back to JS `Number` so the JSON shape matches the previous JSONB output.

## The `replace_user_state(uuid, jsonb)` RPC

PUT `/api/state` is **last-write-wins, full-state replace**. To keep this atomic
(supabase-js has no multi-statement transaction client), the server calls a single
`SECURITY DEFINER` Postgres function:

```sql
select public.replace_user_state(p_owner := $ownerUuid, p_payload := $jsonbPayload);
```

The function, inside one implicit transaction:

1. **Upserts** `store_settings` for the owner.
2. **Deletes + re-inserts** `categories`, `products`, `invoices`, `invoice_items`, `stock_logs`
   scoped to `owner_id`.
3. Invoice items are derived via `jsonb_array_elements(... with ordinality)` and
   `row_number()` to reconstruct `line_no`.
4. Each per-id insert uses `ON CONFLICT DO NOTHING` to de-duplicate any repeated
   client ids within a single payload (defensive; document order preserved).

If any statement fails, the transaction rolls back — the user's previous data is
left intact. `search_path` is locked to `public`; execute is granted to
`authenticated` and `service_role`, revoked from `public`.

### Exact JSONB payload shape `replace_user_state` expects

It is the **full `AppStatePayload`** exactly as the frontend sends on PUT (camelCase),
already passed through `normalizeAppState` (so `settings` has defaults backfilled):

```jsonc
{
  "products":     [ { "id": "1718000000000", "barcode": "6210001", "name": "ماء", "price": 2.00, "stock": 50, "category": "مشروبات", "image": "data:image/...", "lowStockAlert": 10 } ],
  "categories":   [ { "id": "1718000000001", "name": "مشروبات" } ],
  "invoices":     [ { "id": "1718000000002", "invoiceNumber": "INV-1", "datetime": "2026-06-16T12:00:00.000Z",
                      "items": [ { "productId": "1718000000000", "name": "ماء", "price": 2.00, "quantity": 2, "barcode": "6210001", "subtotal": 4.00 } ],
                      "subtotal": 4.00, "discount": 0, "tax": 0.60, "total": 4.60, "paymentMethod": "cash", "cashGiven": 5.00, "changeGiven": 0.40 } ],
  "settings":     { "storeName": "...", "storeLogo": "...", "address": "...", "phoneNumber": "...", "receiptFooter": "...", "currencySymbol": "ر.س", "taxPercentage": 15, "lowStockAlertQty": 5 },
  "stockLogs":    [ { "id": "1718000000003", "productId": "1718000000000", "productName": "ماء", "barcode": "6210001", "type": "sale", "quantity": 2, "datetime": "2026-06-16T12:00:00.000Z", "notes": "" } ]
}
```

Key/field name rules the function depends on:

- Top-level: `products`, `categories`, `invoices`, `settings`, **`stockLogs`** (camel).
- `settings.*`: camelCase (`storeName`, `storeLogo`, `address`, `phoneNumber`,
  `receiptFooter`, `currencySymbol`, `taxPercentage`, `lowStockAlertQty`).
- `invoices[*]`: `invoiceNumber`, `datetime`, `paymentMethod`, `cashGiven`, `changeGiven`, `items[]`.
- `invoices[*].items[*]`: `productId`, `name`, `price`, `quantity`, `barcode`, `subtotal`.
- `stockLogs[*]`: `id`, `productId`, `productName`, `barcode`, `type`, `quantity`, `datetime`, `notes`.

Missing/`null` values are `coalesce`d to safe defaults inside the function;
`image`/`lowStockAlert`/`cashGiven`/`changeGiven` fall through to SQL `NULL`.

## GET behavior (seed flow preserved)

GET `/api/state` reassembles the payload from the relational tables and returns
`{ data: null }` **only when the user has no products AND no settings row** — so the
frontend's seed-then-PUT flow fires exactly once for a brand-new user. After the
first PUT, a settings row always exists, so GET never returns null again (matching
the previous behavior, where an `app_state` row existed once any state was saved).

## Cashier write restriction

`canCashierWriteState` is preserved verbatim and runs **before** the RPC replace,
operating on the relational reassembly (`readRelationalState`) as the "current"
state. Cashiers may only decrement stock and append invoice/log activity;
catalog/settings/category changes are rejected with 403.

## Rollback / backward compatibility

- `public.app_state` is **kept as-is** (recreated idempotently if absent) and is
  **no longer read or written** by the server after this refactor.
- To roll back: revert `server.js` to the previous version (JSONB read/write) and
  redeploy. The `app_state` table and its prior data are untouched by the migration.
  (If you already ran production traffic against the normalized schema after deploy,
  roll-forward instead — there is no automatic back-fill from normalized → `app_state`.)
- The migration is **non-destructive**: it uses `create table if not exists`,
  `create index if not exists`, and `drop policy/trigger if exists` + recreate. No
  `DROP TABLE` of any live data.

## Verifying a round-trip

1. Apply `supabase/migrations/0001_normalized_schema.sql` via the Supabase SQL editor
   or Management API. Confirm `select proname from pg_proc where proname='replace_user_state';`
   returns a row.
2. Sign in as an existing user; the frontend will GET `null` only the very first
   time. Seed + PUT a known dataset (e.g. 2 products, 1 category, 1 invoice).
3. PUT `/api/state` with the payload above → expect `{ data: <same payload, backfilled> }`.
4. In Supabase Table Editor (or SQL), verify:
   - `select id, name, price, stock, category from products where owner_id='<uid>';`
   - `select invoice_id, line_no, name, quantity, subtotal from invoice_items where owner_id='<uid>' order by invoice_id, line_no;`
   - `select * from store_settings where owner_id='<uid>';`
5. GET `/api/state` → compare field-by-field with what you PUT. Numeric fields must
   be JSON numbers (not strings); `datetime` must be ISO strings; `items[]` must be
   embedded under each invoice; `stockLogs` key must be camelCase.
6. Cashier guard: as a `cashier`, attempt to change `settings.storeName` → expect 403.
7. Re-run the migration SQL a second time → must complete without error (idempotency check).

## Contract risks / caveats

- **Numeric precision**: `numeric(12,2)` rounds money to 2 decimals on write. The
  previous JSONB stored whatever JS floats the client sent. For typical POS prices
  this is identical; extremely high-precision floats would be rounded.
- **Duplicate client ids within one PUT** (e.g. two products with the same
  `Date.now()` ms id) are de-duped (first wins) rather than erroring. The old JSONB
  stored both as array entries; the frontend dedupes by id in its maps, so observed
  behavior is equivalent.
- **Missing `user_profiles` row**: the auth trigger should create it on signup. If
  it is temporarily missing, the backend falls back to an in-memory `cashier`
  profile for that request instead of failing closed.
- **SQL execution permissions**: `replace_user_state` is `SECURITY DEFINER`, but it
  now validates `auth.uid() = p_owner` for non-service-role callers before making
  any change.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { appConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const distIndexPath = path.join(distDir, 'index.html');
const defaultSupabaseUrl = appConfig.supabase.url;

function getSafeUrlOrigin(value) {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}

const PORT = Number(process.env.PORT || 4000);
const SUPABASE_URL = getSafeUrlOrigin(process.env.SUPABASE_URL) ? process.env.SUPABASE_URL : defaultSupabaseUrl;
const SUPABASE_ORIGIN = getSafeUrlOrigin(SUPABASE_URL);
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  appConfig.supabase.anonKey;
const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.APP_URL || '*';

const app = express();

// Security headers — stateless, serverless-safe.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        connectSrc: ["'self'", 'https:', 'wss:', ...(SUPABASE_ORIGIN ? [SUPABASE_ORIGIN] : [])],
        frameAncestors: ["'self'"],
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CORS_ORIGIN === '*') {
        callback(null, true);
        return;
      }

      const allowedOrigins = CORS_ORIGIN.split(',').map((item) => item.trim());
      callback(null, allowedOrigins.includes(origin));
    },
  }),
);
app.use(express.json({ limit: '5mb' }));

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

function createUserSupabase(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function ensureSupabaseConfigured(res) {
  if (supabase) {
    return true;
  }

  res.status(500).json({
    error: 'SUPABASE_URL and SUPABASE_ANON_KEY must be configured on the backend.',
  });
  return false;
}

// ---------------------------------------------------------------------------
// State normalization — preserved verbatim from the previous implementation so
// the API contract (default-settings backfill on every read/write) is unchanged.
// ---------------------------------------------------------------------------

function buildDefaultSettings(settings = {}) {
  return {
    storeName: typeof settings.storeName === 'string' ? settings.storeName : 'سوبرماركت التجزئة الحديث',
    storeLogo: typeof settings.storeLogo === 'string' ? settings.storeLogo : 'store',
    address: typeof settings.address === 'string' ? settings.address : 'المملكة العربية السعودية، الرياض، شارع التخصصي',
    phoneNumber: typeof settings.phoneNumber === 'string' ? settings.phoneNumber : '966500000000',
    receiptFooter:
      typeof settings.receiptFooter === 'string'
        ? settings.receiptFooter
        : 'شكراً لزيارتكم! الفاتورة مستند ضريبي معتمد.',
    currencySymbol: typeof settings.currencySymbol === 'string' ? settings.currencySymbol : 'ر.س',
    taxPercentage: Number.isFinite(settings.taxPercentage) ? settings.taxPercentage : 15,
    lowStockAlertQty: Number.isFinite(settings.lowStockAlertQty) ? settings.lowStockAlertQty : 5,
  };
}

function normalizeAppState(payload = {}) {
  const products = Array.isArray(payload.products) ? payload.products : [];
  const categories = Array.isArray(payload.categories) ? payload.categories : [];
  const invoices = Array.isArray(payload.invoices) ? payload.invoices : [];
  const stockLogs = Array.isArray(payload.stockLogs) ? payload.stockLogs : [];

  return {
    products,
    categories,
    invoices,
    settings: buildDefaultSettings(payload.settings),
    stockLogs,
  };
}

function safeStringify(value) {
  return JSON.stringify(value ?? null);
}

function productMeta(product) {
  return {
    id: product.id,
    barcode: product.barcode,
    name: product.name,
    price: product.price,
    category: product.category,
    image: product.image ?? null,
    lowStockAlert: product.lowStockAlert ?? null,
  };
}

function canCashierWriteState(currentState, nextState) {
  if (safeStringify(currentState.categories) !== safeStringify(nextState.categories)) {
    return false;
  }

  if (safeStringify(currentState.settings) !== safeStringify(nextState.settings)) {
    return false;
  }

  if (currentState.products.length !== nextState.products.length) {
    return false;
  }

  const currentProductsById = new Map(currentState.products.map((product) => [product.id, product]));
  for (const nextProduct of nextState.products) {
    const currentProduct = currentProductsById.get(nextProduct.id);
    if (!currentProduct) {
      return false;
    }

    if (safeStringify(productMeta(currentProduct)) !== safeStringify(productMeta(nextProduct))) {
      return false;
    }

    if (!Number.isFinite(nextProduct.stock) || nextProduct.stock > currentProduct.stock || nextProduct.stock < 0) {
      return false;
    }
  }

  const currentInvoicesById = new Map(currentState.invoices.map((invoice) => [invoice.id, invoice]));
  for (const currentInvoice of currentState.invoices) {
    const nextInvoice = nextState.invoices.find((invoice) => invoice.id === currentInvoice.id);
    if (!nextInvoice || safeStringify(nextInvoice) !== safeStringify(currentInvoice)) {
      return false;
    }
  }

  const currentLogsById = new Map(currentState.stockLogs.map((log) => [log.id, log]));
  for (const currentLog of currentState.stockLogs) {
    const nextLog = nextState.stockLogs.find((log) => log.id === currentLog.id);
    if (!nextLog || safeStringify(nextLog) !== safeStringify(currentLog)) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Row → contract mappers (snake_case DB rows → camelCase AppStatePayload).
// Money columns come back as strings from numeric; coerce to Number to keep
// the API shape identical to the previous JSONB implementation.
// ---------------------------------------------------------------------------

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapProductRow(row) {
  return {
    id: row.id,
    barcode: row.barcode ?? '',
    name: row.name ?? '',
    price: toNumber(row.price),
    stock: row.stock ?? 0,
    category: row.category ?? '',
    image: row.image ?? undefined,
    lowStockAlert: row.low_stock_alert ?? undefined,
  };
}

function mapCategoryRow(row) {
  return {
    id: row.id,
    name: row.name ?? '',
  };
}

function mapInvoiceItemRow(row) {
  return {
    productId: row.product_id ?? '',
    name: row.name ?? '',
    price: toNumber(row.price),
    quantity: row.quantity ?? 0,
    barcode: row.barcode ?? '',
    subtotal: toNumber(row.subtotal),
  };
}

function mapInvoiceRow(row, itemsByInvoice) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number ?? '',
    datetime: row.datetime ? new Date(row.datetime).toISOString() : new Date().toISOString(),
    items: itemsByInvoice.get(row.id) || [],
    subtotal: toNumber(row.subtotal),
    discount: toNumber(row.discount),
    tax: toNumber(row.tax),
    total: toNumber(row.total),
    paymentMethod: row.payment_method ?? 'cash',
    cashGiven: toOptionalNumber(row.cash_given),
    changeGiven: toOptionalNumber(row.change_given),
  };
}

function mapStockLogRow(row) {
  return {
    id: row.id,
    productId: row.product_id ?? '',
    productName: row.product_name ?? '',
    barcode: row.barcode ?? '',
    type: row.type ?? 'adjust',
    quantity: row.quantity ?? 0,
    datetime: row.datetime ? new Date(row.datetime).toISOString() : new Date().toISOString(),
    notes: row.notes ?? '',
  };
}

function mapSettingsRow(row) {
  if (!row) {
    return buildDefaultSettings();
  }
  return buildDefaultSettings({
    storeName: row.store_name,
    storeLogo: row.store_logo,
    address: row.address,
    phoneNumber: row.phone_number,
    receiptFooter: row.receipt_footer,
    currencySymbol: row.currency_symbol,
    taxPercentage: toNumber(row.tax_percentage),
    lowStockAlertQty: row.low_stock_alert_qty,
  });
}

// ---------------------------------------------------------------------------
// Relational read: reassemble the full AppStatePayload for an owner.
// Returns null when the user has no data yet (no products AND no settings),
// so the frontend seed-then-PUT flow still fires.
// ---------------------------------------------------------------------------

async function readRelationalState(supabaseClient, ownerId) {
  // One RPC avoids the fan-out of multiple PostgREST roundtrips per request.
  const { data, error } = await supabaseClient.rpc('read_user_state', {
    p_owner: ownerId,
  });

  if (error) {
    throw error;
  }

  return data ? normalizeAppState(data) : null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function getUserProfile(supabaseClient, user) {
  const { data: existingProfile, error: profileError } = await supabaseClient
    .from('user_profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  // The schema trigger should create the profile on signup. If it is missing,
  // keep the request working with the default least-privilege role.
  return {
    id: user.id,
    email: user.email || '',
    role: 'cashier',
  };
}

async function requireAuth(req, res, next) {
  if (!ensureSupabaseConfigured(res)) {
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing bearer token.' });
    return;
  }

  const accessToken = authHeader.slice('Bearer '.length);
  const userSupabase = createUserSupabase(accessToken);
  if (!userSupabase) {
    res.status(500).json({ error: 'Unable to initialize Supabase client.' });
    return;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    res.status(401).json({ error: 'Supabase session is invalid or expired.' });
    return;
  }

  try {
    const profile = await getUserProfile(userSupabase, user);
    req.authUser = user;
    req.authProfile = profile;
    req.supabase = userSupabase;
    next();
  } catch (profileError) {
    console.error('Failed to load user profile:', profileError);
    res.status(500).json({ error: 'Unable to load user profile from Supabase.' });
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    supabaseConfigured: Boolean(supabase),
  });
});

app.get('/api/me', requireAuth, async (req, res) => {
  res.json({
    data: {
      id: req.authProfile.id,
      email: req.authProfile.email || req.authUser.email || '',
      role: req.authProfile.role,
    },
  });
});

app.get('/api/state', requireAuth, async (req, res) => {
  try {
    const state = await readRelationalState(req.supabase, req.authUser.id);
    res.json({ data: state });
  } catch (error) {
    console.error('Failed to fetch app state:', error);
    res.status(500).json({ error: 'Unable to load app state from Supabase.' });
  }
});

app.put('/api/state', requireAuth, async (req, res) => {
  try {
    const nextState = normalizeAppState(req.body);

    if (req.authProfile.role === 'cashier') {
      const currentState = await readRelationalState(req.supabase, req.authUser.id);
      if (currentState && !canCashierWriteState(currentState, nextState)) {
        res.status(403).json({
          error: 'Cashier role can only complete sales and append invoice/log activity. Catalog, settings, inventory adjustments, and backups require admin access.',
        });
        return;
      }
    }

    const { error: rpcError } = await req.supabase.rpc('replace_user_state', {
      p_owner: req.authUser.id,
      p_payload: nextState,
    });

    if (rpcError) {
      throw rpcError;
    }

    res.json({ data: nextState });
  } catch (error) {
    console.error('Failed to save app state:', error);
    res.status(500).json({ error: 'Unable to save app state to Supabase.' });
  }
});

if (fs.existsSync(distIndexPath)) {
  app.use(express.static(distDir));

  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(distIndexPath);
  });
}

// Export the Express app for Vercel's serverless runtime (api/index.js re-exports this).
// On Vercel, VERCEL env var is set automatically — skip listen so the function doesn't
// try to bind a port. In local dev (node server.js / npm run dev:server) the guard is
// false and the server binds normally.
export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`POS backend listening on http://localhost:${PORT}`);
  });
}

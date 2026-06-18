# Vercel Deployment Runbook

Single-project deployment: Vite static frontend + Express backend as one Vercel serverless function, same-origin.

---

## Architecture overview

```
vercel.json
  buildCommand: vite build  →  dist/   (static assets, SPA)
  rewrites: /api/(*) → /api            (Express function, api/index.js)

Vercel routing order (important):
  1. Static files in dist/ are served directly (assets, JS chunks, etc.)
  2. /api/* rewrites hit the Express function (api/index.js → server.js)
  3. All other paths → Vite's SPA fallback serves dist/index.html
     (react-router BrowserRouter handles /app/pos, /app/inventory, etc.)

vercel.json design note:
  The single rewrite  { "source": "/api/(.*)", "destination": "/api" }
  routes all API sub-paths to the one serverless function.
  Vercel's Vite framework preset already provides the SPA catch-all
  (serves index.html for unmatched client routes), so no explicit
  /index.html catch-all is needed in vercel.json. Static files always
  take priority over rewrites, so built assets are never intercepted.
```

---

## Config And Optional Environment Variables

`config.js` is enough for the Supabase URL and anon key. Environment variables are only optional overrides.

| Variable | Vercel Scope | Notes |
|---|---|---|
| `config.js` | Repo file | Public config committed with the app. Holds the Supabase base URL and anon key used by both frontend and backend defaults. |
| `SUPABASE_URL` | Functions (Runtime) | Optional override. Use your base project URL, not `/rest/v1/`. |
| `SUPABASE_ANON_KEY` | Functions (Runtime) | Optional override. Public key used with each request's Bearer token so RLS can enforce per-user access. |
| `CORS_ORIGIN` | Functions (Runtime) — optional | Not needed in prod (requests are same-origin). Set to your Vercel domain (e.g. `https://your-app.vercel.app`) for defense-in-depth if desired. |

**DO NOT set `VITE_API_BASE_URL`** — leave it unset. `src/api.ts` falls back to `/api` when this variable is absent, which correctly resolves same-origin on Vercel.

**DO NOT set `PORT`** — Vercel serverless functions do not bind a port; the variable is ignored and the `app.listen` guard skips it automatically (`process.env.VERCEL` is set by the platform).

---

## Deployment steps

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. Go to vercel.com → New Project → Import Git Repository.
3. Vercel auto-detects `vercel.json`; confirm:
   - Framework Preset: **Vite** (or Other — vercel.json overrides build settings)
   - Build Command: `vite build`
   - Output Directory: `dist`
   - Install Command: `npm install` (default)
4. Add all environment variables from the table above.
5. Click Deploy.
6. After deploy, verify:
   - `https://your-app.vercel.app/api/health` → `{"ok":true,"supabaseConfigured":true}`
   - `https://your-app.vercel.app/` → login page loads (HTTP 200)
   - `https://your-app.vercel.app/app/pos` → served correctly (SPA fallback, not 404)
   - Browser DevTools → Network → no CORS errors on API calls
   - Auth flow: login → redirects to correct role page

---

## Hosted Runtime

For deployment, the frontend calls same-origin `/api` routes and the backend uses the committed `config.js` defaults unless you provide runtime overrides in your host.

---

## Rate limiting (TODO — follow-up required)

In-memory rate limiting (e.g. `express-rate-limit` without a backing store) is intentionally NOT installed. On Vercel serverless, each cold-start creates an isolated Node process with its own memory — in-memory counters reset on every cold start and provide no real protection in a multi-instance environment.

**Recommended follow-up options:**

- **Vercel Firewall** (Pro plan): IP-level rate limiting with no code changes required.
- **Upstash Redis + `@upstash/ratelimit`**: edge-compatible, shared state across all function instances. Add the `@upstash/ratelimit` package and wrap route handlers. See: https://github.com/upstash/ratelimit-js
- **Supabase Edge Functions**: offload auth-sensitive rate limiting to a Supabase function with a Redis-backed counter.

---

## Rollback

Vercel keeps every deployment. If a release breaks production:
1. Go to Vercel dashboard → Deployments.
2. Find the last healthy deployment → click "..." → **Promote to Production**.
3. Investigate the failed deployment's Function Logs before re-deploying.

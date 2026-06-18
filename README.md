<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This project is now split into:

- a Vite React frontend
- an Express backend
- Supabase Auth for login
- Supabase Postgres for per-user POS state

View your app in AI Studio: https://ai.studio/apps/9ac26c02-ccc9-44ff-a8ec-6131753effd0

## Local setup

**Prerequisites:** Node.js 20+ and a Supabase project

1. Install dependencies:
   `npm install`
2. Edit `config.js` and set your public Supabase values there
3. In Supabase SQL Editor, run `supabase/schema.sql`
4. Start the backend:
   `npm run server`
5. Start the frontend:
   `npm run dev`

## opencode Supabase MCP

- `opencode.json` is now configured with the official hosted Supabase MCP server.
- It is scoped by `SUPABASE_PROJECT_REF`.
- After restarting `opencode`, it should prompt you to authenticate Supabase in the browser.

Required env for MCP:

- `SUPABASE_PROJECT_REF`

Important:

- I cannot log into your Supabase account or retrieve private keys on your behalf.
- You must complete the browser authorization yourself when `opencode` prompts for it.

## Supabase auth

- The website now shows a login screen before app access.
- Users sign in with Supabase email/password auth.
- New accounts are created only by you in the Supabase dashboard.
- The login screen can send password reset emails.
- The login screen can resend email confirmation links.
- Each authenticated user gets their own `app_state` row in Supabase.

## Routes

- `/login`: sign in only
- `/reset-password`: complete Supabase password recovery
- `/app/:view`: protected application area

## Roles

- `admin`: full access to all sections
- `cashier`: access limited to `pos` and `reports`

Default behavior:

- new users are created as `cashier`
- promote an account to admin by updating `public.user_profiles.role`

Example SQL:

`update public.user_profiles set role = 'admin' where email = 'owner@example.com';`

## API

- `GET /api/health`
- `GET /api/state` (requires Bearer token)
- `PUT /api/state` (requires Bearer token)

## Generic Hosting

- Push the source code only to GitHub. Do not commit `dist`.
- Any normal Node host can build and run this project.
- Build command: `npm install && npm run build`
- Start command: `npm run server`
- After build, `server.js` serves the generated `dist` frontend and the `/api` backend from the same app.

## Notes

- In hosted deployment, the frontend calls same-origin `/api` endpoints.
- Backend auth is verified with the user's Supabase bearer token and RLS-protected queries.
- Existing app data is stored as one structured state record per user for minimal migration complexity.
- `config.js` is intended for public config only. Do not put a `service_role` key there.
- No `.env` file is required for the Supabase setup in this repo.

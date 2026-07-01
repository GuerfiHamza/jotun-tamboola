# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> Next.js 16.2.7 + React 19. APIs differ from older Next — read `node_modules/next/dist/docs/` before writing framework code (per AGENTS.md).

## Commands

- `npm run dev` — dev server (also starts the in-process re-analysis scheduler via `instrumentation.ts`)
- `npm run build` / `npm start`
- `npm run lint` — ESLint (`eslint.config.mjs`, flat config)
- `npm run db:generate` — generate a Drizzle migration from `lib/db/schema.ts` into `lib/db/migrations/`
- `npm run db:push` — push the schema straight to the DB (dev)
- `npm run db:studio` — Drizzle Studio

No test framework is configured — there are no tests to run.

### Required env vars
`JWT_SECRET` (≥32 chars — `lib/auth.ts` throws at import if missing), `DB_HOST` / `DB_USER` / `DB_PASS` / `DB_NAME`, `GEMINI_API_KEY_1` (+ optional `GEMINI_API_KEY_2`), optional `GEMINI_MODEL`, `CRON_SECRET` (for the manual cron endpoint), and Cloudflare Turnstile keys.

## Architecture

This is an **admin-only** Next.js app (App Router). There is no public site — `app/page.tsx` redirects `/` to `/admin/login`. Stores and a master operator do everything from the authenticated dashboard. UI is French/Arabic (RTL), default Arabic.

### Auth & roles (defense in depth)
Two roles: **`master`** (sees/acts on everything) and **`store`** (scoped to its own submissions). Login issues an HS256 JWT in the `admin_token` cookie (8h). Verified at three layers, all of which must keep agreeing:
1. `middleware.ts` — Edge runtime, re-implements HS256 verify with Web Crypto (jsonwebtoken can't run on Edge); matcher covers `/admin/*` and `/api/admin/*` (except `/login`).
2. Route handlers — `getAdminFromRequest()` (`lib/adminAuth.ts` → `lib/auth.ts`).
3. Ownership — `lib/scope.ts` (`participantScope`, `ownsParticipant`, `ownsInvoice`, `ownsInvoiceFile`). **Any store-facing query/mutation must be scoped through these**, never trust an id from the client.

The master sets each account's password directly in the create form (and picks its role, `store` or `master`); stores use it as-is — there is no forced or self-service change for stores (`must_change_password` stays 0). The master can still change its own password via `/admin/change-password`. Password resets generate a one-time temp password shown to the master.

### Data model (`lib/db/schema.ts`)
`accounts` (`store_name` doubles as the login username) → `participants` (FK `account_id`, cascade) → `invoices` (FK `participant_id`, cascade). Use the inferred Drizzle types exported at the bottom of the schema. **Two DB modules exist**: `lib/db/index.ts` is the Drizzle client — **use this**; `lib/db.ts` is an unused raw mysql2 pool.

### Invoice pipeline
`/admin/submit` → `POST /api/register` (creates a participant) → `POST /api/upload-invoice`: validates MIME with `file-type` + 10 MB cap, writes the file to `private_uploads/` (never public), runs dedup, then analyzes the amount with Gemini in a **background task** (`after()` from `next/server`) so the response returns fast. Stored files are served only through the authorized `/api/admin/invoice/[filename]` route.

**Auto-approve rule.** The commercial may declare a `montant` (invoice `declared_amount`) on upload. In the background analysis, if the AI reads the same amount (rounded to whole DA) the invoice auto-approves (invoice `accepted`, participant `approved`). If the AI can't read the amount, or it differs, `status` stays `pending` for the master. This deliberately relaxes the old never-auto-approve invariant, so it is gated on an exact AI match; a Gemini-read amount alone (no matching declared montant) still never auto-approves. Retries/re-analysis without a declared montant stay `pending`.

### Dedup (`lib/dedup.ts`) — three independent layers
- `exactHash` (SHA-256 of raw bytes): hard reject if a *different* participant already submitted it; benign retry if the *same* participant.
- `perceptualHash` (64-bit dHash): Hamming-distance match → sets `duplicate_flag=1` (admin review), never rejects.
- `contentKey` (`vendor|invoice_no|date|amount` from Gemini): same — flag, never reject.
`duplicate_flag=1` always means "needs a human", never an automatic action.

### Gemini OCR (`lib/gemini.ts`)
Escalation ladder of 3 models × detailed/simple prompts (5 attempts) to stretch 3 free-tier quotas, with minute-scale backoff (it runs in the background). Rotates across `GEMINI_API_KEY_1/2`. Images normalized with `sharp` (auto-rotate, resize, jpeg); PDFs passed through untouched.

### Re-analysis scheduler
`instrumentation.ts` runs `reanalyzeStuck()` 1 min after boot then every 10 min (Node runtime only, guarded against dev hot-reload double-registration) — no external cron needed. Manual trigger: `GET /api/cron/reanalyze` with the secret in the `X-Cron-Key` header (not the query string). The admin "retry" button hits `reanalyzeOne()`.

### i18n (`lib/i18n/`)
Locales `fr` / `ar` (default `ar`), selected by the `lang` cookie. Dictionaries are `server-only` and lazy-loaded; `dictionaries/fr.ts` defines the `Dictionary` type and `ar.ts` must match it. Note many admin strings are **hardcoded French** rather than routed through the dictionary — match the surrounding file. Use logical CSS properties (`ps`/`pe`, `ms`/`me`, `start`/`end`) so layouts work in RTL.

### Security posture
CSP + security headers in `next.config.ts`. CSRF via `checkCsrf` (`lib/csrf.ts`): requires `x-requested-with: XMLHttpRequest` plus Origin/Sec-Fetch-Site checks — **every mutating `fetch` must send that header** (existing code does). Cookies are SameSite=Lax. In-memory per-key rate limiting (`lib/rateLimit.ts`, resets on restart). Cloudflare Turnstile on login. `serverExternalPackages: ['pdfkit','exceljs','sharp']` — these must stay unbundled (native/font-file runtime deps).

### UI / theming
Admin pages use inline `style={{}}` driven by theme tokens from `lib/adminTheme.tsx` (`getTheme(dark)`), **not** Tailwind color classes, because dark/light is a runtime toggle. Theme persists in `localStorage` (`jotun-admin-theme`); components render light on the server then sync from localStorage in a mount effect to avoid hydration mismatch. `// ponytail:` comments mark deliberate simplifications — read them as intent.

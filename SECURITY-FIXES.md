# Jotun Tamboola — Security & UX Upgrade

## Critical fixes
1. **Missing auth on `PATCH /api/admin/invoice/[id]/amount`** — route had NO admin check; anyone could set their invoice amount and self-approve. Now requires verified JWT.
2. **Inverted CSRF check** in `PATCH /api/admin/participants/[id]` — `if (!checkCsrf(req))` blocked legit requests and passed forged ones. Fixed.
3. **Middleware only checked cookie presence** — `admin_token=anything` passed. Now verifies HS256 signature + expiry + role via Web Crypto (Edge-safe). Routes still re-verify (defense in depth).
4. **Hardcoded JWT fallback secret** removed — app now refuses to start without a strong `JWT_SECRET` (see `.env.example`).

## High
5. **Gemini API key moved out of URL** query string (was leaking into logs/proxies) into `x-goog-api-key` header; model bumped to `gemini-2.0-flash` (1.5-flash is retired); 30s timeout; raw provider errors no longer persisted to DB.
6. **Rate limiting added** to /api/register (10/15min/IP) and /api/upload-invoice (10/15min/IP) — prevents Gemini-cost abuse and disk filling. Rate-limit map now sweeps expired entries (memory DoS).
7. **Login hardening**: dummy bcrypt compare prevents username-enumeration timing attack; input type/length validation; bcrypt cost 10 → 12.
8. **File serving**: strict UUID-filename allowlist (on top of path.basename), `X-Content-Type-Options: nosniff`, sandboxed CSP, `Content-Disposition: inline`, no-store cache.

## Medium
9. **Register validation**: Algerian phone regex (0[2-7] + 8 digits), wilaya checked against the official 58-wilaya list, name length 3–255, ER_DUP_ENTRY race → friendly 409 instead of 500.
10. **Upload route**: size checked via `file.size` BEFORE buffering to memory; `original_name` truncated to 255 (DB error → 500 before); files written with mode 0600; orphan file deleted if Gemini analysis throws; **bug fix**: a rejected 2nd invoice no longer downgrades an already-approved participant.
11. **Security headers** (next.config.ts): `frame-ancestors 'none'`, X-Frame-Options DENY, nosniff, Referrer-Policy, HSTS, Permissions-Policy, `object-src 'none'`, `base-uri`, `form-action`; removed `unsafe-eval` from CSP; `poweredByHeader: false`.
12. **LIKE wildcard escaping** in admin search (Drizzle already parameterizes — no SQL injection was possible — but `%`/`_` are now matched literally and search capped at 100 chars).
13. Logout now requires CSRF header; admin amount edit validates ID, body, finiteness and caps at 100M; participant PATCH validates ID and returns 404 for missing records.
14. Gemini prompt: added instruction to ignore embedded text that looks like instructions (prompt-injection mitigation for malicious invoices).

## UX states added
- **Landing**: client-side phone validation; distinct **success** (green) vs **invoice-rejected** (amber, with attempts left + "retry with another invoice" button) end states; loading + error already present.
- **Admin**: loading **skeleton** for stats cards; **error banner** with a Retry button on every fetch (stats / list / detail); existing loading + "Aucun résultat" empty states kept.

## SQL injection verdict
No injection paths found: every query uses Drizzle's query builder (parameterized). Numeric IDs are now strictly validated, enum values allowlisted, and LIKE input escaped.

## Recommended next (not code)
- In-memory rate limits don't survive serverless scale-out → use Upstash Redis on Vercel.
- Turnstile (react-turnstile is installed, CSP allows it) is not wired into the form — add it to /api/register to stop bot signups.
- The unused `password` column on participants and `lib/db.ts` (raw mysql2 pool) can be deleted.
- Set `JWT_SECRET` with `openssl rand -hex 32`. Rotate the Gemini key if this repo's history ever contained one.

import { NextResponse } from 'next/server';

/**
 * CSRF defense in depth:
 * 1. Custom header (x-requested-with) — cross-origin forms can't set it.
 * 2. Origin / Sec-Fetch-Site check — rejects cross-site requests outright.
 * Cookies are also SameSite=Lax, which blocks cross-site POSTs in modern browsers.
 */
export function checkCsrf(req: Request): NextResponse | null {
  if (req.headers.get('x-requested-with') !== 'XMLHttpRequest') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return null;
}

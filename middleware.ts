import { NextRequest, NextResponse } from 'next/server';

/**
 * SECURITY: the previous middleware only checked that the cookie EXISTED —
 * any value (e.g. admin_token=x) passed. We now verify the HS256 JWT
 * signature + expiry using Web Crypto (jsonwebtoken doesn't run on the
 * Edge runtime). Route handlers still re-verify via getAdminFromRequest()
 * (defense in depth).
 */

const enc = new TextEncoder();

function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function verifyJwtHS256(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    if (header.alg !== 'HS256') return false; // reject alg confusion (none/RS256)

    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC', key, b64urlToBytes(parts[2]) as BufferSource, enc.encode(`${parts[0]}.${parts[1]}`)
    );
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return false;
    if (payload.role !== 'admin') return false;
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin') && pathname !== '/api/admin/login';

  if (isAdminPage || isAdminApi) {
    const token = req.cookies.get('admin_token')?.value;
    const secret = process.env.JWT_SECRET ?? '';
    const ok = token && secret ? await verifyJwtHS256(token, secret) : false;

    if (!ok) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const res = NextResponse.redirect(new URL('/admin/login', req.url));
      res.cookies.delete('admin_token');
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

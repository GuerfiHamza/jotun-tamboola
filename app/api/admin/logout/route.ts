import { NextResponse } from 'next/server';
import { checkCsrf } from '@/lib/csrf';

export async function POST(req: Request) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const res = NextResponse.json({ success: true });
  res.cookies.set('admin_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

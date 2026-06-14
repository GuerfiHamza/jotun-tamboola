import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { reanalyzeStuck } from '@/lib/reanalyze';

// Constant-time compare that doesn't early-return on length mismatch.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a compare against a same-length dummy to keep timing flat.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// Optional manual/external trigger (the built-in scheduler in
// instrumentation.ts already runs every 10 min). Pass the secret in the
// X-Cron-Key header — NOT the query string (query strings get logged):
//   curl -s -H "X-Cron-Key: VOTRE_CRON_SECRET" http://localhost:3000/api/cron/reanalyze
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  const provided = req.headers.get('x-cron-key') ?? '';

  if (secret.length === 0 || !safeEqual(provided, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await reanalyzeStuck();
  return NextResponse.json({ processed: results.length, results });
}
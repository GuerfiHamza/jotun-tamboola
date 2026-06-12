import { NextRequest, NextResponse } from 'next/server';
import { reanalyzeStuck } from '@/lib/reanalyze';

// Optional manual/external trigger (the built-in scheduler in
// instrumentation.ts already runs every 10 min):
//   curl -s "http://localhost:3000/api/cron/reanalyze?key=VOTRE_CRON_SECRET"
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.nextUrl.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results = await reanalyzeStuck();
  return NextResponse.json({ processed: results.length, results });
}

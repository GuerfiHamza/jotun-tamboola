import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { participantScope } from '@/lib/scope';
import { getExportRows, EXPORT_HEADER } from '@/lib/exportData';

// Neutralize CSV/formula injection and escape quotes
function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const acc = await getAdminFromRequest();
  if (!acc)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rows = await getExportRows(searchParams.get('search') || '', searchParams.get('status') || '', participantScope(acc));

  const lines = [EXPORT_HEADER.map(csvCell).join(';'), ...rows.map(r => r.map(csvCell).join(';'))];
  const csv = '\uFEFF' + lines.join('\r\n');
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="participants-jotun-${date}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

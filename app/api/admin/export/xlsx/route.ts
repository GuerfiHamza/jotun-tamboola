import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { getExportRows, EXPORT_HEADER } from '@/lib/exportData';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  if (!await getAdminFromRequest())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rows = await getExportRows(searchParams.get('search') || '', searchParams.get('status') || '');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Jotun Tamboola';
  const ws = wb.addWorksheet('Participants', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: EXPORT_HEADER[0], key: 'id',      width: 8 },
    { header: EXPORT_HEADER[1], key: 'name',    width: 28 },
    { header: EXPORT_HEADER[2], key: 'phone',   width: 14 },
    { header: EXPORT_HEADER[3], key: 'wilaya',  width: 18 },
    { header: EXPORT_HEADER[4], key: 'painter', width: 9 },
    { header: EXPORT_HEADER[5], key: 'status',  width: 11 },
    { header: EXPORT_HEADER[6], key: 'count',   width: 9 },
    { header: EXPORT_HEADER[7], key: 'best',    width: 20 },
    { header: EXPORT_HEADER[8], key: 'date',    width: 19 },
  ];

  // Jotun-red header
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8102E' } };
  head.alignment = { vertical: 'middle' };
  head.height = 20;

  for (const r of rows) {
    const row = ws.addRow(r);
    // Status color
    const statusCell = row.getCell(6);
    const colors: Record<string, string> = { approved: 'FF15803D', pending: 'FFB45309', rejected: 'FFB91C1C' };
    statusCell.font = { color: { argb: colors[String(r[5])] ?? 'FF374151' }, bold: true };
    // Amount as real number with thousands format
    const amountCell = row.getCell(8);
    if (typeof r[7] === 'number') amountCell.numFmt = '#,##0 "DA"';
  }
  ws.autoFilter = { from: 'A1', to: `I${rows.length + 1}` };

  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="participants-jotun-${date}.xlsx"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

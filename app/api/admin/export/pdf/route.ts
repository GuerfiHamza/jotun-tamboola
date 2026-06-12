import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { getExportRows, EXPORT_HEADER } from '@/lib/exportData';
import PDFDocument from 'pdfkit';

export async function GET(req: NextRequest) {
  if (!await getAdminFromRequest())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rows = await getExportRows(searchParams.get('search') || '', searchParams.get('status') || '');

  const COLS = [30, 130, 75, 80, 42, 55, 45, 80, 95]; // widths, landscape A4 ≈ 770pt usable
  const X0 = 30;
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const drawHeader = (y: number) => {
    doc.rect(X0, y, COLS.reduce((a, b) => a + b, 0), 18).fill('#C8102E');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);
    let x = X0;
    EXPORT_HEADER.forEach((h, i) => { doc.text(h, x + 3, y + 5, { width: COLS[i] - 6 }); x += COLS[i]; });
    return y + 18;
  };

  // Title
  doc.fillColor('#C8102E').font('Helvetica-Bold').fontSize(16)
    .text('Jotun Tamboola — Participants', X0, 30);
  doc.fillColor('#6B7280').font('Helvetica').fontSize(9)
    .text(`Exporté le ${new Date().toLocaleString('fr-DZ')} — ${rows.length} participant(s)`, X0, 50);

  let y = drawHeader(68);
  doc.font('Helvetica').fontSize(7.5);

  for (const [idx, r] of rows.entries()) {
    if (y > 545) { doc.addPage(); y = drawHeader(30); doc.font('Helvetica').fontSize(7.5); }
    if (idx % 2 === 1) doc.rect(X0, y, COLS.reduce((a, b) => a + b, 0), 14).fill('#F9FAFB');
    let x = X0;
    r.forEach((cell, i) => {
      const isStatus = i === 5;
      const statusColors: Record<string, string> = { approved: '#15803D', pending: '#B45309', rejected: '#B91C1C' };
      doc.fillColor(isStatus ? (statusColors[String(cell)] ?? '#111827') : '#111827');
      if (isStatus) doc.font('Helvetica-Bold'); 
      const text = i === 7 && typeof cell === 'number' ? `${cell.toLocaleString('fr-DZ')} DA` : String(cell);
      doc.text(text, x + 3, y + 3.5, { width: COLS[i] - 6, lineBreak: false, ellipsis: true });
      if (isStatus) doc.font('Helvetica');
      x += COLS[i];
    });
    y += 14;
  }
  doc.end();

  const buffer = await done;
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="participants-jotun-${date}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

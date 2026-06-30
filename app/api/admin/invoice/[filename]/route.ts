import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { ownsInvoiceFile } from '@/lib/scope';
import { readFile } from 'fs/promises';
import path from 'path';

// Strict allowlist: UUID + known extension only (filenames are always
// server-generated UUIDs, so anything else is hostile input).
const SAFE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$/i;

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', pdf: 'application/pdf',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const acc = await getAdminFromRequest();
  if (!acc) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const filename = path.basename((await params).filename); // belt
  if (!SAFE_NAME.test(filename)) {                          // and suspenders
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }
  if (!await ownsInvoiceFile(acc, filename))
    return NextResponse.json({ error: 'File not found' }, { status: 404 });

  const filePath = path.join(process.cwd(), 'private_uploads', filename);

  try {
    const file = await readFile(filePath);
    const ext = filename.split('.').pop()!.toLowerCase();
    return new NextResponse(file as unknown as BodyInit, {
      headers: {
        'Content-Type': MIME[ext],
        'Content-Disposition': `inline; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox", // neutralize scripted PDFs/SVG tricks
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

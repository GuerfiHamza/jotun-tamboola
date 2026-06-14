import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { participants, invoices } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { checkCsrf } from '@/lib/csrf';

type Status = 'pending' | 'approved' | 'rejected';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminFromRequest())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, id),
  });
  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const participantInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.participant_id, id))
    .orderBy(desc(invoices.uploaded_at));

  return NextResponse.json({ participant, invoices: participantInvoices });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminFromRequest())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // BUG FIX: was `if (!checkCsrf(req))` — checkCsrf returns null on SUCCESS,
  // so legitimate requests were rejected and forged ones let through.
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const allowed: Status[] = ['pending', 'approved', 'rejected'];
  if (typeof body.status !== 'string' || !allowed.includes(body.status as Status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const newStatus = body.status as Status;

  await db
    .update(participants)
    .set({ status: newStatus, updated_at: new Date() })
    .where(eq(participants.id, id));

  // When an admin approves a participant, also mark their still-pending
  // invoices as accepted (admin approval is the authoritative decision).
  if (newStatus === 'approved') {
    await db
      .update(invoices)
      .set({ status: 'accepted' })
      .where(and(eq(invoices.participant_id, id), eq(invoices.status, 'pending')));
  }

  return NextResponse.json({ success: true });
}
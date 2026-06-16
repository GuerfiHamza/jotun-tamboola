import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { participants, invoices } from '@/lib/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
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

  // Same phone can have several registrations; group all their invoices here
  // so the admin sees every submission for that phone in one place.
  const submissions = await db
    .select({ id: participants.id, status: participants.status, created_at: participants.created_at, wilaya: participants.wilaya })
    .from(participants)
    .where(eq(participants.phone, participant.phone))
    .orderBy(desc(participants.created_at));

  const submissionIds = submissions.map(s => s.id);

  const participantInvoices = await db
    .select()
    .from(invoices)
    .where(inArray(invoices.participant_id, submissionIds))
    .orderBy(desc(invoices.uploaded_at));

  return NextResponse.json({ participant, invoices: participantInvoices, submissions });
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

  // Admin's participant-level decision is authoritative: cascade it to
  // every invoice on this submission, not just the still-pending ones.
  if (newStatus === 'approved' || newStatus === 'rejected') {
    await db
      .update(invoices)
      .set({ status: newStatus === 'approved' ? 'accepted' : 'rejected' })
      .where(eq(invoices.participant_id, id));
  }

  return NextResponse.json({ success: true });
}
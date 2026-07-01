import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { participants, invoices, accounts } from '@/lib/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { ownsParticipant, participantScope } from '@/lib/scope';
import { checkCsrf } from '@/lib/csrf';
import { logAction } from '@/lib/audit';

type Status = 'pending' | 'approved' | 'rejected';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acc = await getAdminFromRequest();
  if (!acc)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  if (!await ownsParticipant(acc, id))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, id),
  });
  if (!participant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Same phone can have several registrations; group all their invoices here
  // so the admin sees every submission for that phone in one place. Scoped to
  // this account so a store never sees another store's same-phone submissions.
  const scope = participantScope(acc);
  const submissions = await db
    .select({ id: participants.id, status: participants.status, created_at: participants.created_at, wilaya: accounts.nom_de_store,
              commercial_nom: participants.commercial_nom, commercial_prenom: participants.commercial_prenom })
    .from(participants)
    .innerJoin(accounts, eq(accounts.id, participants.account_id))
    .where(scope ? and(eq(participants.phone, participant.phone), scope) : eq(participants.phone, participant.phone))
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
  const acc = await getAdminFromRequest();
  if (!acc)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // BUG FIX: was `if (!checkCsrf(req))` — checkCsrf returns null on SUCCESS,
  // so legitimate requests were rejected and forged ones let through.
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  if (!await ownsParticipant(acc, id))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

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

  await logAction(acc, 'submission.status', `soumission #${id} → ${newStatus}`);
  return NextResponse.json({ success: true });
}

// DELETE a single submission (its invoices cascade). Stores may delete only
// their own; master may delete any. ponytail: invoice files on disk are left
// behind — add a sweeper if upload storage ever matters.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acc = await getAdminFromRequest();
  if (!acc)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  if (!await ownsParticipant(acc, id))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.delete(participants).where(eq(participants.id, id));
  await logAction(acc, 'submission.delete', `soumission #${id} supprimée`);
  return NextResponse.json({ success: true });
}
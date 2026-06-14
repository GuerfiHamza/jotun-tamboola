import { createHash } from 'crypto';
import sharp from 'sharp';
import { db } from '@/lib/db/index';
import { invoices } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

/**
 * Invoice de-duplication helpers.
 *
 * Three independent layers:
 *  #6 exactHash      — SHA-256 of the raw uploaded bytes. Hard signal: the
 *                      exact same file was already submitted.
 *  #7 perceptualHash — 64-bit dHash, robust to recompression/resize/minor
 *                      edits. Compared by Hamming distance.
 *  #8 contentKey     — normalized "vendor|invoice_no|date|amount" extracted
 *                      by Gemini. Catches two different photos of the same
 *                      physical invoice.
 *
 * Policy (see routes):
 *  - exactHash collision from a DIFFERENT participant  -> hard reject.
 *  - exactHash collision from the SAME participant      -> treated as a
 *    benign retry by the caller (no new row).
 *  - perceptualHash / contentKey collision             -> FLAG for admin
 *    review (status stays 'pending', never auto-anything), no hard reject,
 *    because OCR + perceptual matching can have false positives.
 */

// ---- #6 exact hash ---------------------------------------------------------

export function exactHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// ---- #7 perceptual hash (dHash, 64-bit) ------------------------------------

/**
 * dHash: downscale to 9x8 grayscale, compare each pixel to its right
 * neighbor -> 64 bits. Returned as a 16-char hex string.
 * PDFs can't be rasterized by sharp, so they return null (skip layer #7).
 */
export async function perceptualHash(
  buffer: Buffer,
  mime: string
): Promise<string | null> {
  if (mime === 'application/pdf') return null;
  try {
    const { data } = await sharp(buffer)
      .greyscale()
      .resize(9, 8, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // data is 9*8 = 72 bytes, one channel.
    // Build the 64-bit hash as 16 hex chars (4 bits at a time) to avoid
    // BigInt literals (project targets ES2017).
    let hex = '';
    let nibble = 0;
    let nibbleBits = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = data[row * 9 + col];
        const right = data[row * 9 + col + 1];
        nibble = (nibble << 1) | (left > right ? 1 : 0);
        nibbleBits++;
        if (nibbleBits === 4) {
          hex += nibble.toString(16);
          nibble = 0;
          nibbleBits = 0;
        }
      }
    }
    return hex.padStart(16, '0');
  } catch {
    return null;
  }
}

export function hammingDistance(a: string, b: string): number {
  // Compare as two 32-bit halves to avoid BigInt (ES2017 target).
  const popcount = (n: number) => {
    n = n - ((n >>> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
    n = (n + (n >>> 4)) & 0x0f0f0f0f;
    return (n * 0x01010101) >>> 24;
  };
  const aHi = parseInt(a.slice(0, 8), 16) >>> 0;
  const aLo = parseInt(a.slice(8, 16), 16) >>> 0;
  const bHi = parseInt(b.slice(0, 8), 16) >>> 0;
  const bLo = parseInt(b.slice(8, 16), 16) >>> 0;
  return popcount((aHi ^ bHi) >>> 0) + popcount((aLo ^ bLo) >>> 0);
}

// Two dHashes within this distance are considered the same image.
const PHASH_THRESHOLD = 8;

// ---- #8 content key --------------------------------------------------------

/** Build a normalized dedup key from Gemini-extracted invoice fields. */
export function buildContentKey(fields: {
  vendor?: unknown;
  invoice_no?: unknown;
  date?: unknown;
  amount?: unknown;
}): string | null {
  const norm = (v: unknown) =>
    typeof v === 'string' || typeof v === 'number'
      ? String(v).toLowerCase().replace(/\s+/g, '').trim()
      : '';

  const vendor = norm(fields.vendor);
  const invoiceNo = norm(fields.invoice_no);
  const date = norm(fields.date);
  const amount = norm(fields.amount);

  // Need at least an invoice number OR (vendor + amount) to be meaningful;
  // otherwise the key is too weak to dedup on.
  if (!invoiceNo && !(vendor && amount)) return null;

  return [vendor, invoiceNo, date, amount].join('|');
}

// ---- lookups ---------------------------------------------------------------

/** #6: does this exact file already exist? Returns the matching row, if any. */
export async function findExactDuplicate(hash: string) {
  const [row] = await db
    .select({ id: invoices.id, participant_id: invoices.participant_id })
    .from(invoices)
    .where(eq(invoices.file_hash, hash))
    .limit(1);
  return row ?? null;
}

/**
 * #7: scan existing perceptual hashes for a near-match (excluding the given
 * invoice id, e.g. the row we just inserted). Returns the first match or null.
 * For a contest with thousands of rows this in-app scan is fine.
 */
export async function findPerceptualDuplicate(
  phash: string,
  excludeInvoiceId?: number
) {
  const rows = await db
    .select({ id: invoices.id, perceptual_hash: invoices.perceptual_hash })
    .from(invoices)
    .where(
      excludeInvoiceId
        ? and(ne(invoices.id, excludeInvoiceId))
        : undefined
    );

  for (const r of rows) {
    if (!r.perceptual_hash) continue;
    if (r.perceptual_hash.length !== 16) continue;
    if (hammingDistance(phash, r.perceptual_hash) <= PHASH_THRESHOLD) {
      return { id: r.id };
    }
  }
  return null;
}

/** #8: does this content key already exist on another invoice? */
export async function findContentKeyDuplicate(
  key: string,
  excludeInvoiceId?: number
) {
  const rows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      excludeInvoiceId
        ? and(eq(invoices.content_key, key), ne(invoices.id, excludeInvoiceId))
        : eq(invoices.content_key, key)
    )
    .limit(1);
  return rows[0] ?? null;
}
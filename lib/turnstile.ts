/**
 * Cloudflare Turnstile server-side verification.
 *
 * Set TURNSTILE_SECRET_KEY in env. If it's unset, verification is SKIPPED
 * (returns true) so local/dev without Turnstile keeps working — set the key
 * in production to enforce it. The public site key goes in
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY for the widget.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(
  token: unknown,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured -> skip (dev)

  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return false;
  }

  try {
    const form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    if (remoteIp) form.append('remoteip', remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
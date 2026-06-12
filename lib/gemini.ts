import sharp from 'sharp';

// Escalation ladder: 3 models = 3 independent free-tier quotas.
// detailed prompt first on each, then simple prompt as last resort.
const PLAN: { model: string; simple: boolean }[] = [
  { model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash', simple: false },
  { model: 'gemini-2.0-flash',      simple: false },
  { model: 'gemini-2.0-flash-lite', simple: false },
  { model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash', simple: true },
  { model: 'gemini-2.0-flash-lite', simple: true },
];
// Backoff before each retry (background task -> we can afford minutes)
const DELAYS_MS = [15_000, 30_000, 60_000, 120_000];

type GeminiResult = { amount: number | null; raw: string; success: boolean; retryAfterMs?: number };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
].filter(Boolean) as string[];

function getKey(index: number) {
  return API_KEYS[index % API_KEYS.length];
}
async function normalizeImage(
  base64Data: string,
  mimeType: string
): Promise<{ base64Data: string; mimeType: string }> {
  // sharp can't process PDFs — send them to Gemini as-is
  if (mimeType === 'application/pdf') return { base64Data, mimeType };

  const buffer = Buffer.from(base64Data, 'base64');
  const meta = await sharp(buffer).metadata();
  console.log('[invoice] image metadata:', { width: meta.width, height: meta.height, orientation: meta.orientation, format: meta.format, inputSizeKB: Math.round(base64Data.length * 0.75 / 1024) });

  const normalized = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();

  console.log('[invoice] normalized image:', { outputSizeKB: Math.round(normalized.length / 1024) });

  return { base64Data: normalized.toString('base64'), mimeType: 'image/jpeg' };
}

async function callGemini(
  base64Data: string,
  mimeType: string,
  model: string,
  simple: boolean,
  attempt: number
): Promise<GeminiResult> {
  const apiKey = getKey(attempt);
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');

  console.log(`[invoice] attempt ${attempt} -> model=${model} prompt=${simple ? 'simple' : 'detailed'}`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const prompt = simple
    ? `Look at this invoice image. Find the TOTAL amount to pay (Total TTC, Net à Payer, المجموع, or sum of all line totals). Ignore Versement, Remise, Ancien/Nouveau Crédit. Digits may be Arabic-Indic — convert them. Reply ONLY with JSON: {"found":true,"amount":12345.00} or {"found":false,"amount":null}. No other text.`
    : `You are analyzing a photo of a commercial invoice, receipt, "bon de livraison" or handwritten bill from Algeria (paint products). The image has already been rotated to the correct orientation — read it as-is.

LANGUAGE & DIGITS:
- Text may be French, Arabic, English, or mixed.
- Digits may be Western (0-9) or Arabic-Indic (٠١٢٣٤٥٦٧٨٩) or handwritten — convert all to Western digits.
- Number formats: spaces or dots as thousands separators, comma or dot as decimals.
- Examples of valid amounts: "54 000.00", "17000,00", "5800-", "184 500.00 DA"
- Typical range: 1 000 to 1 000 000 DA.

WHAT TO EXTRACT — the TOTAL VALUE OF GOODS PURCHASED:
1. First look for an explicit grand total labeled: "Total", "Total TTC", "Montant Total", "Net à Payer", "المجموع", "الإجمالي", or the largest/final amount at the bottom of the amounts column, often boxed or underlined.
2. If NO explicit total is written (common on handwritten delivery slips), SUM the line-total column (rightmost amount column, one amount per product line).
3. DO NOT use these as the total — they are payment/credit bookkeeping:
   - "Versement" / "Verssement" (payment already made)
   - "Remise" (discount or running balance)
   - "Ancien Crédit" / "Nouveau Crédit"
   - "Reste"
   - Unit prices ("PU", "Prix-U")
   - Quantities
4. Cross-check: quantity × unit price ≈ line total, and line totals should sum ≈ grand total. If not, re-read.

Respond ONLY with valid JSON, no markdown, no explanation:
{"found":true,"amount":54000.00,"currency":"DZD","confidence":"high","source":"explicit_total"}

"source": "explicit_total" if a total line exists, "sum_of_lines" if you computed it.
"confidence": "high" if clearly legible, "medium" if handwriting was hard, "low" if any digit is uncertain.

If nothing is readable: {"found":false,"amount":null,"currency":null,"confidence":"none","source":null}`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64Data } },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      // Forces syntactically valid JSON — no fences, no truncation-repair hacks needed
      responseMimeType: 'application/json',
      // 2.5 models "think" by default and burn the token budget — disable it
      ...(model.startsWith('gemini-2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const retryAfter = res.headers.get('Retry-After');
    console.log(`[invoice] gemini error: status=${res.status}`, retryAfter ? `retry-after=${retryAfter}s` : '');
    return {
      amount: null,
      raw: `gemini_error_${res.status}`,
      success: false,
      // Honor Google's Retry-After on 429/503 (capped at 60s)
      retryAfterMs: retryAfter ? Math.min(Number(retryAfter) * 1000, 60_000) : undefined,
    };
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('') ?? '';
  const finishReason = data.candidates?.[0]?.finishReason;
  console.log(`[invoice] attempt ${attempt} raw response:`, text.slice(0, 300), 'finishReason:', finishReason);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const raw = (jsonMatch ? jsonMatch[0] : text).trim();

  try {
    const parsed = JSON.parse(raw);
    const amount = parsed.found ? Number(parsed.amount) : null;
    const ok = amount !== null && Number.isFinite(amount) && amount >= 0;
    console.log(`[invoice] attempt ${attempt} parsed:`, { found: parsed.found, amount, confidence: parsed.confidence, source: parsed.source });
    return { amount: ok ? amount : null, raw, success: parsed.found === true && ok };
  } catch {
    console.log(`[invoice] attempt ${attempt} JSON parse failed:`, raw.slice(0, 200));
    return { amount: null, raw: raw.slice(0, 1000), success: false };
  }
}

export async function analyzeInvoice(
  base64Data: string,
  mimeType: string
): Promise<GeminiResult> {
  console.log('[invoice] starting analyzeInvoice', { mimeType });

  let normalized: { base64Data: string; mimeType: string };
  try {
    normalized = await normalizeImage(base64Data, mimeType);
  } catch (e) {
    console.log('[invoice] normalizeImage failed, using original:', e);
    normalized = { base64Data, mimeType };
  }

  let last: GeminiResult = { amount: null, raw: 'not_attempted', success: false };

  for (let i = 0; i < PLAN.length; i++) {
    if (i > 0) {
      // Honor Google's Retry-After when given, otherwise exponential backoff
      const wait = last.retryAfterMs ?? DELAYS_MS[Math.min(i - 1, DELAYS_MS.length - 1)];
      console.log(`[invoice] waiting ${Math.round(wait / 1000)}s before attempt ${i + 1}...`);
      await sleep(wait);
    }
    const { model, simple } = PLAN[i];
    try {
      last = await callGemini(normalized.base64Data, normalized.mimeType, model, simple, i + 1);
    } catch (e) {
      console.log(`[invoice] attempt ${i + 1} threw:`, e);
      last = { amount: null, raw: `attempt_threw`, success: false };
    }
    if (last.success) {
      console.log(`[invoice] success on attempt ${i + 1} (${model}): ${last.amount}`);
      return last;
    }
  }

  console.log('[invoice] all attempts failed');
  return last;
}

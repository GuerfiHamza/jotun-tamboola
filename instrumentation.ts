// Runs ONCE when the Next.js server starts (dev & prod, Node runtime).
// Built-in scheduler: re-analyzes stuck invoices every 10 minutes —
// works on localhost and cPanel/Passenger with zero external cron setup.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Guard against double-registration (dev hot reload)
  const g = globalThis as typeof globalThis & { __reanalyzeScheduler?: boolean };
  if (g.__reanalyzeScheduler) return;
  g.__reanalyzeScheduler = true;

  const run = async () => {
    try {
      const { reanalyzeStuck } = await import('./lib/reanalyze');
      await reanalyzeStuck();
    } catch (e) {
      console.error('[reanalyze] scheduler error:', e);
    }
  };

  setTimeout(run, 60_000);            // first pass 1 min after boot
  setInterval(run, 10 * 60 * 1000);   // then every 10 minutes
  console.log('[reanalyze] scheduler started (every 10 min)');
}

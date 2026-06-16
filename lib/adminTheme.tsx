import type { Dictionary } from '@/lib/i18n/dictionaries';

export function getTheme(dark: boolean) {
  if (dark) return {
    page: '#08080f', panel: 'rgba(255,255,255,0.03)', panelAlt: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.07)', borderSub: 'rgba(255,255,255,0.06)',
    input: 'rgba(255,255,255,0.05)', text: '#f9fafb',
    sub: 'rgba(255,255,255,0.5)', muted: 'rgba(255,255,255,0.35)', faint: 'rgba(255,255,255,0.2)',
    headerBg: 'rgba(8,8,15,0.92)', rowHover: 'rgba(255,255,255,0.03)',
    cardBg: 'rgba(255,255,255,0.04)', selectBg: '#0f0f1c',
  } as const;
  return {
    page: '#f3f3fa', panel: '#ffffff', panelAlt: '#f8f8fd',
    border: 'rgba(0,0,0,0.09)', borderSub: 'rgba(0,0,0,0.06)',
    input: 'rgba(0,0,0,0.04)', text: '#0d0d1a',
    sub: 'rgba(0,0,0,0.55)', muted: 'rgba(0,0,0,0.4)', faint: 'rgba(0,0,0,0.25)',
    headerBg: 'rgba(243,243,250,0.95)', rowHover: 'rgba(0,0,0,0.025)',
    cardBg: 'rgba(0,0,0,0.03)', selectBg: '#ffffff',
  } as const;
}
export type Theme = ReturnType<typeof getTheme>;

export const ADMIN_THEME_KEY = 'jotun-admin-theme';

export function ThemeToggle({ dark, onToggle, dict }: { dark: boolean; onToggle: () => void; dict: Dictionary }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
      style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
      aria-label={dark ? dict.landing.themeToggle.toLight : dict.landing.themeToggle.toDark}
    >
      {dark ? (
        <svg style={{ width: 18, height: 18 }} className="text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
        </svg>
      ) : (
        <svg style={{ width: 18, height: 18 }} className="text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}

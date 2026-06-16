import 'server-only';
import type { Locale } from '../locale';
import type { Dictionary } from './fr';

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  fr: () => import('./fr').then((m) => m.default),
  ar: () => import('./ar').then((m) => m.default),
};

export const getDictionary = (locale: Locale): Promise<Dictionary> => dictionaries[locale]();

export type { Dictionary };

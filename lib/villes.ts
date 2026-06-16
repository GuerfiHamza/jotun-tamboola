import raw from '../districts.json';

// wilayaCode = first 2 chars of county_code (e.g. "0101" → "01" = wilaya 01)
export const VILLES: { value: string; ar: string; wilayaCode: string }[] = raw.map(d => ({
  value: d.name,
  ar: d.ar_name,
  wilayaCode: d.county_code.slice(0, 2),
}));

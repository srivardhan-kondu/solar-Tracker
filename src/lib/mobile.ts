/**
 * Indian mobile numbers: 10 digits starting with 6, 7, 8 or 9, with or without +91 / 0 in front.
 * Returns the number written the way the app shows it ("+91 98765 43210"), or null if it is not valid.
 */
export const normalizeMobile = (input: string): string | null => {
  let d = input.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return null;
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
};

/** Same number, however it is written */
export const sameMobile = (a?: string, b?: string) => !!a && !!b && a.replace(/\D/g, '').slice(-10) === b.replace(/\D/g, '').slice(-10);

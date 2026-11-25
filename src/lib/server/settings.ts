import 'server-only';

/**
 * Switches set in the server settings (Vercel → Settings → Environment Variables).
 * A change takes effect after the next deploy (Vercel → Deployments → Redeploy).
 */

/**
 * SURVEY_VILLAGE_CHECK: must survey photos be taken inside the installer's approved villages?
 * - true (or not set): yes, as normal.
 * - false: on hold. Installers can survey in any village, mandal or district, and do not need
 *   villages from the office. Every photo still needs a fresh, precise GPS location, which is
 *   printed on it and kept in its signed record. Installation photos are always checked.
 */
export const surveyVillageCheck = () => {
  const v = (process.env.SURVEY_VILLAGE_CHECK ?? '').trim().toLowerCase();
  return !['false', '0', 'off', 'no'].includes(v);
};

/** What the phone needs to know */
export const appSettings = () => ({ surveyVillageCheck: surveyVillageCheck() });

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
/** On unless set to false / 0 / off / no */
const onUnlessOff = (name: string) => !['false', '0', 'off', 'no'].includes((process.env[name] ?? '').trim().toLowerCase());

export const surveyVillageCheck = () => onUnlessOff('SURVEY_VILLAGE_CHECK');

/**
 * INSTALLER_NEW_SURVEY: may installers start a survey on their own ("New survey")?
 * - true (or not set): yes. They fill in the applicant's details and survey any home.
 * - false: no. Only homes the office assigns are surveyed, as before. Homes installers
 *   already took keep their surveys; the office can reassign them as usual.
 */
export const installerNewSurvey = () => onUnlessOff('INSTALLER_NEW_SURVEY');

/** What the phone needs to know */
export const appSettings = () => ({ surveyVillageCheck: surveyVillageCheck(), installerNewSurvey: installerNewSurvey() });

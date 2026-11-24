/** Rules every photo must meet. Shared by the camera (phone) and the server. */

/** The shutter works only when the location is at least this accurate (metres) */
export const MAX_PHOTO_ACCURACY_M = 20;

/** A location reading older than this is not used */
export const MAX_FIX_AGE_MS = 30 * 1000;

/** A photo sent this long after it was taken is flagged for the office */
export const LATE_UPLOAD_MS = 24 * 60 * 60 * 1000;

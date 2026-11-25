/**
 * Demo or production. The same code runs both; each Vercel project sets NEXT_PUBLIC_APP_MODE.
 *
 * Demo (NEXT_PUBLIC_APP_MODE=demo): sample data, "Reset demo" button, DEMO_PIN for first sign-in.
 * Production (anything else, including not set): starts empty, no sample data anywhere,
 * no reset, no shared PIN. Not set means production, so a missing setting can never
 * put sample data into the live system.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_APP_MODE === 'demo';

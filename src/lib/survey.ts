import { Consumer, Installation, RoofType, ShadeLevel, SiteSurvey } from '@/types';
import { noTranslate, Translate } from '@/i18n/LanguageContext';

export const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: 'Concrete', label: 'Concrete roof' },
  { value: 'Mud', label: 'Mud roof' },
  { value: 'Sheds', label: 'Sheds' },
  { value: 'Metal sheets', label: 'Metal sheets' },
];

export const SHADE_LEVELS: { value: ShadeLevel; label: string; hint: string }[] = [
  { value: 'None', label: 'No shade', hint: 'Sun falls on the roof all day' },
  { value: 'Some', label: 'Some shade', hint: 'Shade on part of the roof, part of the day' },
  { value: 'Heavy', label: 'A lot of shade', hint: 'Roof is in shade for many hours' },
];

export const SHADE_SOURCES = ['Trees', 'Nearby buildings', 'Water tank', 'Electric poles or wires', 'Hills', 'Other'];

/** How many roof / surroundings photos are allowed */
export const MAX_EXTRA_PHOTOS = 4;

export const surveyFor = (surveys: SiteSurvey[], consumerNumber: string) =>
  surveys.find((s) => s.consumerNumber === consumerNumber);

/**
 * A home can be installed only after a survey said "Feasible".
 * Homes whose installation was already started (before surveys existed) are allowed to carry on.
 */
export const canInstall = (surveys: SiteSurvey[], installations: Installation[], consumerNumber: string) => {
  const s = surveyFor(surveys, consumerNumber);
  if (s?.status === 'Submitted') return s.decision === 'Feasible';
  return installations.some((i) => i.consumerNumber === consumerNumber);
};

// Jobs already sent or finished
const CLOSED_STATUSES = ['Completed', 'Received by Server', 'Saved Locally', 'Waiting to Sync'];

/** Still waiting for a site survey: not surveyed yet, and installation not already under way. */
export const needsSurvey = (c: Consumer, surveys: SiteSurvey[], installations: Installation[]) =>
  !CLOSED_STATUSES.includes(c.status) &&
  surveyFor(surveys, c.consumerNumber)?.status !== 'Submitted' &&
  !installations.some((i) => i.consumerNumber === c.consumerNumber);

/**
 * Office staff can reopen a sent survey only while installation has not started.
 * Returns the reason it cannot be reopened, or null when it can.
 */
export const reopenBlocker = (
  s: SiteSurvey | undefined,
  consumer: Consumer | undefined,
  installations: Installation[],
  t: Translate = noTranslate
): string | null => {
  if (!s || s.status !== 'Submitted') return t('This survey has not been sent yet.');
  if (
    installations.some((i) => i.consumerNumber === s.consumerNumber) ||
    (consumer && !['Assigned', 'Downloaded'].includes(consumer.status))
  )
    return t('Installation has already started at this home, so the survey cannot be reopened.');
  return null;
};

/** Everything still needed before the survey can be sent. Empty list = ready. */
export const surveyMissing = (s: SiteSurvey | undefined, t: Translate = noTranslate): string[] => {
  if (!s) return [t('Survey not started')];
  const out: string[] = [];
  if (!s.billPhoto) out.push(t('Electricity bill photo'));
  if (!s.aadhaarPhoto) out.push(t('Aadhaar card photo'));
  if (!s.roofType) out.push(t('Type of roof'));
  if (s.roofPhotos.length === 0) out.push(t('At least 1 roof photo'));
  if (!s.shadeLevel) out.push(t('Shade on the roof'));
  if (s.shadeLevel && s.shadeLevel !== 'None' && s.shadeSources.length === 0) out.push(t('What is causing the shade'));
  if (s.surroundingsPhotos.length === 0) out.push(t('At least 1 photo of the surroundings'));
  if (!s.decision) out.push(t('Your decision: Feasible or Not feasible'));
  if (s.decision === 'Not Feasible' && !s.decisionNote?.trim()) out.push(t('Reason why it is not feasible'));
  return out;
};

/**
 * Shrink a photo from the camera so it fits in the phone's storage.
 * Returns a JPEG data URL, at most `maxSide` pixels on the longer side.
 */
export const shrinkPhoto = (file: File, maxSide = 900, quality = 0.6): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

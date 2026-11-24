import { Installation, PhotoCategory } from '@/types';
import { noTranslate, Translate } from '@/i18n/LanguageContext';
import { hasGeo } from '@/lib/geoPhoto';

export const REQUIRED_PHOTOS: PhotoCategory[] = [
  'front',
  'side',
  'consumer',
  'meter',
  'inverter',
  'structure',
  'earthing',
];

export const PHOTO_LABELS: Record<PhotoCategory, string> = {
  front: 'Front view',
  side: 'Side view',
  consumer: 'Consumer with system',
  meter: 'Net meter',
  inverter: 'Inverter',
  structure: 'Structure',
  earthing: 'Earthing',
};

export const panelsDone = (d: Installation | null) => (d?.panels.filter((p) => p.trim() !== '').length ?? 0);
/** Photos taken with a location. A photo without one does not count. */
export const photosDone = (d: Installation | null) => REQUIRED_PHOTOS.filter((c) => hasGeo(d?.photos?.[c])).length;

/**
 * The steps of an installation:
 * 1 check the home and details, 2 panels, 3 inverter, 4 photos, 5 location, 6 check and send.
 */
export const TOTAL_STEPS = 6;

/** Whether the work for a step (1–6) is actually finished, based on the data, not the step number. */
export const isStepDone = (d: Installation | null, step: number): boolean => {
  if (!d) return false;
  switch (step) {
    case 1:
      return d.consumerConfirmed;
    case 2:
      return panelsDone(d) === 4;
    case 3:
      return d.inverterSerial.trim() !== '';
    case 4:
      return photosDone(d) === REQUIRED_PHOTOS.length;
    case 5:
      return !!d.gps;
    default:
      return false;
  }
};

/** The first step that still needs work, to reopen a saved job in the right place */
export const resumeStep = (d: Installation | null): number => {
  if (!d) return 1;
  for (let s = 1; s < TOTAL_STEPS; s++) if (!isStepDone(d, s)) return s;
  return TOTAL_STEPS;
};

/** Plain-language message telling the user what is still needed on a step, or null when it is done. */
export const stepBlocker = (d: Installation | null, step: number, t: Translate = noTranslate): string | null => {
  if (isStepDone(d, step)) return null;
  switch (step) {
    case 1:
      return t('Please check the details with the consumer and tap Confirm.');
    case 2:
      return t('Scan all 4 panels to continue ({n} of 4 done).', { n: panelsDone(d) });
    case 3:
      return t('Scan the inverter to continue.');
    case 4:
      return t('Take all 7 photos to continue ({n} of 7 done).', { n: photosDone(d) });
    case 5:
      return t('Capture the location to continue.');
    default:
      return null;
  }
};

/** Everything still missing before the installation can be submitted. */
export const missingItems = (d: Installation | null, t: Translate = noTranslate): string[] => {
  if (!d) return [t('No installation started')];
  const out: string[] = [];
  if (!d.consumerConfirmed) out.push(t('Consumer details not confirmed'));
  if (panelsDone(d) < 4) out.push(t('{n} panel(s) not scanned', { n: 4 - panelsDone(d) }));
  if (!d.inverterSerial.trim()) out.push(t('Inverter not scanned'));
  const missingPhotos = REQUIRED_PHOTOS.filter((c) => !hasGeo(d.photos?.[c])).map((c) => t(PHOTO_LABELS[c]));
  if (missingPhotos.length) out.push(t('Photos missing: {list}', { list: missingPhotos.join(', ') }));
  if (!d.gps) out.push(t('Location not captured'));
  return out;
};

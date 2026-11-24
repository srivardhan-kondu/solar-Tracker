import { Installation, PhotoCategory } from '@/types';

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
export const photosDone = (d: Installation | null) => REQUIRED_PHOTOS.filter((c) => d?.photos?.[c]).length;

/** Whether the work for a step (1–7) is actually finished, based on the data, not the step number. */
export const isStepDone = (d: Installation | null, step: number): boolean => {
  if (!d) return false;
  switch (step) {
    case 1:
      return true; // consumer chosen
    case 2:
      return d.consumerConfirmed;
    case 3:
      return panelsDone(d) === 4;
    case 4:
      return d.inverterSerial.trim() !== '';
    case 5:
      return photosDone(d) === REQUIRED_PHOTOS.length;
    case 6:
      return !!d.gps;
    default:
      return false;
  }
};

/** Plain-language message telling the user what is still needed on a step, or null when it is done. */
export const stepBlocker = (d: Installation | null, step: number): string | null => {
  if (isStepDone(d, step)) return null;
  switch (step) {
    case 2:
      return 'Please check the details with the consumer and tap Confirm.';
    case 3:
      return `Scan all 4 panels to continue (${panelsDone(d)} of 4 done).`;
    case 4:
      return 'Scan the inverter to continue.';
    case 5:
      return `Take all 7 photos to continue (${photosDone(d)} of 7 done).`;
    case 6:
      return 'Capture the location to continue.';
    default:
      return null;
  }
};

/** Everything still missing before the installation can be submitted. */
export const missingItems = (d: Installation | null): string[] => {
  if (!d) return ['No installation started'];
  const out: string[] = [];
  if (!d.consumerConfirmed) out.push('Consumer details not confirmed');
  if (panelsDone(d) < 4) out.push(`${4 - panelsDone(d)} panel(s) not scanned`);
  if (!d.inverterSerial.trim()) out.push('Inverter not scanned');
  const missingPhotos = REQUIRED_PHOTOS.filter((c) => !d.photos?.[c]).map((c) => PHOTO_LABELS[c]);
  if (missingPhotos.length) out.push(`Photos missing: ${missingPhotos.join(', ')}`);
  if (!d.gps) out.push('Location not captured');
  return out;
};

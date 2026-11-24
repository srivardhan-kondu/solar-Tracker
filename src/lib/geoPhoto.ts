import { GeoTag } from '@/types';
import { MAX_PHOTO_ACCURACY_M } from '@/lib/photoRules';

/**
 * A photo counts only if it carries a location.
 * Built-in sample pictures (demo data only) are the one exception.
 */
export const hasGeo = (p?: { url: string; geo?: GeoTag }) =>
  !!p &&
  (p.url.startsWith('/samples/') ||
    (!!p.geo && typeof p.geo.takenAt === 'number' && p.geo.accuracy <= MAX_PHOTO_ACCURACY_M));

export const formatGeo = (g: GeoTag) =>
  `${g.latitude.toFixed(6)}, ${g.longitude.toFixed(6)} (±${Math.round(g.accuracy)} m)`;

/** Distance in metres between two points on the earth */
export const distanceMetres = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

export const mapsLink = (g: GeoTag) => `https://www.google.com/maps/search/?api=1&query=${g.latitude},${g.longitude}`;

const stampTime = (d: Date) =>
  d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/**
 * Take the current camera frame, shrink it, and print the location stamp on it.
 * The stamp is part of the picture, so it stays with the photo wherever it goes.
 */
export const captureStampedFrame = (
  video: HTMLVideoElement,
  geo: { latitude: number; longitude: number; accuracy: number },
  label: string,
  takenAt: number,
  clockChecked: boolean,
  maxSide = 1280,
  quality = 0.72
): { url: string; capturedAt: string } => {
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(video, 0, 0, w, h);

  const now = new Date(takenAt);
  const lines = [
    label,
    `Lat ${geo.latitude.toFixed(6)}  Long ${geo.longitude.toFixed(6)}  ±${Math.round(geo.accuracy)} m`,
    `${stampTime(now)} IST${clockChecked ? '' : '  (phone clock, offline)'}`,
  ];
  const font = Math.max(14, Math.round(w / 38));
  const pad = Math.round(font * 0.6);
  const band = lines.length * font * 1.3 + pad * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, h - band, w, band);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? 'bold ' : ''}${font}px Arial, sans-serif`;
    ctx.fillText(line, pad, h - band + pad + i * font * 1.3, w - pad * 2);
  });

  return {
    url: canvas.toDataURL('image/jpeg', quality),
    capturedAt: now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
  };
};

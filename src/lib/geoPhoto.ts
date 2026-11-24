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
 * The location stamp: a dark band across the bottom with large white text.
 * One text size is chosen so the longest line fills the full width; every line is then
 * spread from the left edge to the right edge. The band is kept to at most 40% of the photo.
 */
const drawStamp = (ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[][]) => {
  const FONT = (size: number, bold: boolean) => `${bold ? 'bold ' : ''}${size}px Arial, Helvetica, sans-serif`;
  const LINE_HEIGHT = 1.22;
  const MAX_BAND_SHARE = 0.4;
  const pad = Math.max(8, Math.round(w * 0.025));
  const usable = w - pad * 2;

  // Natural width of each line at 100px, with at least one "em" between its parts
  const naturalWidth = (parts: string[], bold: boolean) => {
    ctx.font = FONT(100, bold);
    return parts.reduce((sum, part) => sum + ctx.measureText(part).width, 0) + (parts.length - 1) * 100;
  };
  const widest = Math.max(...lines.map((parts, i) => naturalWidth(parts, i === 0)));
  let font = Math.floor((usable / widest) * 100);
  // Not taller than the allowed band
  const maxByHeight = Math.floor((h * MAX_BAND_SHARE - pad * 2) / (lines.length * LINE_HEIGHT));
  font = Math.max(12, Math.min(font, maxByHeight));

  const lineH = Math.round(font * LINE_HEIGHT);
  const band = lines.length * lineH + pad * 2;
  const top = h - band;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, top, w, band);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';

  lines.forEach((parts, i) => {
    ctx.font = FONT(font, i === 0);
    const y = top + pad + i * lineH + lineH / 2;
    const widths = parts.map((part) => ctx.measureText(part).width);
    const total = widths.reduce((a, b) => a + b, 0);
    if (parts.length === 1 || total >= usable) {
      // One part, or too long to spread: start at the left, squeezed to fit if needed
      ctx.fillText(parts.join('  '), pad, y, usable);
      return;
    }
    const gap = (usable - total) / (parts.length - 1);
    let x = pad;
    parts.forEach((part, j) => {
      ctx.fillText(part, x, y);
      x += widths[j] + gap;
    });
  });
};

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
  const [consumer, ...rest] = label.split(' · ');
  // Each line is a few parts spread from the left edge to the right edge
  const lines: string[][] = [
    [`Lat ${geo.latitude.toFixed(6)}`, `Long ${geo.longitude.toFixed(6)}`],
    [`±${Math.round(geo.accuracy)} m`, `${stampTime(now)} IST`, ...(clockChecked ? [] : ['(phone clock, offline)'])],
    rest.length ? [consumer, rest.join(' · ')] : [consumer],
  ];
  drawStamp(ctx, w, h, lines);

  return {
    url: canvas.toDataURL('image/jpeg', quality),
    capturedAt: now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
  };
};

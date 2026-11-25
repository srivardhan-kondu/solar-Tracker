import { Village } from '@/types';
import { distanceMetres } from '@/lib/geoPhoto';

/**
 * Geofence: is the phone inside one of the villages it may work in?
 * Shared by the phone and the server, so both apply the same rule. No map service is used:
 * each village is a centre point and a radius, and the distance is worked out here.
 */

export const DEFAULT_RADIUS_M = 2000;
export const MIN_RADIUS_M = 200;
export const MAX_RADIUS_M = 20000;

type Fix = { latitude: number; longitude: number; accuracy: number };

/** How far outside the village circle a GPS reading is, in metres (0 when inside). The reading's own error counts in its favour. */
export const metresOutside = (v: Pick<Village, 'latitude' | 'longitude' | 'radiusM'>, fix: Fix) =>
  Math.max(0, distanceMetres(v, fix) - fix.accuracy - v.radiusM);

export type VillageCheck =
  | { inside: Village }
  | { inside: null; nearest: { village: Village; metres: number } | null };

/** Which of these villages the phone is in, or the nearest one and how far away it is */
export const checkVillages = (fix: Fix, villages: Village[]): VillageCheck => {
  let nearest: { village: Village; metres: number } | null = null;
  for (const v of villages) {
    const out = metresOutside(v, fix);
    if (out === 0) return { inside: v };
    if (!nearest || out < nearest.metres) nearest = { village: v, metres: out };
  }
  return { inside: null, nearest };
};

export const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Check, Loader2, MapPin, RotateCcw, X } from 'lucide-react';
import { useLang } from '@/i18n/LanguageContext';
import { GeoTag } from '@/types';
import { captureStampedFrame } from '@/lib/geoPhoto';
import { MAX_FIX_AGE_MS, MAX_PHOTO_ACCURACY_M } from '@/lib/photoRules';

export interface CapturedPhoto {
  url: string;
  capturedAt: string;
  geo: GeoTag;
}

type Fix = { latitude: number; longitude: number; accuracy: number; at: number };


/**
 * Full-screen camera inside the app. This is the only way to add a photo:
 * there is no file picker, so photos cannot be uploaded from the phone's gallery or a computer.
 * The shutter works only once the phone knows where it is, and the location is printed on the photo.
 */
export const CameraCapture: React.FC<{
  /** Printed on the photo, e.g. "AP-GNT-2026-003 · Roof photo 1" */
  stampLabel: string;
  /** The consumer's address, printed on the photo under the location */
  stampAddress?: string;
  title: string;
  onCapture: (photo: CapturedPhoto) => void;
  onClose: () => void;
}> = ({ stampLabel, stampAddress, title, onCapture, onClose }) => {
  const { t } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [shot, setShot] = useState<CapturedPhoto | null>(null);
  const [now, setNow] = useState(Date.now());
  // Difference between the server's clock and the phone's, so the printed time cannot be faked by changing the phone clock
  const [clockOffset, setClockOffset] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sent = Date.now();
    fetch('/api/time', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ now: serverNow }: { now: number }) => {
        const got = Date.now();
        if (!cancelled) setClockOffset(serverNow + (got - sent) / 2 - got);
      })
      .catch(() => undefined); // offline: the phone clock is used and the photo says so
    return () => {
      cancelled = true;
    };
  }, []);

  // Camera
  useEffect(() => {
    setCameraReady(false);
    setCameraError(null);
    if (!window.isSecureContext) {
      setCameraError(t('The camera only works on a secure (https) link. Ask the office for the correct app link.'));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('This browser cannot use the camera. Please open the app in Chrome.'));
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then(async (s) => {
        if (cancelled) return s.getTracks().forEach((tr) => tr.stop());
        stream = s;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = s;
        await v.play().catch(() => undefined);
        setCameraReady(true);
      })
      .catch((e: DOMException) => {
        if (cancelled) return;
        setCameraError(
          e?.name === 'NotAllowedError'
            ? t('Camera permission is off. Allow the camera for this app in your browser settings, then tap Try again.')
            : e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError'
            ? t('No camera was found on this device.')
            : t('The camera could not be started. Close other apps that use the camera, then tap Try again.')
        );
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Location: keep following it while the camera is open
  useEffect(() => {
    setGeoError(null);
    setGeoBlocked(false);
    if (!navigator.geolocation) {
      setGeoBlocked(true);
      setGeoError(t('This device cannot find its location, so photos cannot be taken.'));
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        setFix({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, at: Date.now() });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoBlocked(true);
          setGeoError(t('Location permission is off. Every photo must have a location, so allow location for this app in your browser settings, then tap Try again.'));
        } else {
          setGeoError(t('Still finding your location. Turn on location (GPS) on the phone and stand in the open if you can.'));
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Tick so an old location is noticed
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const recentFix = fix && now - fix.at < MAX_FIX_AGE_MS ? fix : null;
  // Only a precise, fresh location is printed on a photo
  const freshFix = recentFix && recentFix.accuracy <= MAX_PHOTO_ACCURACY_M ? recentFix : null;
  const canShoot = cameraReady && !!freshFix && !shot;

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v || !freshFix || !v.videoWidth) return;
    try {
      const clockChecked = clockOffset !== null;
      const takenAt = Date.now() + (clockOffset ?? 0);
      const { url, capturedAt } = captureStampedFrame(v, freshFix, stampLabel, takenAt, clockChecked, stampAddress);
      setShot({
        url,
        capturedAt,
        geo: {
          latitude: freshFix.latitude,
          longitude: freshFix.longitude,
          accuracy: freshFix.accuracy,
          capturedAt,
          takenAt,
          clockChecked,
        },
      });
    } catch {
      setCameraError(t('The photo could not be taken. Please try again.'));
    }
  };

  const retry = () => {
    setShot(null);
    setFix(null);
    setAttempt((n) => n + 1);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black text-white flex flex-col" role="dialog" aria-modal="true" aria-label={title}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-black/80">
        <div className="min-w-0">
          <div className="text-base font-bold truncate">{title}</div>
          <div className="text-sm text-slate-300 truncate">{stampLabel}</div>
          {stampAddress && <div className="text-xs text-slate-400 truncate">{stampAddress}</div>}
        </div>
        <button onClick={onClose} aria-label={t('Close camera')} className="w-12 h-12 flex-shrink-0 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera view or taken photo */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`max-w-full max-h-full object-contain ${shot || cameraError ? 'hidden' : ''}`}
        />
        {shot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.url} alt={title} className="max-w-full max-h-full object-contain" />
        )}
        {!cameraReady && !cameraError && !shot && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300" role="status">
            <Loader2 className="w-10 h-10 animate-spin" />
            {t('Starting camera…')}
          </div>
        )}
        {cameraError && (
          <div className="max-w-md mx-4 p-5 rounded-2xl bg-white text-slate-900 space-y-3 text-center" role="alert">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-600" />
            <p className="text-base font-semibold">{cameraError}</p>
            <button onClick={retry} className="px-5 py-3 bg-brand-600 text-white rounded-xl text-base font-bold">
              {t('Try again')}
            </button>
          </div>
        )}
      </div>

      {/* Location status */}
      <div
        className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 ${
          freshFix ? 'bg-emerald-700' : geoBlocked ? 'bg-red-700' : 'bg-amber-600'
        }`}
        role="status"
      >
        <MapPin className="w-5 h-5 flex-shrink-0" />
        {freshFix ? (
          <span>
            {t('Location found')}: {freshFix.latitude.toFixed(5)}, {freshFix.longitude.toFixed(5)} · ±{Math.round(freshFix.accuracy)} m
          </span>
        ) : recentFix ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            {t('Signal not strong enough yet (±{m} m). Need ±{max} m or better — move to an open spot.', {
              m: Math.round(recentFix.accuracy),
              max: MAX_PHOTO_ACCURACY_M,
            })}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {!geoBlocked && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
            {geoError || t('Finding your location… Photos need a location.')}
          </span>
        )}
        {geoBlocked && (
          <button onClick={retry} className="ml-auto px-3 py-1.5 bg-white text-red-800 rounded-lg font-bold">
            {t('Try again')}
          </button>
        )}
      </div>

      {/* Buttons */}
      <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-black/90 flex items-center justify-center gap-3">
        {shot ? (
          <>
            <button onClick={() => setShot(null)} className="flex-1 max-w-[200px] py-3.5 rounded-xl border-2 border-white/60 text-base font-bold flex items-center justify-center gap-2">
              <RotateCcw className="w-5 h-5" />
              {t('Take again')}
            </button>
            <button onClick={() => onCapture(shot)} className="flex-1 max-w-[200px] py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-base font-bold flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              {t('Use this photo')}
            </button>
          </>
        ) : (
          <button
            onClick={takePhoto}
            disabled={!canShoot}
            aria-label={t('Take photo')}
            className="w-20 h-20 rounded-full border-4 border-white bg-white/20 enabled:hover:bg-white/40 disabled:opacity-40 flex items-center justify-center"
          >
            <Camera className="w-9 h-9" />
          </button>
        )}
      </div>
    </div>
  );
};

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Eraser, FileSignature, Printer, X } from 'lucide-react';
import { useLang } from '@/i18n/LanguageContext';
import { Consumer, SurveyConsent } from '@/types';
import { COMPANY } from '@/lib/company';
import { consentMissing } from '@/lib/survey';

const btnPrimary =
  'px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed';
const btnBack =
  'px-5 py-3 border border-slate-300 bg-white rounded-xl text-base font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2';

/** Address to start from, so the installer only needs to add the house details */
export const defaultAddress = (c?: Consumer) =>
  c ? [c.village, c.mandal && `${c.mandal} Mandal`, c.district && `${c.district} District`].filter(Boolean).join(', ') : '';

const dateOf = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/* ---------- The form itself (always in Telugu: it is the official APSPDCL wording) ---------- */

const Blank: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <span className="inline-block min-w-[6rem] px-1.5 border-b border-dotted border-slate-500 font-bold text-slate-900 text-center">
    {children || ' '}
  </span>
);

export const ConsentDocument: React.FC<{
  consumer?: Consumer;
  consumerNumber: string;
  consent: SurveyConsent;
  /** Shown in place of the signature, e.g. the signing pad */
  signatureSlot?: React.ReactNode;
  collectedBy?: string;
}> = ({ consumer, consumerNumber, consent, signatureSlot, collectedBy }) => {
  const cap = consumer?.capacityKw ? `${consumer.capacityKw} కిలో వాట్ పీక్` : '';
  const area = consent.roofAreaSqFt ? String(consent.roofAreaSqFt) : '';
  const aadhaar = consent.aadhaarLast4 ? `XXXX XXXX ${consent.aadhaarLast4}` : '';
  const rows: [string, React.ReactNode][] = [
    ['వినియోగదారుని పేరు', consumer?.name],
    ['వినియోగదారుని సర్వీస్ నంబర్', consumerNumber],
    ['వినియోగదారుని ఆధార్ సంఖ్య', aadhaar],
    [
      'కులం',
      <span key="caste" className="space-x-3">
        {(['SC', 'ST'] as const).map((c) => (
          <span key={c} className={consent.caste === c ? 'px-2 border-2 border-slate-900 rounded-full font-bold' : 'text-slate-400 line-through'}>
            {c}
          </span>
        ))}
      </span>,
    ],
    ['చిరునామా', consent.address],
    ['మొబైల్ నంబర్', consumer?.mobile],
    ['తేదీ', dateOf(consent.signedAt)],
  ];

  return (
    <div lang="te" className="bg-white text-slate-900 text-[15px] leading-8 space-y-3">
      <h2 className="text-center text-xl font-bold underline underline-offset-4">వినియోగదారుని అంగీకార పత్రం</h2>
      <p className="text-justify">
        నేను <Blank>{consumer?.name}</Blank> (పేరు), నా విద్యుత్ సర్వీస్ నంబర్ <Blank>{consumerNumber}</Blank> కలిగి{' '}
        <Blank>{consent.address}</Blank> చిరునామా వద్ద నివసిస్తున్నాను.
      </p>
      <p className="text-justify">
        నేను నా ఇంటి పైకప్పుని <Blank>{cap}</Blank> సామర్థ్యం కలిగిన రూఫ్ టాప్ సోలార్ (ఆర్టీఎస్) ఫోటో వోల్టాయిక్ (పివి) ప్లాంటును
        ఆంధ్రప్రదేశ్ దక్షిణ ప్రాంత విద్యుత్ పంపిణీ సంస్థ (ఏపీఎస్పీడీసీఎల్) వారి పవర్ గ్రిడ్ కు అనుసంధానించేందుకు అనుమతిస్తున్నాను. పిఎం
        సూర్య ఘర్ ముఫ్త్ బిజిలీ యోజన క్రింద యుటిలిటీ లెడ్ అగ్రిగేషన్ – క్యాపెక్స్ మోడల్ లో ఆపరేషన్ మరియు నిర్వహణ పనుల నిమిత్తం 12
        సంవత్సరాల పాటు నిర్వహించుకునేందుకు <span className="text-red-700">నా ఇంటి పైకప్పును</span> <Blank>{area}</Blank>{' '}
        <span className="text-red-700">చదరపు అడుగులు మేరకు</span> ఏపీఎస్పీడీసీఎల్ వారికి అద్దెకు ఇస్తున్నాను.
      </p>
      <p className="text-center font-bold">ఈ క్రింద పొందుపరచిన అన్ని విషయాలకు లోబడి ఉంటానని అంగీకరిస్తున్నాను.</p>
      <ol className="space-y-2 text-justify">
        <li>
          1) నా ఇంటి నివాసం పైకప్పుపై <Blank>{cap}</Blank> సామర్థ్యం గల సౌర ఫలకాల ప్లాంటు ను ఏర్పాటు చేయడానికి నేను ఏపీఎస్పీడీసీఎల్
          వారికి నా సమ్మతిని తెలియచేస్తున్నాను.
        </li>
        <li>
          2) ఇంటి నివాసం పైకప్పుపై సౌర ఫలకాల ప్లాంటు యొక్క స్థాపన, ఆపరేషన్ మరియు నిర్వహణ కోసం నా ఇంటి మిద్దెను ఉదయం 9 గంటల నుంచి
          సాయంత్రం 5 గంటల వరకు వినియోగించుకొనేందుకు నేను ఏపీఎస్పీడీసీఎల్ వారికి లేదా అధీకృత ఈపిసి కాంట్రాక్టరు / ఆర్టీఎస్ విక్రేత వారికి
          నా సమ్మతిని తెలియచేస్తున్నాను.
        </li>
        <li>
          3) ఇంటి నివాసం పైకప్పుపై సౌర ఫలకాల ప్లాంటు ను నిర్మించేందుకు నా ఇంటి పైకప్పును వినియోగించుకునేందుకు ఏపీఎస్పీడీసీఎల్ ద్వారా
          నాకు చదరపు అడుగుకు, <span className="text-red-700">నెలకు</span> రూ.1.00/- (అక్షరాలా ఒక్క రూపాయి) అద్దెగా తీసుకోవడానికి నా
          సమ్మతిని తెలియచేస్తున్నాను.
        </li>
        <li>
          4) ప్రధాన మంత్రి-సూర్య ఘర్ ముఫ్త్ బిజిలీ యోజన క్రింద 2 కిలో వాట్ పీక్ రూఫ్ టాప్ సోలార్ ప్లాంట్ విజయవంతంగా స్థాపించి
          ప్రారంభించినందుకు గాను, నా తరపున కేంద్ర ఆర్థిక సహాయం (CFA) పొందడానికి ఏపీఎస్పీడీసీఎల్ (APSPDCL) కు నేను ఇందుమూలంగా
          సమ్మతిని తెలియజేస్తున్నాను.
        </li>
        <li>
          5) నా ఇంటి పై నిర్మించిన సౌర ఫలకాలకు ఎటువంటి నష్టం కలిగించను మరియు ఇతరులు ఎవరినీ అనుమతించనని తెలియచేస్తున్నాను.
        </li>
        <li>
          6) ఇంటి నివాసం పైకప్పుపై సౌర ఫలకాల ప్లాంటులో ఏదైనా అదనపు సాంకేతిక పర్యవేక్షణ పరికరాలను ఏర్పాటు చేసుకొనే హక్కును
          ఏపీఎస్పీడీసీఎల్ లేదా అధీకృత ఈపిసి కాంట్రాక్టరు / ఆర్టీఎస్ విక్రేత కి కల్పించేందుకు నేను నా సమ్మతిని తెలియచేస్తున్నాను.
        </li>
        <li>
          7) ఇందుమూలంగా ఇంటి నివాసం పైకప్పుపై సౌర ఫలకాల ప్లాంటు స్థాపన, ఆపరేషన్ మరియు నిర్వహణ సమయంలో అన్ని భద్రతా చర్యలు
          తీసుకొంటున్నట్లుగా <Blank>{COMPANY.name}</Blank> (ఈపీసీ కాంట్రాక్టరు/ఆర్టీఎస్ విక్రేత) ను నాకు భరోసా ఇవ్వమని కోరుతున్నాను.
        </li>
      </ol>

      <div className="pt-2">
        <div className="mb-2">
          <span>వినియోగదారుని సంతకం :</span>
          <div className="min-h-[3rem] mt-1">
            {signatureSlot ??
              (consent.signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={consent.signature} alt="వినియోగదారుని సంతకం" className="h-20 w-auto max-w-full object-contain" />
              ) : (
                <Blank />
              ))}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,42%)_auto_1fr] gap-x-3 items-start">
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <span>{label}</span>
              <span>:</span>
              <span className="font-bold break-words">{value}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-300 text-xs leading-5 text-slate-600">
        <div className="font-bold text-slate-800">
          ఈపీసీ కాంట్రాక్టరు / ఆర్టీఎస్ విక్రేత: {COMPANY.name} · GSTIN {COMPANY.gstin}
        </div>
        <div>
          {COMPANY.contactPerson} ({COMPANY.designation}) · {COMPANY.email} · {COMPANY.phone}
        </div>
        {collectedBy && consent.signedAt && (
          <div className="mt-1">
            Signed on the phone of {collectedBy} on{' '}
            {new Date(consent.signedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Finger signature ---------- */

const SignaturePad: React.FC<{ onChange: (dataUrl: string | null) => void }> = ({ onChange }) => {
  const { t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // Size the canvas to its box, sharp on high-density screens
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current!.toDataURL('image/png'));
  };

  const clear = () => {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className="space-y-2 max-w-md">
      <canvas
        ref={canvasRef}
        aria-label={t('Signature box. The consumer signs here with a finger.')}
        className="w-full h-40 bg-amber-50 border-2 border-dashed border-amber-400 rounded-xl touch-none cursor-crosshair"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const ctx = canvasRef.current!.getContext('2d')!;
          const { x, y } = point(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 0.1, y + 0.1);
          ctx.stroke();
          setHasInk(true);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current!.getContext('2d')!;
          const { x, y } = point(e);
          ctx.lineTo(x, y);
          ctx.stroke();
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-600">{hasInk ? t('Signed. Clear it to sign again.') : t('Sign inside the box with a finger.')}</span>
        <button type="button" onClick={clear} disabled={!hasInk} className="px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 flex items-center gap-1 disabled:opacity-50">
          <Eraser className="w-4 h-4" />
          {t('Clear')}
        </button>
      </div>
    </div>
  );
};

/* ---------- Full-screen form: sign it, or view and print it ---------- */

export const ConsentFormScreen: React.FC<{
  consumer?: Consumer;
  consumerNumber: string;
  consent: SurveyConsent;
  collectedBy?: string;
  /** Given only while the form is being signed */
  onSign?: (signature: string) => void;
  onClose: () => void;
}> = ({ consumer, consumerNumber, consent, collectedBy, onSign, onClose }) => {
  const { t } = useLang();
  const [signature, setSignature] = useState<string | null>(null);
  const signing = !!onSign;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const after = () => document.body.classList.remove('printing-doc');
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('afterprint', after);
      after();
    };
  }, [onClose]);

  const print = () => {
    document.body.classList.add('printing-doc');
    window.print();
  };

  // Placed directly in <body>, so printing can hide the rest of the app completely
  return createPortal(
    <div className="print-host fixed inset-0 z-[60] bg-slate-900/70 overflow-y-auto p-2 sm:p-6" role="dialog" aria-modal="true" aria-label={t('Consumer consent form')}>
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="no-print bg-white rounded-2xl p-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{signing ? t('Consumer signs the consent form') : t('Consumer consent form')}</h3>
            <p className="text-sm text-slate-600">
              {signing
                ? t('Give the phone to the consumer. Read the form out to them if needed, then they sign at the bottom.')
                : t('Use Print to print it or save it as a PDF.')}
            </p>
          </div>
          <button onClick={onClose} aria-label={t('Close')} className="w-12 h-12 flex-shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="print-doc bg-white rounded-2xl p-5 sm:p-10 shadow">
          <ConsentDocument
            consumer={consumer}
            consumerNumber={consumerNumber}
            consent={signing ? { ...consent, signedAt: new Date().toISOString() } : consent}
            collectedBy={collectedBy}
            signatureSlot={signing ? <SignaturePad onChange={setSignature} /> : undefined}
          />
        </div>

        <div className="no-print bg-white rounded-2xl p-4 flex flex-col-reverse sm:flex-row justify-between gap-3">
          <button onClick={onClose} className={btnBack}>
            {signing ? t('Cancel') : t('Close')}
          </button>
          {signing ? (
            <button onClick={() => signature && onSign!(signature)} disabled={!signature} className={btnPrimary}>
              <CheckCircle2 className="w-5 h-5" />
              {t('Save signature')}
            </button>
          ) : (
            <button onClick={print} className={btnPrimary}>
              <Printer className="w-5 h-5" />
              {t('Print')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ---------- The survey step ---------- */

export const ConsentSection: React.FC<{
  consumer?: Consumer;
  consumerNumber: string;
  consent?: SurveyConsent;
  collectedBy: string;
  onChange: (next: SurveyConsent) => void;
}> = ({ consumer, consumerNumber, consent, collectedBy, onChange }) => {
  const { t } = useLang();
  const [screen, setScreen] = useState<'sign' | 'view' | null>(null);
  const c: SurveyConsent = { address: defaultAddress(consumer), ...consent };
  const signed = !!c.signature;
  const detailsMissing = consentMissing({ ...c, signature: 'x' }, t);

  // Keep the starting address, so it counts as filled in
  const needsAddress = consent?.address === undefined && !!c.address;
  useEffect(() => {
    if (needsAddress) onChange(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAddress]);

  // Any change to the details means the consumer must sign again
  const set = (change: Partial<SurveyConsent>) => onChange({ ...c, ...change, signature: undefined, signedAt: undefined });

  const input = 'w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-base disabled:bg-slate-100 disabled:text-slate-600';

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-base">
        <div>
          <span className="text-slate-500">{t('Name')}: </span>
          <span className="font-semibold">{consumer?.name}</span>
        </div>
        <div>
          <span className="text-slate-500">{t('Service number')}: </span>
          <span className="font-semibold font-mono">{consumerNumber}</span>
        </div>
        <div>
          <span className="text-slate-500">{t('Mobile')}: </span>
          <span className="font-semibold">{consumer?.mobile || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500">{t('Plant size')}: </span>
          <span className="font-semibold">{consumer?.capacityKw ? `${consumer.capacityKw} kW` : '—'}</span>
        </div>
      </div>

      {signed && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900">
          {t('Signed. Changing anything below removes the signature, and the consumer must sign again.')}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-base font-bold text-slate-800">{t('Full address (house number, street, village)')}</span>
          <textarea value={c.address || ''} onChange={(e) => set({ address: e.target.value })} rows={2} className={input} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-base font-bold text-slate-800">{t('Roof area given for the panels (square feet)')}</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={c.roofAreaSqFt ?? ''}
            onChange={(e) => set({ roofAreaSqFt: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })}
            placeholder={t('e.g. 200')}
            className={input}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-base font-bold text-slate-800">{t('Aadhaar: last 4 digits only')}</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={c.aadhaarLast4 || ''}
            onChange={(e) => set({ aadhaarLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="1234"
            className={input + ' font-mono tracking-widest'}
          />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-base font-bold text-slate-800 mb-1.5">{t('Caste')}</legend>
          <div className="grid grid-cols-2 gap-2 max-w-sm" role="radiogroup">
            {(['SC', 'ST'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={c.caste === v}
                onClick={() => c.caste !== v && set({ caste: v })}
                className={`px-4 py-3 rounded-xl border-2 text-lg font-bold ${
                  c.caste === v ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {signed ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.signature} alt={t("Consumer's signature")} className="h-20 w-auto max-w-[16rem] bg-white border border-slate-200 rounded-lg p-1" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setScreen('view')} className={btnBack}>
              <FileSignature className="w-5 h-5" />
              {t('View signed form')}
            </button>
            <button type="button" onClick={() => setScreen('sign')} className={btnBack}>
              {t('Sign again')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {detailsMissing.length > 0 && <p className="text-sm text-slate-600">{t('Fill in the details above, then the consumer can sign.')}</p>}
          <button type="button" onClick={() => setScreen('sign')} disabled={detailsMissing.length > 0} className={btnPrimary + ' w-full sm:w-auto'}>
            <FileSignature className="w-5 h-5" />
            {t('Show form to consumer and sign')}
          </button>
        </div>
      )}

      {screen && (
        <ConsentFormScreen
          consumer={consumer}
          consumerNumber={consumerNumber}
          consent={c}
          collectedBy={collectedBy}
          onClose={() => setScreen(null)}
          onSign={
            screen === 'sign'
              ? (signature) => {
                  onChange({ ...c, signature, signedAt: new Date().toISOString() });
                  setScreen(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

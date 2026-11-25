import React from 'react';
import { useLang } from '@/i18n/LanguageContext';
import { APP_NAME } from '@/lib/company';

/** Arka Works mark: a sun rising over a house roof that carries a solar panel. */
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 44, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    role="img"
    aria-label={`${APP_NAME} logo`}
    className={className}
  >
    <rect width="48" height="48" rx="12" fill="#1d4ed8" />
    {/* sun */}
    <circle cx="24" cy="19" r="7" fill="#fbbf24" />
    <g stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round">
      <line x1="24" y1="6" x2="24" y2="8.5" />
      <line x1="13.5" y1="10" x2="15.3" y2="11.8" />
      <line x1="34.5" y1="10" x2="32.7" y2="11.8" />
      <line x1="9.5" y1="19" x2="12" y2="19" />
      <line x1="38.5" y1="19" x2="36" y2="19" />
    </g>
    {/* roof */}
    <path d="M7 36 L24 25 L41 36" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
    {/* solar panel on the roof */}
    <path d="M27.5 29.5 L35 34.3 L32.6 36.8 L25.4 32.2 Z" fill="#93b4fd" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round" />
    {/* house body */}
    <path d="M11 36 V42 H37 V36" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Logo: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { t } = useLang();
  return (
  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
    <LogoMark size={compact ? 40 : 46} className="flex-shrink-0 w-10 h-10 sm:w-[46px] sm:h-[46px]" />
    <div className="leading-tight min-w-0 hidden min-[430px]:block">
      <div className="text-[18px] min-[400px]:text-lg sm:text-xl font-bold text-slate-900 truncate">{APP_NAME}</div>
      {!compact && <div className="text-xs text-slate-500 hidden sm:block">{t('Rooftop solar work, made simple')}</div>}
    </div>
  </div>
);
};

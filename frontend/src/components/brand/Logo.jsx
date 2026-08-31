import { useId } from 'react';
import clsx from 'clsx';


/**
 * The MediTwin mark.
 *
 * A hexagonal housing — a machined part, the Fusion origin of the robot — holding
 * two identical peaks. The left is solid: the physical machine. The right is the
 * same form drawn as a dashed outline: its digital twin. The amber dashed axis
 * between them is the mirror line where one becomes the other. That is the whole
 * product in one glyph, and it also reads as an M.
 *
 * Gradient ids are generated per instance with useId. Two copies of this component
 * on one page — the sidebar and the login card, say — would otherwise emit
 * duplicate ids, and when React unmounts the first, the second silently loses its
 * fill and renders black.
 */

export function Mark({ size = 32, className, mono = false }) {
  const uid = useId().replace(/:/g, '');
  const shell = `mt-shell-${uid}`;
  const peak = `mt-peak-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={clsx('shrink-0', className)}
      role="img"
      aria-label="MediTwin"
    >
      {!mono && (
        <defs>
          <linearGradient id={shell} x1="6" y1="56" x2="58" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#06B6D4" />
            <stop offset="0.55" stopColor="#14B8A6" />
            <stop offset="1" stopColor="#0F766E" />
          </linearGradient>
          <linearGradient id={peak} x1="24" y1="47" x2="24" y2="17" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0F766E" />
            <stop offset="1" stopColor="#2DD4BF" />
          </linearGradient>
        </defs>
      )}

      <path
        d="M58 32 L45 54.5 L19 54.5 L6 32 L19 9.5 L45 9.5 Z"
        fill="none"
        stroke={mono ? 'currentColor' : `url(#${shell})`}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      <path d="M16.5 44 L25.25 19.5 L34 44 Z" fill={mono ? 'currentColor' : `url(#${peak})`} />

      <path
        d="M30 44 L38.75 19.5 L47.5 44 Z"
        fill="none"
        stroke={mono ? 'currentColor' : '#2DD4BF'}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeDasharray="5.5 4"
        opacity={mono ? 0.75 : 1}
      />

      <line
        x1="32"
        y1="15"
        x2="32"
        y2="49"
        stroke={mono ? 'currentColor' : '#F59E0B'}
        strokeWidth="1.5"
        strokeDasharray="2.5 3.5"
        opacity={mono ? 0.45 : 0.9}
      />
    </svg>
  );
}

/**
 * Mark plus name.
 *
 * "Medi" in regular and "Twin" in semibold: the compound is the product's whole
 * proposition, and weight carries that without a colour change that would fail on
 * the dark 3D viewport.
 */
export default function Logo({ size = 'md', subtitle, inverted = false, className }) {
  const scale = { sm: 24, md: 30, lg: 40 }[size] ?? 30;
  const text = { sm: 'text-[0.9375rem]', md: 'text-lg', lg: 'text-2xl' }[size] ?? 'text-lg';

  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <Mark size={scale} />
      
      <div className="min-w-0 leading-none">
        <span
          className={clsx(
            'block tracking-[-0.02em]',
            text,
            inverted ? 'text-white' : 'text-ink'
          )}
        >
          <span className="font-normal">Medi</span>
          <span className="font-semibold">Twin</span>
        </span>
        {subtitle ? (
          <span
            className={clsx(
              'mt-1 block text-[0.625rem] uppercase tracking-[0.14em]',
              inverted ? 'text-white/55' : 'text-faint'
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </div>
      
    </div>
  );
}

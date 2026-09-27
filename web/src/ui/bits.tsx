// Tiny shared HUD primitives: pulsing status dot, clock hook, icons.
import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'

export function PulseDot({
  color,
  active = true,
  size = 8,
  className,
}: {
  color: string
  active?: boolean
  size?: number
  className?: string
}) {
  return (
    <span className={clsx('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {active && (
        <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: color }} />
      )}
      <span
        className="relative h-full w-full rounded-full transition-colors duration-500"
        style={{ background: color, boxShadow: active ? `0 0 10px ${color}` : 'none' }}
      />
    </span>
  )
}

/** Re-renders every `ms` so relative times stay fresh. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

type IconProps = { className?: string; size?: number }

const svg = (size: number, className: string | undefined, children: ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
)

export const IconPlay = ({ className, size = 14 }: IconProps) =>
  svg(size, className, <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" />)

export const IconPause = ({ className, size = 14 }: IconProps) =>
  svg(
    size,
    className,
    <>
      <rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" />
    </>,
  )

export const IconBolt = ({ className, size = 14 }: IconProps) =>
  svg(size, className, <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none" />)

export const IconSpark = ({ className, size = 14 }: IconProps) =>
  svg(
    size,
    className,
    <path
      d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z"
      fill="currentColor"
      stroke="none"
    />,
  )

export const IconFlow = ({ className, size = 14 }: IconProps) =>
  svg(
    size,
    className,
    <>
      <rect x="3" y="3.5" width="7" height="6" rx="1.8" />
      <rect x="14" y="14.5" width="7" height="6" rx="1.8" />
      <path d="M6.5 9.5v3.5a2 2 0 0 0 2 2H14" />
    </>,
  )

export const IconTrend = ({ className, size = 14 }: IconProps) =>
  svg(
    size,
    className,
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>,
  )

export const IconBrain = ({ className, size = 14 }: IconProps) =>
  svg(
    size,
    className,
    <>
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="8.5" strokeDasharray="2.5 3" />
    </>,
  )

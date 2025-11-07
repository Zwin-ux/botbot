/**
 * ST-01 Observer Logo - Synthetic Eye
 * SVG-first, scalable, accessible
 */

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 24 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="ST-01 Observer logo"
    >
      <g fill="none" stroke="currentColor" strokeWidth="8">
        <circle cx="100" cy="100" r="70" />
        <circle cx="100" cy="100" r="45" />
      </g>
      <circle cx="140" cy="80" r="6" fill="currentColor" />
    </svg>
  );
}

export function LogoWithText({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={28} className="text-[var(--st-accent)]" />
      <span style={{ 
        fontWeight: 600, 
        letterSpacing: '-0.02em',
        fontSize: '1.1rem'
      }}>
        ST-01 Observer
      </span>
    </div>
  );
}

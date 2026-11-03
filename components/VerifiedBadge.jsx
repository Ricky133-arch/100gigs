/**
 * components/VerifiedBadge.jsx
 * Solid green seal with a dark tick, matching the green buttons across the app.
 * Same props as before: size (px) and showLabel.
 */
export default function VerifiedBadge({ size = 16, showLabel = false, className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 align-middle ${className}`}
      title="ID verified by 100Gigs"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label="Verified"
        className="shrink-0"
      >
        {/* Scalloped seal */}
        <path
          fill="#4ade80"
          d="M12 1.5l2.39 1.74 2.95-.07.9 2.81 2.38 1.75-.92 2.8.92 2.8-2.38 1.75-.9 2.81-2.95-.07L12 19.5l-2.39-1.74-2.95.07-.9-2.81-2.38-1.75.92-2.8-.92-2.8 2.38-1.75.9-2.81 2.95.07z"
          transform="translate(0 1.5)"
        />
        {/* Tick */}
        <path
          d="M8.2 12.4l2.5 2.5 5.1-5.3"
          fill="none"
          stroke="#080f0a"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showLabel && (
        <span
          className="text-[10px] uppercase tracking-[0.14em] text-green-400"
          style={{ fontFamily: 'var(--font-mono), ui-monospace, monospace' }}
        >
          Verified
        </span>
      )}
    </span>
  );
}
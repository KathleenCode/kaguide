interface FreeTierIndicatorProps {
  status: 'green' | 'amber' | 'red';
  label?: string;
}

const COLOR_MAP = {
  green: '#22c55e',
  amber: '#FFB33F',
  red: '#C00707',
} as const;

const DEFAULT_LABEL = {
  green: 'Free Tier',
  amber: 'Near Limit',
  red: 'Exceeded',
} as const;

export default function FreeTierIndicator({ status, label }: FreeTierIndicatorProps) {
  const color = COLOR_MAP[status];
  const text = label ?? DEFAULT_LABEL[status];

  return (
    <>
      <style>{`
        .free-tier-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
          background: color-mix(in srgb, var(--fti-color) 12%, transparent);
          color: var(--fti-color);
          border: 1px solid color-mix(in srgb, var(--fti-color) 30%, transparent);
        }
        .free-tier-indicator__dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--fti-color);
          flex-shrink: 0;
        }
      `}</style>
      <span
        className="free-tier-indicator"
        style={{ '--fti-color': color } as React.CSSProperties}
        aria-label={`Free tier status: ${text}`}
        role="status"
      >
        <span className="free-tier-indicator__dot" aria-hidden="true" />
        {text}
      </span>
    </>
  );
}

import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

export default function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');

  async function handleCopy() {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setState('copied');
      } catch {
        setState('failed');
      }
    } else {
      setState('failed');
    }

    setTimeout(() => setState('idle'), 2000);
  }

  const icon = state === 'copied' ? '✓' : state === 'failed' ? '✗' : '⧉';
  const displayLabel = state === 'copied' ? 'Copied!' : state === 'failed' ? 'Copy failed' : label;

  return (
    <>
      <style>{`
        .copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.9rem;
          border-radius: 6px;
          border: 1.5px solid var(--color-primary-3);
          background: white;
          color: var(--color-primary-5);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 150ms, border-color 150ms, color 150ms, transform 150ms;
          white-space: nowrap;
        }
        .copy-btn:hover:not(:disabled) {
          background: var(--color-primary-1);
          border-color: var(--color-primary-4);
          transform: scale(1.03);
        }
        .copy-btn--copied {
          border-color: #22c55e;
          color: #16a34a;
          background: #f0fdf4;
        }
        .copy-btn--failed {
          border-color: var(--color-error);
          color: var(--color-error);
          background: #fff5f5;
        }
        .copy-btn__icon {
          font-size: 1rem;
          line-height: 1;
        }
      `}</style>
      <button
        className={`copy-btn${state === 'copied' ? ' copy-btn--copied' : state === 'failed' ? ' copy-btn--failed' : ''}`}
        onClick={handleCopy}
        aria-label={displayLabel}
        aria-live="polite"
      >
        <span className="copy-btn__icon" aria-hidden="true">{icon}</span>
        {displayLabel}
      </button>
    </>
  );
}

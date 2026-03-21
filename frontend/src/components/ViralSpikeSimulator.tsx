import { useAppContext } from '../context/AppContext';

const MULTIPLIERS = [10, 25, 50, 100] as const;

export default function ViralSpikeSimulator() {
  const { spikeMultiplier, setSpikeMultiplier } = useAppContext();

  function handleSelect(n: number) {
    setSpikeMultiplier(spikeMultiplier === n ? null : n);
  }

  function handleDeactivate() {
    setSpikeMultiplier(null);
  }

  return (
    <>
      <style>{`
        .spike-sim {
          width: 100%;
        }
        .spike-sim__label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #444;
          margin-bottom: 0.5rem;
          display: block;
        }
        .spike-sim__buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .spike-sim__btn {
          padding: 0.35rem 0.85rem;
          border-radius: 6px;
          border: 2px solid var(--color-primary-2);
          background: white;
          color: var(--color-primary-5);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 150ms, border-color 150ms, color 150ms, transform 150ms;
        }
        .spike-sim__btn:hover {
          border-color: var(--color-warning);
          color: var(--color-warning);
          transform: scale(1.03);
        }
        .spike-sim__btn--active {
          background: var(--color-warning);
          border-color: var(--color-warning);
          color: white;
        }
        .spike-sim__btn--active:hover {
          background: #e03a00;
          border-color: #e03a00;
          color: white;
        }
        .spike-sim__deactivate {
          padding: 0.35rem 0.85rem;
          border-radius: 6px;
          border: 2px solid #ccc;
          background: white;
          color: #666;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 150ms, border-color 150ms;
        }
        .spike-sim__deactivate:hover {
          border-color: #999;
          background: #f5f5f5;
        }
        .spike-sim__banner {
          margin-top: 0.75rem;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          background: #fff3e0;
          border: 1.5px solid var(--color-caution);
          color: #7a4a00;
          font-size: 0.9rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
        }
        .spike-sim__banner-icon {
          font-size: 1.1rem;
        }
      `}</style>
      <div className="spike-sim">
        <span className="spike-sim__label">Viral Spike Simulator</span>
        <div className="spike-sim__buttons">
          {MULTIPLIERS.map((n) => (
            <button
              key={n}
              className={`spike-sim__btn${spikeMultiplier === n ? ' spike-sim__btn--active' : ''}`}
              onClick={() => handleSelect(n)}
              aria-pressed={spikeMultiplier === n}
              aria-label={`${n}x spike multiplier`}
            >
              {n}x
            </button>
          ))}
          {spikeMultiplier !== null && (
            <button
              className="spike-sim__deactivate"
              onClick={handleDeactivate}
              aria-label="Deactivate spike simulation"
            >
              Deactivate
            </button>
          )}
        </div>

        {spikeMultiplier !== null && (
          <div className="spike-sim__banner" role="status" aria-live="polite">
            <span className="spike-sim__banner-icon">⚡</span>
            Spike Simulation Active — {spikeMultiplier}x
          </div>
        )}
      </div>
    </>
  );
}

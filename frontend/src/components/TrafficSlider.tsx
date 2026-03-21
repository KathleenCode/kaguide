import { useAppContext } from '../context/AppContext';

// Log-scale conversion helpers
const MIN_LOG = Math.log10(10);
const MAX_LOG = Math.log10(1_000_000);

function logToLinear(logVal: number): number {
  // Map log value to 0–1000 slider range
  return ((logVal - MIN_LOG) / (MAX_LOG - MIN_LOG)) * 1000;
}

function linearToLog(linear: number): number {
  // Map 0–1000 slider range back to actual MAU
  const logVal = MIN_LOG + (linear / 1000) * (MAX_LOG - MIN_LOG);
  return Math.round(Math.pow(10, logVal));
}

function formatMAU(mau: number): string {
  if (mau >= 1_000_000) return `${(mau / 1_000_000).toFixed(0)}M MAU`;
  if (mau >= 1_000) return `${(mau / 1_000).toLocaleString()}K MAU`;
  return `${mau.toLocaleString()} MAU`;
}

const TICKS = [10, 100, 1_000, 10_000, 100_000, 1_000_000];

export default function TrafficSlider() {
  const { currentMAU, setCurrentMAU } = useAppContext();

  const sliderValue = logToLinear(Math.log10(Math.max(10, currentMAU)));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const mau = linearToLog(Number(e.target.value));
    setCurrentMAU(mau);
  }

  return (
    <>
      <style>{`
        .traffic-slider {
          width: 100%;
        }
        .traffic-slider__header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.5rem;
        }
        .traffic-slider__label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #444;
        }
        .traffic-slider__value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-cta);
        }
        .traffic-slider__input {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(
            to right,
            var(--color-primary-4) 0%,
            var(--color-primary-4) calc(var(--pct) * 1%),
            var(--color-primary-1) calc(var(--pct) * 1%),
            var(--color-primary-1) 100%
          );
          outline: none;
          cursor: pointer;
        }
        .traffic-slider__input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--color-primary-4);
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: background 150ms, transform 150ms;
        }
        .traffic-slider__input::-webkit-slider-thumb:hover {
          background: var(--color-cta);
          transform: scale(1.15);
        }
        .traffic-slider__input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--color-primary-4);
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          cursor: pointer;
        }
        .traffic-slider__ticks {
          display: flex;
          justify-content: space-between;
          margin-top: 0.4rem;
        }
        .traffic-slider__tick {
          font-size: 0.68rem;
          color: #888;
          text-align: center;
        }
      `}</style>
      <div className="traffic-slider">
        <div className="traffic-slider__header">
          <span className="traffic-slider__label">Monthly Active Users</span>
          <span className="traffic-slider__value">{formatMAU(currentMAU)}</span>
        </div>
        <input
          type="range"
          className="traffic-slider__input"
          min={0}
          max={1000}
          step={1}
          value={sliderValue}
          onChange={handleChange}
          aria-label="Monthly Active Users"
          aria-valuemin={10}
          aria-valuemax={1_000_000}
          aria-valuenow={currentMAU}
          aria-valuetext={formatMAU(currentMAU)}
          style={{ '--pct': sliderValue / 10 } as React.CSSProperties}
        />
        <div className="traffic-slider__ticks" aria-hidden="true">
          {TICKS.map((t) => (
            <span key={t} className="traffic-slider__tick">
              {t >= 1_000_000 ? '1M' : t >= 1_000 ? `${t / 1000}K` : t}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

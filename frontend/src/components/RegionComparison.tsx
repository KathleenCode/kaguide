import type { RegionComparisonItem } from '../context/AppContext';
import styles from './RegionComparison.module.css';

interface RegionComparisonProps {
  regions: RegionComparisonItem[];
  recommendedRegion: string;
}

function formatDelta(pct: number): { text: string; cls: string } {
  if (pct === 0) return { text: '0% (baseline)', cls: styles.deltaNeutral };
  if (pct > 0) return { text: `+${pct.toFixed(1)}%`, cls: styles.deltaPositive };
  return { text: `${pct.toFixed(1)}%`, cls: styles.deltaNegative };
}

export default function RegionComparison({ regions, recommendedRegion }: RegionComparisonProps) {
  return (
    <div className={styles.grid} role="list" aria-label="Region comparison">
      {regions.map((r) => {
        const isRecommended = r.region === recommendedRegion;
        const delta = formatDelta(r.estimated_cost_delta_pct);
        return (
          <div
            key={r.region}
            className={`${styles.card}${isRecommended ? ` ${styles.cardRecommended}` : ''}`}
            role="listitem"
            aria-label={`Region ${r.region}${isRecommended ? ', recommended' : ''}`}
          >
            <div className={styles.header}>
              <span className={styles.regionId}>{r.region}</span>
              {isRecommended && (
                <span className={styles.badge}>Recommended</span>
              )}
            </div>
            <div className={`${styles.delta} ${delta.cls}`}>
              Cost delta: {delta.text}
            </div>
            <div className={styles.latency}>{r.latency_note}</div>
          </div>
        );
      })}
    </div>
  );
}

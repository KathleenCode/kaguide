import { useState } from 'react';
import type { ServiceItem, AlternativeItem } from '../context/AppContext';
import FreeTierIndicator from './FreeTierIndicator';

interface ServiceCardProps {
  service: ServiceItem;
  tradeoff: string;
  indicator: 'green' | 'amber' | 'red';
  alternatives?: AlternativeItem[];
}

export default function ServiceCard({ service, tradeoff, indicator, alternatives }: ServiceCardProps) {
  const [tradeoffOpen, setTradeoffOpen] = useState(false);

  return (
    <>
      <style>{`
        .service-card {
          position: relative;
          background: var(--color-surface);
          border-radius: 12px;
          border: 1px solid var(--color-primary-1);
          padding: 1.25rem 1.25rem 1rem;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          transition: transform 150ms ease, box-shadow 150ms ease;
        }
        .service-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.1);
        }
        .service-card__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .service-card__title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .service-card__name {
          font-size: 1rem;
          font-weight: 700;
          color: #1a1a2e;
        }
        .service-card__category {
          display: inline-block;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: var(--color-primary-1);
          color: var(--color-cta);
        }
        .service-card__purpose {
          font-size: 0.875rem;
          color: #444;
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }
        .service-card__tradeoff-toggle {
          background: none;
          border: none;
          padding: 0;
          font-size: 0.8rem;
          color: var(--color-primary-5);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
          margin-bottom: 0.4rem;
          display: block;
        }
        .service-card__tradeoff-toggle:hover {
          color: var(--color-cta);
        }
        .service-card__tradeoff-text {
          font-size: 0.82rem;
          color: #555;
          background: var(--color-bg);
          border-left: 3px solid var(--color-caution);
          padding: 0.5rem 0.75rem;
          border-radius: 0 6px 6px 0;
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }
        .service-card__alternatives {
          margin-top: 0.5rem;
        }
        .service-card__alternatives-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 0.35rem;
        }
        .service-card__alt-item {
          font-size: 0.8rem;
          color: #555;
          padding: 0.25rem 0;
          border-bottom: 1px solid var(--color-primary-1);
          display: flex;
          gap: 0.4rem;
        }
        .service-card__alt-item:last-child {
          border-bottom: none;
        }
        .service-card__alt-name {
          font-weight: 600;
          color: #333;
          white-space: nowrap;
        }
      `}</style>
      <article className="service-card" aria-label={`Service: ${service.name}`}>
        <div className="service-card__header">
          <div>
            <div className="service-card__title-row">
              <span className="service-card__name">{service.name}</span>
              <span className="service-card__category">{service.category}</span>
            </div>
          </div>
          <FreeTierIndicator status={indicator} />
        </div>

        <p className="service-card__purpose">{service.purpose}</p>

        <button
          className="service-card__tradeoff-toggle"
          onClick={() => setTradeoffOpen((o) => !o)}
          aria-expanded={tradeoffOpen}
        >
          {tradeoffOpen ? 'Hide trade-offs ▲' : 'Show trade-offs ▼'}
        </button>

        {tradeoffOpen && (
          <div className="service-card__tradeoff-text">{tradeoff}</div>
        )}

        {alternatives && alternatives.length > 0 && (
          <div className="service-card__alternatives">
            <div className="service-card__alternatives-label">Alternatives</div>
            {alternatives.map((alt) => (
              <div key={alt.name} className="service-card__alt-item">
                <span className="service-card__alt-name">{alt.name}:</span>
                <span>{alt.reason}</span>
              </div>
            ))}
          </div>
        )}
      </article>
    </>
  );
}

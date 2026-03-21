import type { CostEstimate } from '../context/AppContext';
import FreeTierIndicator from './FreeTierIndicator';
import { recalculateCosts, classifyTier } from '../utils/costCalc';

interface CostBreakdownTableProps {
  costEstimate: CostEstimate;
  effectiveMAU: number;
}

function formatUSD(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return '<$0.01';
  return `$${value.toFixed(2)}`;
}

export default function CostBreakdownTable({ costEstimate, effectiveMAU }: CostBreakdownTableProps) {
  const result = recalculateCosts(effectiveMAU, null, costEstimate);

  return (
    <>
      <style>{`
        .cost-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 8px;
          border: 1px solid var(--color-primary-1);
        }
        .cost-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          min-width: 480px;
        }
        .cost-table th {
          background: var(--color-primary-1);
          color: var(--color-cta);
          font-weight: 700;
          text-align: left;
          padding: 0.6rem 0.9rem;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .cost-table td {
          padding: 0.6rem 0.9rem;
          border-bottom: 1px solid var(--color-primary-1);
          vertical-align: middle;
        }
        .cost-table tr:last-child td {
          border-bottom: none;
        }
        .cost-table tr:hover td {
          background: #f5f8ff;
        }
        .cost-table__service-name {
          font-weight: 600;
          color: #1a1a2e;
        }
        .cost-table__unavailable {
          color: var(--color-caution);
          font-style: italic;
          font-size: 0.8rem;
        }
        .cost-table__total-row td {
          font-weight: 700;
          background: var(--color-bg);
          border-top: 2px solid var(--color-primary-2);
          color: #1a1a2e;
        }
        .cost-table__total-row:hover td {
          background: var(--color-bg);
        }
      `}</style>
      <div className="cost-table-wrapper" role="region" aria-label="Cost breakdown table">
        <table className="cost-table">
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Monthly Cost</th>
              <th scope="col">Free Tier Status</th>
              <th scope="col">Overage</th>
            </tr>
          </thead>
          <tbody>
            {costEstimate.services.map((svc) => {
              if (svc.pricing_unavailable) {
                return (
                  <tr key={svc.service_id}>
                    <td><span className="cost-table__service-name">{svc.service_id}</span></td>
                    <td><span className="cost-table__unavailable">pricing unavailable</span></td>
                    <td><FreeTierIndicator status="amber" label="Unknown" /></td>
                    <td>—</td>
                  </tr>
                );
              }

              const row = result.services.find((r) => r.service_id === svc.service_id);
              const monthlyCost = row?.monthly_cost_usd ?? 0;
              const overage = row?.overage_cost ?? 0;
              const tier = row?.tier ?? classifyTier(effectiveMAU * svc.units_per_mau, svc.free_tier_limit);

              return (
                <tr key={svc.service_id}>
                  <td><span className="cost-table__service-name">{svc.service_id}</span></td>
                  <td>{formatUSD(monthlyCost)}</td>
                  <td><FreeTierIndicator status={tier} /></td>
                  <td>{overage > 0 ? formatUSD(overage) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="cost-table__total-row">
              <td>Total</td>
              <td>{formatUSD(result.total_monthly_cost_usd)}</td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { CostEstimate } from '../context/AppContext';
import { useAppContext } from '../context/AppContext';
import { generateCostCurve } from '../utils/costCalc';

interface CostCurveChartProps {
  costEstimate: CostEstimate;
}

function formatMAUTick(value: number): string {
  if (value >= 1_000_000) return '1M';
  if (value >= 100_000) return '100K';
  if (value >= 10_000) return '10K';
  if (value >= 1_000) return '1K';
  if (value >= 100) return '100';
  return String(value);
}

function formatUSD(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

// Compute free tier threshold: total cost at the point where any service first exceeds free tier
function computeFreeTierThreshold(costEstimate: CostEstimate): number | null {
  const services = costEstimate.services.filter((s) => !s.pricing_unavailable && s.units_per_mau > 0);
  if (services.length === 0) return null;
  // Find the MAU at which the first service hits its free tier limit
  const thresholds = services
    .filter((s) => s.free_tier_limit > 0)
    .map((s) => s.free_tier_limit / s.units_per_mau);
  if (thresholds.length === 0) return null;
  const mauThreshold = Math.min(...thresholds);
  // Compute total cost at that MAU
  return services.reduce((sum, s) => sum + mauThreshold * s.units_per_mau * s.unit_price, 0);
}

export default function CostCurveChart({ costEstimate }: CostCurveChartProps) {
  const { currentMAU, spikeMultiplier } = useAppContext();
  const effectiveMAU = currentMAU * (spikeMultiplier ?? 1);

  const curveData = generateCostCurve(costEstimate);
  const freeTierThreshold = computeFreeTierThreshold(costEstimate);

  // Find the cost at current effective MAU for the reference line label
  const currentCost = costEstimate.services
    .filter((s) => !s.pricing_unavailable)
    .reduce((sum, s) => sum + effectiveMAU * s.units_per_mau * s.unit_price, 0);

  return (
    <>
      <style>{`
        .cost-curve-chart {
          width: 100%;
        }
        .cost-curve-chart__title {
          font-size: 0.85rem;
          font-weight: 600;
          color: #444;
          margin-bottom: 0.75rem;
        }
      `}</style>
      <div className="cost-curve-chart">
        <div className="cost-curve-chart__title">Cost vs. Monthly Active Users</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={curveData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf0" />
            <XAxis
              dataKey="mau"
              type="number"
              scale="log"
              domain={[10, 1_000_000]}
              ticks={[10, 100, 1_000, 10_000, 100_000, 1_000_000]}
              tickFormatter={formatMAUTick}
              tick={{ fontSize: 11 }}
              label={{ value: 'MAU', position: 'insideBottomRight', offset: -4, fontSize: 11 }}
            />
            <YAxis
              tickFormatter={formatUSD}
              tick={{ fontSize: 11 }}
              width={60}
            />
            <Tooltip
              formatter={(value: number) => [formatUSD(value), 'Monthly Cost']}
              labelFormatter={(label: number) => `MAU: ${label.toLocaleString()}`}
            />
            {freeTierThreshold !== null && (
              <ReferenceLine
                y={freeTierThreshold}
                stroke="#22c55e"
                strokeDasharray="5 3"
                label={{ value: 'Free Tier', position: 'insideTopRight', fontSize: 10, fill: '#22c55e' }}
              />
            )}
            <ReferenceLine
              x={effectiveMAU}
              stroke="#4a91f2"
              strokeWidth={2}
              label={{ value: formatUSD(currentCost), position: 'top', fontSize: 10, fill: '#4a91f2' }}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#4a91f2"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

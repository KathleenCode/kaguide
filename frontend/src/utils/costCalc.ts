import type { CostEstimate } from '../context/AppContext';

export type TierStatus = 'green' | 'amber' | 'red';

export interface ServiceCostResult {
  service_id: string;
  monthly_cost_usd: number;
  tier: TierStatus;
  overage_cost: number;
}

export interface CostCalcResult {
  services: ServiceCostResult[];
  total_monthly_cost_usd: number;
}

/**
 * Classify a usage amount against a free tier limit.
 * green  = within free tier
 * amber  = within 120% of free tier (near limit)
 * red    = exceeded 120% of free tier
 */
export function classifyTier(effectiveUnits: number, freeTierLimit: number): TierStatus {
  if (freeTierLimit === 0) return effectiveUnits > 0 ? 'red' : 'green';
  if (effectiveUnits <= freeTierLimit) return 'green';
  if (effectiveUnits <= freeTierLimit * 1.2) return 'amber';
  return 'red';
}

/**
 * Recalculate per-service costs and tiers for a given effective MAU.
 * spikeMultiplier is already applied externally — pass null here if MAU is already effective.
 * When spikeMultiplier is provided, effectiveMAU = mau * spikeMultiplier.
 */
export function recalculateCosts(
  mau: number,
  spikeMultiplier: number | null,
  costEstimate: CostEstimate
): CostCalcResult {
  const effectiveMAU = mau * (spikeMultiplier ?? 1);

  const services: ServiceCostResult[] = costEstimate.services
    .filter((s) => !s.pricing_unavailable)
    .map((s) => {
      const units = effectiveMAU * s.units_per_mau;
      const monthly_cost_usd = units * s.unit_price;
      const tier = classifyTier(units, s.free_tier_limit);

      // Overage cost: cost above the free tier threshold
      const freeTierCost = s.free_tier_limit * s.unit_price;
      const overage_cost = Math.max(0, monthly_cost_usd - freeTierCost);

      return {
        service_id: s.service_id,
        monthly_cost_usd,
        tier,
        overage_cost,
      };
    });

  const total_monthly_cost_usd = services.reduce((sum, s) => sum + s.monthly_cost_usd, 0);

  return { services, total_monthly_cost_usd };
}

/**
 * Generate 20 log-evenly-spaced MAU points across [10, 1,000,000]
 * and compute total cost at each point.
 */
export function generateCostCurve(
  costEstimate: CostEstimate
): Array<{ mau: number; cost: number }> {
  const MIN_LOG = Math.log10(10);
  const MAX_LOG = Math.log10(1_000_000);
  const POINTS = 20;

  const availableServices = costEstimate.services.filter((s) => !s.pricing_unavailable);

  return Array.from({ length: POINTS }, (_, i) => {
    const logVal = MIN_LOG + (i / (POINTS - 1)) * (MAX_LOG - MIN_LOG);
    const mau = Math.round(Math.pow(10, logVal));
    const cost = availableServices.reduce((sum, s) => {
      return sum + mau * s.units_per_mau * s.unit_price;
    }, 0);
    return { mau, cost: Math.max(0, cost) };
  });
}

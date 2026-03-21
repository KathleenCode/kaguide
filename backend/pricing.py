"""
Kaguide AI — Pricing stage.

Builds a CostEstimate from an ArchitectureSuggestion using a curated
pricing map. Never raises — on full failure returns empty costs with
partial_failure=True.
"""
from __future__ import annotations

from typing import List, Tuple

from models import ArchitectureSuggestion, CostEstimate, CostServiceItem

# ---------------------------------------------------------------------------
# Curated pricing map
# service_name_lower → {unit_price, units_per_mau, free_tier_limit}
# ---------------------------------------------------------------------------
SERVICE_PRICING_MAP: dict[str, dict] = {
    "lambda": {"unit_price": 0.0000002, "units_per_mau": 100, "free_tier_limit": 1_000_000},
    "api gateway": {"unit_price": 0.0000035, "units_per_mau": 100, "free_tier_limit": 1_000_000},
    "s3": {"unit_price": 0.023, "units_per_mau": 0.05, "free_tier_limit": 5},
    "cloudfront": {"unit_price": 0.0085, "units_per_mau": 0.1, "free_tier_limit": 1024},
    "dynamodb": {"unit_price": 0.00000025, "units_per_mau": 1000, "free_tier_limit": 25_000_000},
    "rds": {"unit_price": 0.017, "units_per_mau": 0.001, "free_tier_limit": 750},
    "ec2": {"unit_price": 0.0116, "units_per_mau": 0.001, "free_tier_limit": 750},
    "elasticache": {"unit_price": 0.017, "units_per_mau": 0.0005, "free_tier_limit": 750},
    "sqs": {"unit_price": 0.0000004, "units_per_mau": 500, "free_tier_limit": 1_000_000},
    "sns": {"unit_price": 0.0000005, "units_per_mau": 200, "free_tier_limit": 1_000_000},
    "cognito": {"unit_price": 0.0055, "units_per_mau": 1, "free_tier_limit": 50_000},
    "bedrock": {"unit_price": 0.0006, "units_per_mau": 0.1, "free_tier_limit": 0},
    "cloudwatch": {"unit_price": 0.30, "units_per_mau": 0.001, "free_tier_limit": 10},
    "ecs": {"unit_price": 0.04048, "units_per_mau": 0.0001, "free_tier_limit": 0},
    "eks": {"unit_price": 0.10, "units_per_mau": 0.0001, "free_tier_limit": 0},
    "kinesis": {"unit_price": 0.015, "units_per_mau": 0.01, "free_tier_limit": 0},
    "ses": {"unit_price": 0.0001, "units_per_mau": 5, "free_tier_limit": 62_000},
    "route53": {"unit_price": 0.50, "units_per_mau": 0.0001, "free_tier_limit": 0},
    "waf": {"unit_price": 5.00, "units_per_mau": 0.0001, "free_tier_limit": 0},
    "secrets manager": {"unit_price": 0.40, "units_per_mau": 0.0001, "free_tier_limit": 0},
}


def _match_service_pricing(service_name: str) -> dict | None:
    """Fuzzy match a service name to a pricing config entry."""
    name_lower = service_name.lower()
    for key, pricing in SERVICE_PRICING_MAP.items():
        if key in name_lower or name_lower in key:
            return pricing
    return None


def fetch_pricing(
    suggestion: ArchitectureSuggestion, base_mau: int = 1000
) -> Tuple[CostEstimate, bool]:
    """Build a CostEstimate from an ArchitectureSuggestion using the pricing map.

    Args:
        suggestion: The ArchitectureSuggestion produced by Bedrock.
        base_mau:   Baseline monthly active users for cost calculation.

    Returns:
        (CostEstimate, pricing_partial_failure)
        pricing_partial_failure is True only on a complete/unexpected exception.
        Individual services with no pricing match are marked pricing_unavailable=True.

    Never raises.
    """
    try:
        service_items: List[CostServiceItem] = []
        total = 0.0

        for svc in suggestion.get("services", []):
            svc_id = svc.get("id", "")
            svc_name = svc.get("name", "")
            pricing = _match_service_pricing(svc_name)

            if pricing is None:
                service_items.append(
                    CostServiceItem(
                        service_id=svc_id,
                        monthly_cost_usd=0.0,
                        unit_price=0.0,
                        units_per_mau=0.0,
                        free_tier_limit=0.0,
                        pricing_unavailable=True,
                    )
                )
            else:
                monthly_cost = base_mau * pricing["units_per_mau"] * pricing["unit_price"]
                total += monthly_cost
                service_items.append(
                    CostServiceItem(
                        service_id=svc_id,
                        monthly_cost_usd=monthly_cost,
                        unit_price=pricing["unit_price"],
                        units_per_mau=pricing["units_per_mau"],
                        free_tier_limit=pricing["free_tier_limit"],
                        pricing_unavailable=False,
                    )
                )

        # Top 3 cost drivers by monthly cost (exclude unavailable)
        available = [s for s in service_items if not s["pricing_unavailable"]]
        top3 = sorted(available, key=lambda s: s["monthly_cost_usd"], reverse=True)[:3]
        top_cost_drivers = [s["service_id"] for s in top3]

        cost_estimate = CostEstimate(
            services=service_items,
            total_monthly_cost_usd=round(total, 6),
            top_cost_drivers=top_cost_drivers,
            base_mau=base_mau,
        )
        return cost_estimate, False

    except Exception:
        empty = CostEstimate(
            services=[],
            total_monthly_cost_usd=0.0,
            top_cost_drivers=[],
            base_mau=base_mau,
        )
        return empty, True

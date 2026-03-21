"""
Kaguide AI — TypedDict data models matching the design schema exactly.
"""
from __future__ import annotations

from typing import Dict, List

from typing_extensions import TypedDict


# ---------------------------------------------------------------------------
# ArchitectureSuggestion
# ---------------------------------------------------------------------------

class ServiceItem(TypedDict):
    id: str
    name: str
    purpose: str
    category: str


class AlternativeItem(TypedDict):
    name: str
    reason: str


class ArchitectureSuggestion(TypedDict):
    services: List[ServiceItem]
    alternatives: Dict[str, List[AlternativeItem]]
    tradeoffs: Dict[str, str]
    cost_drivers: List[str]


# ---------------------------------------------------------------------------
# CostEstimate
# ---------------------------------------------------------------------------

class CostServiceItem(TypedDict):
    service_id: str
    monthly_cost_usd: float
    unit_price: float
    units_per_mau: float
    free_tier_limit: float
    pricing_unavailable: bool


class CostEstimate(TypedDict):
    services: List[CostServiceItem]
    total_monthly_cost_usd: float
    top_cost_drivers: List[str]
    base_mau: int


# ---------------------------------------------------------------------------
# ComplianceCheck
# ---------------------------------------------------------------------------

class ComplianceFlag(TypedDict):
    regulation: str
    severity: str  # "violation" | "warning" | "info"
    description: str
    plain_language: str


class RegionComparisonItem(TypedDict):
    region: str
    estimated_cost_delta_pct: float
    latency_note: str


class ComplianceCheck(TypedDict):
    applicable_regulations: List[str]
    flags: List[ComplianceFlag]
    recommended_region: str
    region_justification: str
    region_comparison: List[RegionComparisonItem]


# ---------------------------------------------------------------------------
# IAMExport
# ---------------------------------------------------------------------------

class IAMStatement(TypedDict):
    Sid: str
    Effect: str
    Action: List[str]
    Resource: str


class IAMExport(TypedDict):
    Version: str
    Statement: List[IAMStatement]


# ---------------------------------------------------------------------------
# AnalysisResponse (top-level Lambda response payload)
# ---------------------------------------------------------------------------

class PartialFailure(TypedDict):
    compliance: bool
    amazon_q: bool
    pricing: bool


class AnalysisResponse(TypedDict):
    architecture_suggestion: ArchitectureSuggestion
    cost_estimate: CostEstimate
    compliance_check: ComplianceCheck
    iam_export: IAMExport
    amazon_q_summary: str
    amazon_q_fallback: bool
    partial_failure: PartialFailure

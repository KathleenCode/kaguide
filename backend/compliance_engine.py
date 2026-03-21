"""
Kaguide AI — Compliance engine stage.

Keyword/heuristic scan for GDPR, CCPA, LGPD, HIPAA, and PCI-DSS.
Never raises — on full exception returns empty ComplianceCheck with partial_failure=True.
"""
from __future__ import annotations

from typing import List, Tuple

from models import ArchitectureSuggestion, ComplianceCheck, ComplianceFlag, RegionComparisonItem

# ---------------------------------------------------------------------------
# Keyword lists
# ---------------------------------------------------------------------------
EU_KEYWORDS = [
    "eu ", "european", "gdpr", "eu users", "eu residents",
    "europe", "germany", "france", "uk", "united kingdom",
]
CCPA_KEYWORDS = ["california", "ccpa", "us users", "american users"]
LGPD_KEYWORDS = ["brazil", "lgpd", "brazilian"]
HEALTHCARE_KEYWORDS = ["health", "medical", "hipaa", "patient", "clinical"]
FINANCIAL_KEYWORDS = ["payment", "pci", "financial", "banking", "credit card"]

# ---------------------------------------------------------------------------
# Region data
# ---------------------------------------------------------------------------
REGION_DATA: dict[str, dict] = {
    "us-east-1": {
        "name": "US East (N. Virginia)",
        "cost_delta_pct": 0.0,
        "latency_note": "Lowest cost, best for US users",
    },
    "eu-central-1": {
        "name": "EU (Frankfurt)",
        "cost_delta_pct": 15.0,
        "latency_note": "~15% higher cost, required for EU data residency, ~20ms lower latency for EU users",
    },
    "ap-southeast-1": {
        "name": "Asia Pacific (Singapore)",
        "cost_delta_pct": 18.0,
        "latency_note": "~18% higher cost, best for Southeast Asia users",
    },
    "sa-east-1": {
        "name": "South America (São Paulo)",
        "cost_delta_pct": 50.0,
        "latency_note": "~50% higher cost, required for LGPD Brazil data residency",
    },
}


def _region_item(region_id: str) -> RegionComparisonItem:
    data = REGION_DATA[region_id]
    return RegionComparisonItem(
        region=region_id,
        estimated_cost_delta_pct=data["cost_delta_pct"],
        latency_note=data["latency_note"],
    )


def run_compliance(
    desc: str, suggestion: ArchitectureSuggestion
) -> Tuple[ComplianceCheck, bool]:
    """Perform a keyword/heuristic compliance scan on the description.

    Returns:
        (ComplianceCheck, partial_failure_bool)
        partial_failure_bool is True only on an unexpected exception.

    Never raises.
    """
    try:
        desc_lower = desc.lower()
        applicable_regulations: List[str] = []
        flags: List[ComplianceFlag] = []

        has_gdpr = any(kw in desc_lower for kw in EU_KEYWORDS)
        has_ccpa = any(kw in desc_lower for kw in CCPA_KEYWORDS)
        has_lgpd = any(kw in desc_lower for kw in LGPD_KEYWORDS)
        has_hipaa = any(kw in desc_lower for kw in HEALTHCARE_KEYWORDS)
        has_pci = any(kw in desc_lower for kw in FINANCIAL_KEYWORDS)

        if has_gdpr:
            applicable_regulations.append("GDPR")
            flags.append(
                ComplianceFlag(
                    regulation="GDPR",
                    severity="warning",
                    description="Application may process personal data of EU residents.",
                    plain_language=(
                        "Your app appears to serve EU users. Under GDPR you must obtain "
                        "explicit consent before collecting personal data, allow users to "
                        "request deletion of their data, and store EU resident data within "
                        "the EU (eu-central-1 recommended)."
                    ),
                )
            )

        if has_ccpa:
            applicable_regulations.append("CCPA")
            flags.append(
                ComplianceFlag(
                    regulation="CCPA",
                    severity="warning",
                    description="Application may process personal data of California residents.",
                    plain_language=(
                        "Your app may be subject to CCPA. California residents have the right "
                        "to know what personal data you collect, opt out of its sale, and "
                        "request deletion. Ensure your privacy policy covers these rights."
                    ),
                )
            )

        if has_lgpd:
            applicable_regulations.append("LGPD")
            flags.append(
                ComplianceFlag(
                    regulation="LGPD",
                    severity="warning",
                    description="Application may process personal data of Brazilian residents.",
                    plain_language=(
                        "Brazil's LGPD (similar to GDPR) requires a legal basis for processing "
                        "personal data, data subject rights (access, correction, deletion), and "
                        "a Data Protection Officer if processing at scale. "
                        "sa-east-1 (São Paulo) is recommended for data residency."
                    ),
                )
            )

        if has_hipaa:
            applicable_regulations.append("HIPAA")
            flags.append(
                ComplianceFlag(
                    regulation="HIPAA",
                    severity="warning",
                    description="Application may handle protected health information (PHI).",
                    plain_language=(
                        "Healthcare applications handling patient data must comply with HIPAA. "
                        "This requires a Business Associate Agreement (BAA) with AWS, encryption "
                        "at rest and in transit, audit logging, and strict access controls."
                    ),
                )
            )

        if has_pci:
            applicable_regulations.append("PCI-DSS")
            flags.append(
                ComplianceFlag(
                    regulation="PCI-DSS",
                    severity="warning",
                    description="Application may handle payment card data.",
                    plain_language=(
                        "Applications processing payment card data must comply with PCI-DSS. "
                        "Consider using a PCI-compliant payment processor (e.g. Stripe) to "
                        "minimize your compliance scope, and never store raw card numbers."
                    ),
                )
            )

        # If no regulations detected, add a general info flag
        if not applicable_regulations:
            applicable_regulations.append("General")
            flags.append(
                ComplianceFlag(
                    regulation="General",
                    severity="info",
                    description="No specific compliance regulations detected.",
                    plain_language=(
                        "No specific compliance requirements were detected from your description. "
                        "Standard AWS security best practices apply: use IAM least-privilege, "
                        "enable CloudTrail, and encrypt data at rest and in transit."
                    ),
                )
            )

        # Determine recommended region
        if has_gdpr:
            recommended_region = "eu-central-1"
            region_justification = (
                "EU (Frankfurt) is recommended to satisfy GDPR data residency requirements "
                "for EU resident personal data."
            )
        elif has_lgpd:
            recommended_region = "sa-east-1"
            region_justification = (
                "South America (São Paulo) is recommended to satisfy LGPD data residency "
                "requirements for Brazilian resident personal data."
            )
        else:
            recommended_region = "us-east-1"
            region_justification = (
                "US East (N. Virginia) offers the lowest cost and broadest service availability "
                "with no specific data residency requirements detected."
            )

        # Build region comparison — always include us-east-1 + recommended region
        comparison_regions = ["us-east-1"]
        if recommended_region != "us-east-1":
            comparison_regions.append(recommended_region)

        region_comparison = [_region_item(r) for r in comparison_regions]

        compliance_check = ComplianceCheck(
            applicable_regulations=applicable_regulations,
            flags=flags,
            recommended_region=recommended_region,
            region_justification=region_justification,
            region_comparison=region_comparison,
        )
        return compliance_check, False

    except Exception:
        empty = ComplianceCheck(
            applicable_regulations=[],
            flags=[],
            recommended_region="",
            region_justification="",
            region_comparison=[],
        )
        return empty, True

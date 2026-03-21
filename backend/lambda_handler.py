"""
Kaguide AI — Lambda handler entry point.

Stateless pipeline:
  parse → Bedrock intent → Bedrock suggest → pricing → Amazon Q
       → compliance → IAM → build response

IMPORTANT: User-submitted description text is NEVER logged anywhere in this module.
"""
from __future__ import annotations

import json

from request_parser import parse_request
from bedrock_pipeline import invoke_bedrock_intent, invoke_bedrock_suggest, BedrockError
from pricing import fetch_pricing
from amazon_q_client import invoke_amazon_q
from compliance_engine import run_compliance
from iam_generator import generate_iam
from models import AnalysisResponse, PartialFailure

_CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def _json_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": _CORS_HEADERS,
        "body": json.dumps(body),
    }


def handler(event: dict, context) -> dict:
    """AWS Lambda entry point."""

    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": _CORS_HEADERS, "body": ""}

    # 1. Parse and validate request — 400 on ValueError
    try:
        description = parse_request(event)
    except ValueError as exc:
        return _json_response(400, {"error": "VALIDATION_ERROR", "message": str(exc)})

    # 2. Bedrock intent + suggestion — 502 on BedrockError
    try:
        intent_attrs = invoke_bedrock_intent(description)
        suggestion = invoke_bedrock_suggest(intent_attrs)
    except BedrockError as exc:
        return _json_response(502, {"error": "BEDROCK_ERROR", "message": exc.message})

    # Initialise partial_failure flags
    partial_failure = PartialFailure(compliance=False, amazon_q=False, pricing=False)

    # 3. Pricing — sets partial_failure.pricing on full failure
    cost_estimate, pricing_failed = fetch_pricing(suggestion)
    if pricing_failed:
        partial_failure["pricing"] = True

    # 4. Amazon Q summary — sets amazon_q_fallback + partial_failure.amazon_q
    amazon_q_summary, is_fallback = invoke_amazon_q(suggestion)
    amazon_q_fallback = is_fallback
    if is_fallback:
        partial_failure["amazon_q"] = True

    # 5. Compliance — sets partial_failure.compliance on exception
    compliance_check, compliance_failed = run_compliance(description, suggestion)
    if compliance_failed:
        partial_failure["compliance"] = True

    # 6. IAM generation (never raises — returns minimal valid policy on error)
    iam_export = generate_iam(suggestion)

    # 7. Assemble and return the full AnalysisResponse
    analysis_response = AnalysisResponse(
        architecture_suggestion=suggestion,
        cost_estimate=cost_estimate,
        compliance_check=compliance_check,
        iam_export=iam_export,
        amazon_q_summary=amazon_q_summary,
        amazon_q_fallback=amazon_q_fallback,
        partial_failure=partial_failure,
    )

    return _json_response(200, analysis_response)  # type: ignore[arg-type]

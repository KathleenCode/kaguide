"""
Kaguide AI — Bedrock pipeline stages.

IMPORTANT: User-submitted description text is NEVER logged in this module.
"""
from __future__ import annotations

import boto3
import json
from typing import Any

from models import ArchitectureSuggestion

NOVA_LITE_MODEL_ID = "amazon.nova-lite-v1:0"


class BedrockError(Exception):
    """Raised when any Bedrock invocation fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def _bedrock_client():
    return boto3.client("bedrock-runtime")


def invoke_bedrock_intent(desc: str) -> dict:
    """Call Amazon Bedrock Nova Lite to parse intent from a plain-language description.

    Returns a dict with keys:
        user_scale            – estimated monthly active users (int)
        data_types            – list of data type strings (e.g. ["relational", "files"])
        latency_requirement   – "low" | "medium" | "high"
        compliance_hints      – list of compliance keywords (e.g. ["GDPR", "healthcare"])
        primary_use_case      – short string (e.g. "e-commerce")
        geographic_scope      – "global" | "regional" | "local"

    Raises:
        BedrockError: on any exception during the Bedrock call or response parsing.

    NOTE: The description text is never logged.
    """
    prompt = (
        "You are an AWS solutions architect assistant. "
        "Analyze the following application description and extract structured intent attributes. "
        "Return ONLY a valid JSON object with exactly these keys:\n"
        "  user_scale: integer (estimated monthly active users)\n"
        "  data_types: array of strings (e.g. [\"relational\", \"files\", \"real-time\", \"object\"])\n"
        "  latency_requirement: one of \"low\", \"medium\", or \"high\"\n"
        "  compliance_hints: array of compliance keyword strings detected (e.g. [\"GDPR\", \"healthcare\", \"PCI\"])\n"
        "  primary_use_case: short string (e.g. \"e-commerce\", \"collaboration\", \"analytics\")\n"
        "  geographic_scope: one of \"global\", \"regional\", or \"local\"\n\n"
        "Application description:\n"
        f"{desc}\n\n"
        "Respond with only the JSON object, no markdown, no explanation."
    )

    try:
        client = _bedrock_client()
        response = client.converse(
            modelId=NOVA_LITE_MODEL_ID,
            messages=[
                {
                    "role": "user",
                    "content": [{"text": prompt}],
                }
            ],
        )
        output_text: str = response["output"]["message"]["content"][0]["text"]
        # Strip markdown code fences if present
        cleaned = output_text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            # Remove first and last fence lines
            cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        intent_attrs: dict = json.loads(cleaned)
    except Exception as exc:
        raise BedrockError(f"Intent parsing failed: {type(exc).__name__}") from exc

    return intent_attrs


def invoke_bedrock_suggest(attrs: dict) -> ArchitectureSuggestion:
    """Call Amazon Bedrock Nova Lite to generate an ArchitectureSuggestion from intent attributes.

    Returns an ArchitectureSuggestion TypedDict with:
        services      – non-empty array of {id, name, purpose, category}
        alternatives  – map of service_id → [{name, reason}]
        tradeoffs     – map of service_id → string explanation
        cost_drivers  – array of strings

    Raises:
        BedrockError: on any exception during the Bedrock call or response parsing.
    """
    prompt = (
        "You are an AWS solutions architect assistant. "
        "Given the following application intent attributes, recommend an optimized AWS architecture. "
        "Return ONLY a valid JSON object with exactly these keys:\n"
        "  services: array of objects, each with keys id (string), name (string), purpose (string), category (string). "
        "Must contain at least one entry.\n"
        "  alternatives: object mapping each service id to an array of {name: string, reason: string} alternatives.\n"
        "  tradeoffs: object mapping each service id to a string explanation of trade-offs.\n"
        "  cost_drivers: array of strings listing the main cost drivers.\n\n"
        "Intent attributes:\n"
        f"{json.dumps(attrs, indent=2)}\n\n"
        "Respond with only the JSON object, no markdown, no explanation."
    )

    try:
        client = _bedrock_client()
        response = client.converse(
            modelId=NOVA_LITE_MODEL_ID,
            messages=[
                {
                    "role": "user",
                    "content": [{"text": prompt}],
                }
            ],
        )
        output_text: str = response["output"]["message"]["content"][0]["text"]
        # Strip markdown code fences if present
        cleaned = output_text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        suggestion: dict = json.loads(cleaned)
    except Exception as exc:
        raise BedrockError(f"Architecture suggestion failed: {type(exc).__name__}") from exc

    # Validate non-empty services array
    if not suggestion.get("services"):
        raise BedrockError("Architecture suggestion returned empty services array")

    return suggestion  # type: ignore[return-value]

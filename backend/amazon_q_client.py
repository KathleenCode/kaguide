"""
Kaguide AI — Amazon Q / Bedrock trade-off summary stage.

Uses Amazon Bedrock Nova Lite to generate a plain-language trade-off summary.
Falls back to a static summary derived from the suggestion's tradeoffs on any exception.
Summary is always ≤ 300 words.
"""
from __future__ import annotations

import json
from typing import Tuple

import boto3

from models import ArchitectureSuggestion

NOVA_LITE_MODEL_ID = "amazon.nova-lite-v1:0"
_MAX_WORDS = 300


def _truncate_to_words(text: str, max_words: int = _MAX_WORDS) -> str:
    """Truncate text to at most max_words words."""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words])


def _static_fallback(suggestion: ArchitectureSuggestion) -> str:
    """Build a static summary from the suggestion's tradeoffs map."""
    tradeoffs = suggestion.get("tradeoffs", {})
    services = suggestion.get("services", [])

    # Pick top 3 services that have tradeoff entries
    lines = []
    for svc in services[:3]:
        svc_id = svc.get("id", "")
        svc_name = svc.get("name", svc_id)
        note = tradeoffs.get(svc_id, "")
        if note:
            lines.append(f"{svc_name}: {note}")

    if not lines:
        # Last resort: join all tradeoff values
        lines = list(tradeoffs.values())[:3]

    summary = " | ".join(lines) if lines else "No trade-off information available."
    return _truncate_to_words(summary)


def invoke_amazon_q(suggestion: ArchitectureSuggestion) -> Tuple[str, bool]:
    """Generate a plain-language trade-off summary using Amazon Bedrock Nova Lite.

    Returns:
        (summary_text, is_fallback)
        is_fallback is True when the Bedrock call failed and the static fallback was used.

    Summary is always ≤ 300 words. Never raises.
    """
    try:
        tradeoffs = suggestion.get("tradeoffs", {})
        services = suggestion.get("services", [])

        # Build a concise prompt focused on the top 3 trade-offs
        top3_services = services[:3]
        tradeoff_lines = []
        for svc in top3_services:
            svc_id = svc.get("id", "")
            svc_name = svc.get("name", svc_id)
            note = tradeoffs.get(svc_id, "")
            if note:
                tradeoff_lines.append(f"- {svc_name}: {note}")

        tradeoff_text = "\n".join(tradeoff_lines) if tradeoff_lines else "No specific trade-offs provided."

        prompt = (
            "You are a friendly AWS cloud advisor explaining architecture trade-offs to a non-expert developer. "
            "Summarize the following top trade-offs in plain language, avoiding unexplained jargon. "
            "Keep your response to at most 250 words. Be concise and practical.\n\n"
            "Trade-offs to summarize:\n"
            f"{tradeoff_text}\n\n"
            "Write a clear, friendly summary paragraph."
        )

        client = boto3.client("bedrock-runtime")
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
        summary = _truncate_to_words(output_text.strip())
        return summary, False

    except Exception:
        fallback = _static_fallback(suggestion)
        return fallback, True

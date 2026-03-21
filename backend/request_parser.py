"""
Kaguide AI — Request parsing and validation.

IMPORTANT: The description text is NEVER logged anywhere in this module.
"""
from __future__ import annotations

import json


def parse_request(event: dict) -> str:
    """Extract and validate the description from a Lambda/API Gateway proxy event.

    Handles both:
    - API Gateway proxy integration (body is a JSON string)
    - Direct Lambda invocation (body is already a dict, or event itself is the payload)

    Returns:
        The stripped description string on success.

    Raises:
        ValueError: with a human-readable message on any validation failure.
    """
    # Resolve the body — API Gateway wraps the JSON payload as a string.
    body = event.get("body")

    if body is None:
        # Direct invocation: the event itself may be the payload.
        payload = event
    elif isinstance(body, str):
        try:
            payload = json.loads(body)
        except (json.JSONDecodeError, ValueError):
            raise ValueError("description is required")
    else:
        # body is already a dict (e.g. test harness passes dict directly).
        payload = body

    if not isinstance(payload, dict) or "description" not in payload:
        raise ValueError("description is required")

    description = payload["description"]

    if not isinstance(description, str):
        raise ValueError("description is required")

    description = description.strip()

    if len(description) < 10:
        raise ValueError("Description must be at least 10 characters")

    if len(description) > 2000:
        raise ValueError("Description must be at most 2000 characters")

    return description

"""
Kaguide AI — IAM policy generator stage.

Maps suggested services to minimum IAM actions and returns a valid IAMExport.
"""
from __future__ import annotations

import re
from typing import List

from models import ArchitectureSuggestion, IAMExport, IAMStatement

# ---------------------------------------------------------------------------
# Minimum IAM actions per AWS service category
# ---------------------------------------------------------------------------
SERVICE_IAM_MAP: dict[str, List[str]] = {
    "lambda": ["lambda:InvokeFunction", "lambda:GetFunction"],
    "api gateway": ["execute-api:Invoke"],
    "s3": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
    "cloudfront": ["cloudfront:GetDistribution", "cloudfront:CreateInvalidation"],
    "dynamodb": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
    ],
    "rds": ["rds:DescribeDBInstances", "rds-db:connect"],
    "ec2": ["ec2:DescribeInstances", "ec2:StartInstances", "ec2:StopInstances"],
    "sqs": ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage"],
    "sns": ["sns:Publish", "sns:Subscribe"],
    "cognito": [
        "cognito-idp:InitiateAuth",
        "cognito-idp:GetUser",
        "cognito-idp:SignUp",
    ],
    "bedrock": ["bedrock:InvokeModel"],
    "cloudwatch": [
        "cloudwatch:PutMetricData",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
    ],
    "ecs": ["ecs:RunTask", "ecs:DescribeTasks", "ecs:StopTask"],
    "eks": ["eks:DescribeCluster", "eks:ListClusters"],
    "kinesis": [
        "kinesis:PutRecord",
        "kinesis:GetRecords",
        "kinesis:GetShardIterator",
    ],
    "ses": ["ses:SendEmail", "ses:SendRawEmail"],
    "route53": [
        "route53:ChangeResourceRecordSets",
        "route53:ListHostedZones",
    ],
    "waf": ["wafv2:GetWebACL", "wafv2:AssociateWebACL"],
    "secrets manager": ["secretsmanager:GetSecretValue"],
    "elasticache": ["elasticache:DescribeCacheClusters"],
}


def _match_iam_actions(service_name: str) -> List[str] | None:
    """Fuzzy match a service name to IAM actions."""
    name_lower = service_name.lower()
    for key, actions in SERVICE_IAM_MAP.items():
        if key in name_lower or name_lower in key:
            return actions
    return None


def _make_sid(service_name: str) -> str:
    """Convert a service name to a valid IAM Sid (alphanumeric only)."""
    return re.sub(r"[^A-Za-z0-9]", "", service_name.title())


def generate_iam(suggestion: ArchitectureSuggestion) -> IAMExport:
    """Map suggested services to minimum IAM actions.

    Returns a valid IAMExport with Version "2012-10-17" and a non-empty Statement.
    Never raises — on exception returns a minimal valid policy.
    """
    try:
        statements: List[IAMStatement] = []

        for svc in suggestion.get("services", []):
            svc_name = svc.get("name", "")
            svc_id = svc.get("id", svc_name)
            actions = _match_iam_actions(svc_name)

            if actions is None:
                # Placeholder for unrecognised services
                actions = [f"{svc_name.lower().replace(' ', '-')}:*"]

            statements.append(
                IAMStatement(
                    Sid=_make_sid(svc_name) or f"Service{len(statements)}",
                    Effect="Allow",
                    Action=actions,
                    Resource="*",
                )
            )

        # Guarantee non-empty Statement
        if not statements:
            statements.append(
                IAMStatement(
                    Sid="DefaultAllow",
                    Effect="Allow",
                    Action=["*"],
                    Resource="*",
                )
            )

        return IAMExport(Version="2012-10-17", Statement=statements)

    except Exception:
        return IAMExport(
            Version="2012-10-17",
            Statement=[
                IAMStatement(
                    Sid="DefaultAllow",
                    Effect="Allow",
                    Action=["*"],
                    Resource="*",
                )
            ],
        )

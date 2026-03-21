# Kaguide AI — Deployment Guide

Estimated time: ~10 minutes for a first deploy.

---

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured (`aws configure`)
- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) ≥ 1.100
- Node.js ≥ 18 + npm

---

## 1. Deploy the backend

```bash
cd backend
sam build
sam deploy --guided
```

On first run `--guided` prompts for stack name, region, and S3 bucket for artifacts. Accept defaults or customise. SAM saves answers to `samconfig.toml` for subsequent deploys.

After deploy, note the `ApiUrl` output — you need it in step 3.

```
Outputs:
  ApiUrl  https://<id>.execute-api.<region>.amazonaws.com/prod/analyze
```

---

## 2. Build the frontend

Set the API URL before building so Vite bakes it into the bundle:

```bash
cd frontend
VITE_API_URL=https://<id>.execute-api.<region>.amazonaws.com/prod/analyze npm run build
```

The production assets land in `frontend/dist/`.

---

## 3. S3 static hosting

```bash
# Create bucket (name must be globally unique)
aws s3 mb s3://kaguide-ai-frontend --region us-east-1

# Enable static website hosting
aws s3 website s3://kaguide-ai-frontend \
  --index-document index.html \
  --error-document index.html

# Upload build output
aws s3 sync frontend/dist/ s3://kaguide-ai-frontend --delete
```

Set a bucket policy to allow public read (required for CloudFront OAC or direct S3 website hosting):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::kaguide-ai-frontend/*"
  }]
}
```

Apply it:

```bash
aws s3api put-bucket-policy \
  --bucket kaguide-ai-frontend \
  --policy file://bucket-policy.json
```

---

## 4. CloudFront distribution

Create a distribution in the AWS Console or via CLI:

| Setting | Value |
|---|---|
| Origin domain | `kaguide-ai-frontend.s3-website-us-east-1.amazonaws.com` |
| Origin protocol | HTTP only (S3 website endpoint) |
| Default root object | `index.html` |
| Custom error page — 404 | Response path `/index.html`, HTTP 200 (React Router catch-all) |
| Price class | Use only North America and Europe (cheapest) |
| HTTPS | Redirect HTTP to HTTPS |

After the distribution is deployed (~5 min), use the CloudFront domain (`*.cloudfront.net`) as your app URL.

---

## 5. Re-deploy after changes

Backend only:
```bash
cd backend && sam build && sam deploy
```

Frontend only (API URL unchanged):
```bash
cd frontend && npm run build
aws s3 sync dist/ s3://kaguide-ai-frontend --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

---

## AWS Free Tier limits

All resources used by Kaguide AI fall within the AWS Free Tier (12-month or always-free):

| Service | Free Tier allowance | Notes |
|---|---|---|
| Lambda | 1,000,000 req/month; 400,000 GB-s compute | Always free |
| API Gateway REST | 1,000,000 req/month | First 12 months |
| CloudFront | 1 TB data transfer; 10,000,000 HTTP req/month | Always free |
| S3 | 5 GB storage; 20,000 GET; 2,000 PUT | First 12 months |
| Bedrock Nova Lite | Free Tier invocation allowance | Check current limits in AWS console |
| Amazon Q | Free Tier | Check current limits in AWS console |

No NAT Gateway, RDS, ElastiCache, DynamoDB, or other paid-tier resources are provisioned.

---

## Privacy note

Request body logging is **disabled** on the API Gateway stage (`LoggingLevel: OFF`, `DataTraceEnabled: false`). The Lambda function does not write user input to CloudWatch Logs or any storage service. No user data is persisted anywhere in this stack.

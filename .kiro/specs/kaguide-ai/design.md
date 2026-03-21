# Design Document: Kaguide AI

## Overview

Kaguide AI is a fully stateless web application that translates plain-language application descriptions into optimized AWS architecture recommendations. It combines Amazon Bedrock (Nova Lite) for intent parsing and service suggestion, the AWS Price List API for real-time cost data, and Amazon Q for plain-language trade-off explanations — all within a single Lambda invocation per user request.

The system has no database, no session storage, and no persistent user data. Every request is self-contained: the frontend sends a description, the backend processes it end-to-end, and the response carries everything the UI needs to render results, costs, compliance flags, and an IAM policy export.

Key design goals:
- Zero-persistence: no user data written anywhere, ever
- Free Tier only: every AWS resource stays within Free Tier limits
- Single-invocation backend: one API call returns the full payload
- Client-side interactivity: traffic slider and spike simulator recalculate costs locally using pricing data already in the response

---

## Architecture

### System Overview

```
User Browser
    │
    ▼
CloudFront (CDN + HTTPS)
    │
    ├──► S3 (static assets: React/Vite build)
    │
    └──► API Gateway (REST, /analyze POST)
              │
              ▼
         Lambda (Python, 512MB, 30s timeout)
              │
              ├──► Amazon Bedrock (Nova Lite) — intent parsing + service suggestion
              ├──► AWS Price List API (boto3) — per-service pricing
              ├──► Amazon Q — plain-language trade-off summary
              └──► (internal) Compliance engine + IAM generator (pure Python, no external call)
```

### Request Lifecycle

1. User types a description and submits on the Homepage.
2. Frontend POSTs `{ "description": "..." }` to API Gateway within 500ms.
3. API Gateway proxies to Lambda.
4. Lambda runs sequentially:
   a. Bedrock: parse intent → extract attributes (scale, data type, latency needs)
   b. Bedrock: generate `ArchitectureSuggestion` (services, alternatives, tradeoffs)
   c. Price List API: fetch pricing for each suggested service
   d. Amazon Q: generate plain-language trade-off summary (with static fallback)
   e. Compliance engine: keyword/heuristic scan → `ComplianceCheck`
   f. IAM generator: map services → minimum IAM actions → `IAMExport`
5. Lambda assembles a single `AnalysisResponse` JSON and returns it.
6. Frontend navigates to Results page and renders all sections from the response.
7. All subsequent interactivity (slider, spike simulator) runs client-side using pricing data from step 5.

### AWS Free Tier Constraints

| Resource | Free Tier Limit | Usage Pattern |
|---|---|---|
| Lambda | 1M req/month, 400K GB-s compute | One invocation per user session |
| API Gateway (REST) | 1M req/month | One request per session |
| CloudFront | 1TB transfer, 10M HTTP req/month | Static asset delivery |
| S3 | 5GB storage, 20K GET, 2K PUT | Static hosting only |
| Bedrock Nova Lite | Free Tier invocation allowance | 2 invocations per Lambda call |
| Amazon Q | Free Tier | 1 invocation per Lambda call |

No NAT Gateway, RDS, ElastiCache, DynamoDB, or any paid-tier resource is provisioned.

---

## Components and Interfaces

### Backend: Lambda Handler

Single Python Lambda function with internal pipeline stages:

```
handler(event, context)
  └── parse_request(event)           → description: str
  └── invoke_bedrock_intent(desc)    → IntentAttributes
  └── invoke_bedrock_suggest(attrs)  → ArchitectureSuggestion
  └── fetch_pricing(services)        → PricingMap
  └── invoke_amazon_q(suggestion)    → str (summary, ≤300 words)
  └── run_compliance(desc, suggestion) → ComplianceCheck
  └── generate_iam(suggestion)       → IAMExport
  └── build_response(...)            → AnalysisResponse
```

Each stage is a pure function. If Amazon Q fails, `invoke_amazon_q` returns a static fallback derived from `tradeoffs` and sets `amazon_q_fallback: true` in the response. If Price List API returns no data for a service, that service is marked `pricing_unavailable: true` and excluded from totals.

**API Contract:**

```
POST /analyze
Content-Type: application/json

Request:
{ "description": string }   // 10–2000 chars

Response 200:
AnalysisResponse (see Data Models)

Response 400:
{ "error": "VALIDATION_ERROR", "message": "..." }

Response 502:
{ "error": "BEDROCK_ERROR", "message": "..." }

Response 504:
{ "error": "TIMEOUT", "message": "..." }
```

### Frontend: Page Structure

```
App (React Router)
├── <Navbar />                    — present on all pages
├── / → <HomePage />
│       ├── <DescriptionInput />  — textarea, 2000 char limit, validation
│       └── <SubmitButton />
├── /results → <ResultsPage />
│       ├── <ServiceCard />[]     — one per suggested service
│       ├── <FreeTierIndicator /> — per service
│       ├── <TrafficSlider />     — 10–1,000,000 MAU
│       ├── <ViralSpikeSimulator />
│       ├── <CostCurveChart />    — cost vs MAU visualization
│       ├── <AmazonQSummary />    — plain-language section
│       └── <CostBreakdownTable />
├── /compliance → <CompliancePage />
│       ├── <RegulationList />
│       ├── <ComplianceFlag />[]  — red accent on violations
│       └── <RegionComparison />
├── /iam-export → <IAMExportPage />
│       ├── <PolicyViewer />      — formatted JSON
│       └── <CopyButton />
└── <Footer />                    — present on all pages
```

### Frontend: State Management

No localStorage, sessionStorage, or cookies. All state lives in React memory for the active session only.

```
AppContext (React Context)
├── description: string           — persisted across navigation for back-nav restore
├── analysisResponse: AnalysisResponse | null
├── currentMAU: number            — Traffic Slider value (default: 1000)
├── spikeMultiplier: number | null — null = inactive, 10/25/50/100 = active
└── isLoading: boolean
```

`ResultsPage`, `CompliancePage`, and `IAMExportPage` all read from `AppContext`. If `analysisResponse` is null when navigating to any of these pages, the router redirects to `/`.

### Frontend: Cost Recalculation Logic

Pricing data returned from Lambda includes a `unit_price` per service (USD per unit per month). The client recalculates on every slider or spike change:

```
effectiveMAU = currentMAU * (spikeMultiplier ?? 1)

for each service in analysisResponse.cost_estimate.services:
  units = effectiveMAU * service.units_per_mau
  cost  = units * service.unit_price
  tier  = units <= service.free_tier_limit ? "green"
        : units <= service.free_tier_limit * 1.2 ? "amber"
        : "red"
```

Total = sum of all non-`pricing_unavailable` service costs.

The cost curve chart pre-computes costs at 20 evenly-spaced MAU points across [10, 1,000,000] on initial render.

### Frontend: Viral Spike Simulator

Discrete multiplier selector: 10x | 25x | 50x | 100x. Activating sets `spikeMultiplier` in context. All cost/tier displays re-derive from `effectiveMAU`. A persistent banner shows "⚡ Spike Simulation Active — 25x" while active. Deactivating resets `spikeMultiplier` to null, restoring pre-spike values.

---

## Data Models

### AnalysisResponse

Top-level response from Lambda to Frontend.

```json
{
  "architecture_suggestion": ArchitectureSuggestion,
  "cost_estimate": CostEstimate,
  "compliance_check": ComplianceCheck,
  "iam_export": IAMExport,
  "amazon_q_summary": string,
  "amazon_q_fallback": boolean,
  "partial_failure": {
    "compliance": boolean,
    "amazon_q": boolean,
    "pricing": boolean
  }
}
```

### ArchitectureSuggestion

```json
{
  "services": [
    {
      "id": string,
      "name": string,
      "purpose": string,
      "category": string
    }
  ],
  "alternatives": {
    "<service_id>": [
      { "name": string, "reason": string }
    ]
  },
  "tradeoffs": {
    "<service_id>": string
  },
  "cost_drivers": [string]
}
```

### CostEstimate

```json
{
  "services": [
    {
      "service_id": string,
      "monthly_cost_usd": number,
      "unit_price": number,
      "units_per_mau": number,
      "free_tier_limit": number,
      "pricing_unavailable": boolean
    }
  ],
  "total_monthly_cost_usd": number,
  "top_cost_drivers": [string],
  "base_mau": number
}
```

### ComplianceCheck

```json
{
  "applicable_regulations": [string],
  "flags": [
    {
      "regulation": string,
      "severity": "violation" | "warning" | "info",
      "description": string,
      "plain_language": string
    }
  ],
  "recommended_region": string,
  "region_justification": string,
  "region_comparison": [
    {
      "region": string,
      "estimated_cost_delta_pct": number,
      "latency_note": string
    }
  ]
}
```

### IAMExport

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": string,
      "Effect": "Allow",
      "Action": [string],
      "Resource": "*"
    }
  ]
}
```

This is a valid IAM policy document. Each `Statement` entry corresponds to one suggested service, grouping its minimum required actions.


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Input validation rejects short descriptions

*For any* string of length 0–9 characters (including empty string and whitespace-only strings), the frontend validation function SHALL reject the input and return a validation error, leaving the submission state unchanged.

**Validates: Requirements 1.4**

---

### Property 2: ArchitectureSuggestion structural invariant

*For any* valid intent parsed by the Lambda, the resulting `ArchitectureSuggestion` SHALL contain a non-empty `services` array, an `alternatives` map with at least one entry per service where applicable, and a `tradeoffs` map with an entry for each service.

**Validates: Requirements 2.1**

---

### Property 3: ArchitectureSuggestion round-trip serialization

*For any* valid `ArchitectureSuggestion` object, serializing it to JSON and then deserializing it SHALL produce an object that is deeply equal to the original.

**Validates: Requirements 2.2, 2.6**

---

### Property 4: Service card rendering completeness

*For any* `ArchitectureSuggestion` with N services, the rendered Results page SHALL contain exactly N service cards, each including the service name, purpose, trade-off summary, and a `FreeTierIndicator` element.

**Validates: Requirements 2.3, 2.4**

---

### Property 5: CostEstimate structural invariant

*For any* `ArchitectureSuggestion` with N services, the returned `CostEstimate` SHALL contain an entry for each service (or mark it `pricing_unavailable`), a `total_monthly_cost_usd` that equals the sum of all non-unavailable service costs, and a `top_cost_drivers` array of length ≤ 3.

**Validates: Requirements 3.1, 3.2, 3.7**

---

### Property 6: Client-side cost recalculation correctness

*For any* integer MAU value in [10, 1,000,000] and any `CostEstimate` pricing data, the client-side recalculation function SHALL produce a total cost equal to the sum of `(MAU * units_per_mau * unit_price)` for all non-unavailable services, without issuing any network request.

**Validates: Requirements 3.3, 3.4**

---

### Property 7: Cost curve data coverage

*For any* `CostEstimate` pricing data, the cost curve generation function SHALL produce cost values at a minimum of 20 distinct MAU points spanning the full range [10, 1,000,000], with all values being non-negative numbers.

**Validates: Requirements 3.5**

---

### Property 8: Free Tier indicator classification

*For any* service and effective MAU (including spike-multiplied MAU), the `FreeTierIndicator` SHALL be:
- `"green"` when `effectiveMAU * units_per_mau <= free_tier_limit`
- `"amber"` when `free_tier_limit < effectiveMAU * units_per_mau <= free_tier_limit * 1.2`
- `"red"` when `effectiveMAU * units_per_mau > free_tier_limit * 1.2`

This property applies in both normal mode and spike simulation mode.

**Validates: Requirements 3.6, 4.2, 4.5**

---

### Property 9: Spike simulator round-trip

*For any* cost state and any valid spike multiplier (10, 25, 50, 100), activating the `ViralSpikeSimulator` and then immediately deactivating it SHALL restore all cost figures and `FreeTierIndicator` states to their exact pre-activation values.

**Validates: Requirements 4.4**

---

### Property 10: ComplianceCheck structural invariant

*For any* Lambda invocation that produces an `ArchitectureSuggestion`, the `ComplianceCheck` in the response SHALL contain a non-empty `applicable_regulations` array, a `flags` array (possibly empty), a non-empty `recommended_region` string, and a `region_comparison` array with at least two entries.

**Validates: Requirements 5.1, 5.2, 5.5**

---

### Property 11: GDPR flag on EU personal data

*For any* description that contains keywords indicating personal data of EU residents (e.g., "EU users", "European customers", "GDPR", "personal data"), the `ComplianceCheck` SHALL include at least one flag with `regulation: "GDPR"`.

**Validates: Requirements 5.6**

---

### Property 12: Violation rendering uses red indicator

*For any* `ComplianceCheck` containing a flag with `severity: "violation"`, the rendered Compliance page SHALL display that flag with a red accent indicator element.

**Validates: Requirements 5.4**

---

### Property 13: Amazon Q summary length constraint

*For any* `amazon_q_summary` string in the `AnalysisResponse`, the word count of that string SHALL be less than or equal to 300.

**Validates: Requirements 6.2**

---

### Property 14: Amazon Q summary always present

*For any* `AnalysisResponse`, the `amazon_q_summary` field SHALL be a non-empty string, regardless of whether the Amazon Q invocation succeeded or fell back to the static summary. When fallback is used, `amazon_q_fallback` SHALL be `true`.

**Validates: Requirements 6.1, 6.4**

---

### Property 15: IAMExport round-trip serialization

*For any* valid `ArchitectureSuggestion`, generating the `IAMExport` and then parsing the resulting JSON SHALL produce a policy document with `Version: "2012-10-17"`, a non-empty `Statement` array where each entry has `Effect`, `Action` (non-empty array), and `Resource` fields.

**Validates: Requirements 10.1, 10.4, 10.5**

---

### Property 16: Input description restored on back-navigation

*For any* description string entered on the Homepage, navigating to the Results page and then back to the Homepage SHALL result in the input field containing the original description string.

**Validates: Requirements 9.4**

---

### Property 17: Page structure invariant (navbar and footer)

*For any* rendered page in the application (Homepage, Results, Compliance, IAM Export), the rendered output SHALL contain both a `<Navbar>` element and a `<Footer>` element. The footer SHALL contain a privacy notice and a link to the IAM Export page.

**Validates: Requirements 9.3, 9.5**

---

### Property 18: Error messages do not expose internals

*For any* HTTP error response (4xx or 5xx) from the API, the user-facing error message rendered by the frontend SHALL not contain stack trace text, AWS ARN patterns, AWS resource identifiers, or internal Lambda error details.

**Validates: Requirements 12.1**

---

### Property 19: Partial failure shows amber indicators

*For any* `AnalysisResponse` where `partial_failure.compliance`, `partial_failure.amazon_q`, or `partial_failure.pricing` is `true`, the corresponding UI section SHALL render an amber indicator element and SHALL not crash or show an empty section.

**Validates: Requirements 12.3**

---

## Error Handling

### Lambda Error Strategy

Each pipeline stage has an independent error boundary:

| Stage | Failure Mode | Behavior |
|---|---|---|
| Bedrock intent parse | Exception | Return HTTP 502 with `BEDROCK_ERROR` |
| Bedrock suggestion | Exception | Return HTTP 502 with `BEDROCK_ERROR` |
| Price List API | No data for service | Mark service `pricing_unavailable: true`, continue |
| Price List API | Full failure | Set `partial_failure.pricing: true`, return zero costs |
| Amazon Q | Exception | Use static fallback from tradeoffs, set `amazon_q_fallback: true` |
| Compliance engine | Exception | Set `partial_failure.compliance: true`, return empty ComplianceCheck |
| IAM generator | Exception | Return empty Statement array, log error (no user data in log) |

Lambda never logs user-submitted text. Error logs contain only exception type and stage name.

### Frontend Error Strategy

- **Network error / no response**: Show "Unable to reach the service. Please check your connection and try again." with retry button.
- **HTTP 400**: Show validation message from response body.
- **HTTP 502**: Show "The analysis service encountered an error. Please try again." — no internal details.
- **HTTP 504 / timeout**: Show "The analysis is taking longer than expected." with retry button.
- **Partial response** (`partial_failure` flags): Render available sections normally; show amber "Section unavailable" placeholder for failed sections.
- **Fetch API not supported**: Detect on mount, show static compatibility notice, disable submit button.
- **Loading state**: Show spinner/progress indicator immediately on submit; hide on response or error.

### Validation

Frontend validates before submission:
- Description length: 10–2000 characters (trim whitespace before check)
- Empty/whitespace-only: rejected with inline message "Please enter a description of at least 10 characters."

Lambda validates on receipt:
- Description present and string type: return 400 if missing
- Description length 10–2000: return 400 if out of range

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests cover specific examples, integration points, and edge cases
- Property-based tests verify universal correctness across all inputs

### Property-Based Testing

**Library**: `hypothesis` (Python, for Lambda) and `fast-check` (TypeScript/JavaScript, for Frontend).

Each property-based test runs a minimum of 100 iterations. Each test is tagged with a comment referencing the design property it validates.

Tag format: `# Feature: kaguide-ai, Property {N}: {property_text}`

**Lambda property tests (hypothesis):**

| Property | Test Description |
|---|---|
| Property 3 | Generate random ArchitectureSuggestion dicts, serialize to JSON, deserialize, assert deep equality |
| Property 5 | Generate random service lists with pricing, assert CostEstimate total equals sum of non-unavailable costs |
| Property 11 | Generate descriptions with/without EU keywords, assert GDPR flag presence matches keyword presence |
| Property 13 | Generate random architecture suggestions, invoke Q summary builder, assert word count ≤ 300 |
| Property 14 | Simulate Q failure, assert summary is non-empty string and fallback flag is true |
| Property 15 | Generate random ArchitectureSuggestion, generate IAMExport, parse JSON, assert schema validity |

**Frontend property tests (fast-check):**

| Property | Test Description |
|---|---|
| Property 1 | Generate strings of length 0–9, assert validation rejects all |
| Property 4 | Generate random ArchitectureSuggestion, render ResultsPage, assert N cards with required fields |
| Property 6 | Generate random MAU in [10, 1M] and pricing data, assert recalculated total matches formula |
| Property 7 | Generate pricing data, assert cost curve has ≥20 points all in [0, ∞) |
| Property 8 | Generate service + MAU combinations, assert tier classification matches thresholds |
| Property 9 | Generate cost state + multiplier, activate spike, deactivate, assert state restored |
| Property 16 | Generate random description strings, simulate nav away and back, assert input restored |
| Property 17 | Render each page, assert Navbar and Footer present with required elements |
| Property 18 | Generate error responses, assert rendered message contains no ARN/stack trace patterns |
| Property 19 | Generate AnalysisResponse with partial_failure flags, assert amber indicators present |

### Unit Tests

Unit tests focus on specific examples and edge cases not covered by property tests:

**Lambda unit tests:**
- Bedrock failure returns HTTP 502 with correct shape (Requirement 1.5)
- Price List API full failure sets `partial_failure.pricing: true` (Requirement 3.7)
- Amazon Q fallback sets `amazon_q_fallback: true` (Requirement 6.4)
- Bedrock invocation uses Nova Lite model ID (Requirement 8.4)
- Lambda does not call any storage API (DynamoDB, S3 put, etc.) during normal execution (Requirement 7.1)

**Frontend unit tests:**
- Submit button disabled when description < 10 chars (Requirement 1.4)
- Navigating to Results with null analysisResponse redirects to `/` (Requirement 9.2)
- Four routes defined in router config (Requirement 9.1)
- Fetch API absence shows compatibility notice (Requirement 12.5)
- Timeout response shows retry control (Requirement 12.2)
- localStorage/sessionStorage empty after session actions (Requirements 7.4, 7.5)
- Spike banner visible when spikeMultiplier is set (Requirement 4.3)
- IAM Export page has copy-to-clipboard control (Requirement 10.3)
- Compliance page renders (Requirement 5.3)
- Loading indicator shown when isLoading is true (Requirement 12.4)
- Back navigation control present on Results page (Requirement 2.5)

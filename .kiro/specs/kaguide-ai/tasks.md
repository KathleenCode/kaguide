# Implementation Plan: Kaguide AI

## Overview

Incremental implementation of the Kaguide AI stateless web app: Python Lambda backend pipeline → React/Vite frontend pages and components → client-side interactivity → tests → UI polish → infrastructure config.

## Tasks

- [x] 1. Project scaffold
  - Create `/frontend` with `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, and `src/` skeleton
  - Create `/backend` with `requirements.txt` (boto3, hypothesis, pytest) and empty `lambda_handler.py`
  - Set up vitest + fast-check in frontend dev dependencies
  - _Requirements: 8.1, 9.1_

- [x] 2. Backend data models and request parsing
  - [x] 2.1 Define Python TypedDicts / dataclasses for `ArchitectureSuggestion`, `CostEstimate`, `ComplianceCheck`, `IAMExport`, `AnalysisResponse`
    - Include all fields from the design data models
    - _Requirements: 2.2, 3.2, 5.2, 10.1_
  - [x] 2.2 Implement `parse_request(event)` with validation (10–2000 chars, returns 400 on failure)
    - Lambda must not log description text
    - _Requirements: 1.3, 1.4, 7.2_
  - [ ]* 2.3 Write unit tests for `parse_request` — empty, short, long, valid inputs
    - _Requirements: 1.4_

- [x] 3. Backend Bedrock pipeline stages
  - [x] 3.1 Implement `invoke_bedrock_intent(desc)` calling Nova Lite to extract intent attributes
    - Use Nova Lite model ID; return HTTP 502 on exception
    - _Requirements: 1.3, 1.5, 8.4_
  - [x] 3.2 Implement `invoke_bedrock_suggest(attrs)` calling Nova Lite to produce `ArchitectureSuggestion`
    - Ensure services array is non-empty, alternatives and tradeoffs maps populated
    - _Requirements: 2.1, 2.2_
  - [ ]* 3.3 Write unit test: Bedrock failure returns HTTP 502 with `BEDROCK_ERROR` shape
    - _Requirements: 1.5_
  - [ ]* 3.4 Write unit test: Bedrock invocation uses Nova Lite model ID
    - _Requirements: 8.4_

- [x] 4. Backend pricing, Amazon Q, compliance, and IAM stages
  - [x] 4.1 Implement `fetch_pricing(services)` via boto3 Price List API
    - Mark service `pricing_unavailable: true` when no data; set `partial_failure.pricing` on full failure
    - _Requirements: 3.1, 3.7_
  - [x] 4.2 Implement `invoke_amazon_q(suggestion)` with static fallback on exception
    - Fallback derived from tradeoffs; set `amazon_q_fallback: true`; summary ≤ 300 words
    - _Requirements: 6.1, 6.2, 6.4_
  - [x] 4.3 Implement `run_compliance(desc, suggestion)` — keyword/heuristic scan for GDPR/CCPA/LGPD
    - Always include GDPR flag when EU-resident keywords detected; populate region_comparison with ≥ 2 entries
    - _Requirements: 5.1, 5.2, 5.6_
  - [x] 4.4 Implement `generate_iam(suggestion)` — map services to minimum IAM actions
    - Output valid IAM policy JSON with Version 2012-10-17 and non-empty Statement array
    - _Requirements: 10.1, 10.2, 10.4_
  - [x] 4.5 Implement `build_response(...)` assembling the full `AnalysisResponse` and returning it
    - No writes to DynamoDB, S3, or any persistent storage
    - _Requirements: 7.1, 2.2_
  - [ ]* 4.6 Write unit test: Price List API full failure sets `partial_failure.pricing: true`
    - _Requirements: 3.7_
  - [ ]* 4.7 Write unit test: Amazon Q failure sets `amazon_q_fallback: true`
    - _Requirements: 6.4_
  - [ ]* 4.8 Write unit test: Lambda does not call any storage API during normal execution
    - _Requirements: 7.1_

- [ ] 5. Backend property-based tests (hypothesis)
  - [ ]* 5.1 Property 3 — ArchitectureSuggestion round-trip serialization
    - Generate random `ArchitectureSuggestion` dicts, serialize → deserialize, assert deep equality
    - `# Feature: kaguide-ai, Property 3: ArchitectureSuggestion round-trip serialization`
    - _Requirements: 2.2, 2.6_
  - [ ]* 5.2 Property 5 — CostEstimate total equals sum of non-unavailable service costs
    - Generate random service lists with pricing, assert total matches formula
    - `# Feature: kaguide-ai, Property 5: CostEstimate structural invariant`
    - _Requirements: 3.1, 3.2, 3.7_
  - [ ]* 5.3 Property 11 — GDPR flag present when EU keywords in description
    - Generate descriptions with/without EU keywords, assert GDPR flag presence matches
    - `# Feature: kaguide-ai, Property 11: GDPR flag on EU personal data`
    - _Requirements: 5.6_
  - [ ]* 5.4 Property 13 — Amazon Q summary word count ≤ 300
    - Generate random architecture suggestions, invoke summary builder, assert word count
    - `# Feature: kaguide-ai, Property 13: Amazon Q summary length constraint`
    - _Requirements: 6.2_
  - [ ]* 5.5 Property 14 — Amazon Q summary always non-empty; fallback flag set on failure
    - Simulate Q failure, assert summary is non-empty string and `amazon_q_fallback: true`
    - `# Feature: kaguide-ai, Property 14: Amazon Q summary always present`
    - _Requirements: 6.1, 6.4_
  - [ ]* 5.6 Property 15 — IAMExport round-trip produces valid policy schema
    - Generate random `ArchitectureSuggestion`, generate IAMExport, parse JSON, assert schema
    - `# Feature: kaguide-ai, Property 15: IAMExport round-trip serialization`
    - _Requirements: 10.1, 10.4, 10.5_

- [x] 6. Checkpoint — backend complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 7. Frontend AppContext, routing, and global layout
  - [x] 7.1 Create `AppContext` with `description`, `analysisResponse`, `currentMAU`, `spikeMultiplier`, `isLoading` state
    - No localStorage/sessionStorage/cookie writes
    - _Requirements: 7.4, 9.4_
  - [x] 7.2 Set up React Router with four routes: `/`, `/results`, `/compliance`, `/iam-export`
    - Redirect to `/` when `analysisResponse` is null on protected routes
    - _Requirements: 9.1, 9.2_
  - [x] 7.3 Implement `<Navbar />` with links to all pages and back/previous control
    - _Requirements: 9.3_
  - [x] 7.4 Implement `<Footer />` with privacy notice and link to IAM Export page
    - _Requirements: 9.5_
  - [ ]* 7.5 Write unit test: four routes defined in router config
    - _Requirements: 9.1_
  - [ ]* 7.6 Write unit test: null `analysisResponse` redirects to `/`
    - _Requirements: 9.2_
  - [ ]* 7.7 Write unit test: localStorage/sessionStorage empty after session actions
    - _Requirements: 7.4, 7.5_

- [x] 8. Homepage and input validation
  - [x] 8.1 Implement `<HomePage />` with textarea (2000 char limit), submit button, and inline validation
    - Trim whitespace before length check; disable submit when < 10 chars
    - POST to API Gateway within 500ms of submit; set `isLoading: true`
    - _Requirements: 1.1, 1.2, 1.4_
  - [x] 8.2 Implement Fetch API detection on mount — show compatibility notice and disable submit if absent
    - _Requirements: 12.5_
  - [x] 8.3 Implement loading state: show progress indicator when `isLoading` is true
    - _Requirements: 12.4_
  - [ ]* 8.4 Write unit test: submit button disabled when description < 10 chars
    - _Requirements: 1.4_
  - [ ]* 8.5 Write unit test: Fetch API absence shows compatibility notice
    - _Requirements: 12.5_
  - [ ]* 8.6 Write unit test: loading indicator shown when `isLoading` is true
    - _Requirements: 12.4_

- [ ] 9. Frontend property-based tests — input validation and navigation
  - [ ]* 9.1 Property 1 — validation rejects strings of length 0–9
    - Generate strings of length 0–9, assert validation function returns error
    - `# Feature: kaguide-ai, Property 1: Input validation rejects short descriptions`
    - _Requirements: 1.4_
  - [ ]* 9.2 Property 16 — description restored on back-navigation
    - Generate random description strings, simulate nav to Results and back, assert input restored
    - `# Feature: kaguide-ai, Property 16: Input description restored on back-navigation`
    - _Requirements: 9.4_
  - [ ]* 9.3 Property 17 — Navbar and Footer present on every page
    - Render each page, assert `<Navbar>` and `<Footer>` present with required elements
    - `# Feature: kaguide-ai, Property 17: Page structure invariant`
    - _Requirements: 9.3, 9.5_

- [x] 10. Shared UI components
  - [x] 10.1 Implement `<FreeTierIndicator status="green"|"amber"|"red" />` with color-coded visual
    - _Requirements: 2.4, 3.6, 4.5_
  - [x] 10.2 Implement `<ServiceCard service={...} indicator={...} />` showing name, purpose, tradeoff summary
    - _Requirements: 2.3_
  - [x] 10.3 Implement `<TrafficSlider />` — integer range 10–1,000,000, updates `currentMAU` in context
    - _Requirements: 3.3, 3.4_
  - [x] 10.4 Implement `<ViralSpikeSimulator />` — discrete 10x/25x/50x/100x selector, sets `spikeMultiplier`
    - Show persistent banner "⚡ Spike Simulation Active — Nx" when active
    - _Requirements: 4.1, 4.3_
  - [x] 10.5 Implement `<CostCurveChart />` — pre-compute costs at 20 MAU points across [10, 1,000,000]
    - _Requirements: 3.5_
  - [x] 10.6 Implement `<CostBreakdownTable />` — per-service cost rows with `FreeTierIndicator`
    - _Requirements: 3.2, 3.6_
  - [x] 10.7 Implement `<AmazonQSummary />` — visually distinct section for plain-language summary
    - Show amber "Section unavailable" placeholder when `partial_failure.amazon_q` is true
    - _Requirements: 6.3, 12.3_
  - [x] 10.8 Implement `<PolicyViewer />` — formatted JSON display
    - _Requirements: 10.3_
  - [x] 10.9 Implement `<CopyButton />` — copy-to-clipboard for IAM policy JSON
    - _Requirements: 10.3_
  - [ ]* 10.10 Write unit test: spike banner visible when `spikeMultiplier` is set
    - _Requirements: 4.3_
  - [ ]* 10.11 Write unit test: IAM Export page has copy-to-clipboard control
    - _Requirements: 10.3_
  - [ ]* 10.12 Write unit test: back navigation control present on Results page
    - _Requirements: 2.5_

- [x] 11. Client-side cost recalculation and spike simulator logic
  - [x] 11.1 Implement `recalculateCosts(mau, spikeMultiplier, costEstimate)` pure function
    - `effectiveMAU = mau * (spikeMultiplier ?? 1)`; compute per-service cost and tier; sum non-unavailable
    - Must complete within 300ms; no network requests
    - _Requirements: 3.3, 4.2, 4.4_
  - [x] 11.2 Implement `generateCostCurve(costEstimate)` — 20 evenly-spaced MAU points across [10, 1,000,000]
    - All values must be non-negative
    - _Requirements: 3.5_
  - [x] 11.3 Wire `recalculateCosts` into `TrafficSlider` and `ViralSpikeSimulator` onChange handlers
    - _Requirements: 3.3, 4.2_

- [ ] 12. Frontend property-based tests — cost and spike logic
  - [ ]* 12.1 Property 6 — client-side cost recalculation correctness
    - Generate random MAU in [10, 1M] and pricing data, assert total matches `sum(MAU * units_per_mau * unit_price)`
    - `# Feature: kaguide-ai, Property 6: Client-side cost recalculation correctness`
    - _Requirements: 3.3, 3.4_
  - [ ]* 12.2 Property 7 — cost curve has ≥ 20 points, all non-negative
    - Generate pricing data, assert curve output
    - `# Feature: kaguide-ai, Property 7: Cost curve data coverage`
    - _Requirements: 3.5_
  - [ ]* 12.3 Property 8 — FreeTierIndicator classification matches thresholds
    - Generate service + MAU combinations, assert green/amber/red matches formula
    - `# Feature: kaguide-ai, Property 8: Free Tier indicator classification`
    - _Requirements: 3.6, 4.2, 4.5_
  - [ ]* 12.4 Property 9 — spike simulator round-trip restores pre-activation state
    - Generate cost state + multiplier, activate spike, deactivate, assert state restored
    - `# Feature: kaguide-ai, Property 9: Spike simulator round-trip`
    - _Requirements: 4.4_

- [-] 13. Results page assembly
  - [x] 13.1 Implement `<ResultsPage />` composing `ServiceCard[]`, `TrafficSlider`, `ViralSpikeSimulator`, `CostCurveChart`, `AmazonQSummary`, `CostBreakdownTable`
    - Read from `AppContext`; redirect to `/` if `analysisResponse` is null
    - _Requirements: 2.3, 2.4, 2.5_
  - [ ]* 13.2 Write property test for Property 4 — N services → N service cards with required fields
    - Generate random `ArchitectureSuggestion`, render `ResultsPage`, assert card count and fields
    - `# Feature: kaguide-ai, Property 4: Service card rendering completeness`
    - _Requirements: 2.3, 2.4_

- [x] 14. Compliance page
  - [x] 14.1 Implement `<CompliancePage />` with regulation list, compliance flags, and `<RegionComparison />`
    - Render violation flags with red accent; show amber placeholder when `partial_failure.compliance` is true
    - _Requirements: 5.3, 5.4, 5.5, 12.3_
  - [x] 14.2 Implement `<RegionComparison />` — side-by-side cost delta and latency note for ≥ 2 regions
    - _Requirements: 5.5_
  - [ ]* 14.3 Write unit test: Compliance page renders without crash
    - _Requirements: 5.3_

- [x] 15. IAM Export page
  - [x] 15.1 Implement `<IAMExportPage />` composing `<PolicyViewer />` and `<CopyButton />`
    - Read `iam_export` from `AppContext.analysisResponse`
    - _Requirements: 10.3_

- [x] 16. Error handling wiring
  - [x] 16.1 Implement API error handler in the submit flow: map 400/502/504/network errors to user-facing messages
    - No stack traces, ARNs, or internal identifiers in rendered messages
    - Show retry control on 504/timeout; show retry on network error
    - _Requirements: 12.1, 12.2_
  - [ ]* 16.2 Write unit test: timeout response shows retry control
    - _Requirements: 12.2_
  - [ ]* 16.3 Write property test for Property 18 — error messages contain no ARN/stack trace patterns
    - Generate error responses, assert rendered message is clean
    - `# Feature: kaguide-ai, Property 18: Error messages do not expose internals`
    - _Requirements: 12.1_
  - [ ]* 16.4 Write property test for Property 19 — partial failure shows amber indicators
    - Generate `AnalysisResponse` with `partial_failure` flags set, assert amber indicators present
    - `# Feature: kaguide-ai, Property 19: Partial failure shows amber indicators`
    - _Requirements: 12.3_

- [ ] 17. Checkpoint — frontend complete
  - Ensure all frontend tests pass, ask the user if questions arise.

- [x] 18. UI design system
  - [x] 18.1 Create CSS custom properties (color tokens) for the full palette: `#bfd6f6`, `#8dbdff`, `#64a1f4`, `#4a91f2`, `#3b7dd8`, `#f9f9ff`, `#ffffff`, `#C00707`, `#FF4400`, `#FFB33F`, `#134E8E`
    - Apply tokens consistently across all components
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 18.2 Add per-page SVG background illustrations at opacity ≤ 0.08
    - _Requirements: 11.4_
  - [x] 18.3 Add hover effect on primary buttons: `scale(1.03)` + elevated box-shadow within 150ms transition
    - _Requirements: 11.5_
  - [x] 18.4 Implement responsive layout — no horizontal scroll from 375px to 1440px viewport width
    - _Requirements: 11.6_

- [x] 19. Infrastructure configuration
  - [x] 19.1 Create `backend/template.yaml` (SAM) or `backend/serverless.yml` configuring Lambda at 512MB memory, 30s timeout
    - _Requirements: 8.1_
  - [x] 19.2 Add API Gateway REST resource `/analyze` POST with CORS headers; disable request/response body logging
    - _Requirements: 7.3, 8.2_
  - [x] 19.3 Add `frontend/deploy-notes.md` documenting S3 static hosting + CloudFront distribution setup and Free Tier limits
    - _Requirements: 8.3_

- [x] 20. Final checkpoint — all tests pass
  - Ensure all backend and frontend tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `hypothesis` (Python) and `fast-check` (TypeScript)
- All property test files must include the tag comment: `# Feature: kaguide-ai, Property N: ...`
- Lambda never logs user-submitted text — enforce this in all pipeline stages
- Client-side recalculation must never issue a network request

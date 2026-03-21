# Requirements Document

## Introduction

Kaguide AI is a fully stateless web application that helps developers, architects, and entrepreneurs design optimized AWS cloud architectures from natural language descriptions. The app accepts a plain-language description of an application or business, analyzes it using Amazon Bedrock, estimates costs via the AWS Price List API, simulates traffic scenarios, and checks compliance requirements — all without persisting any user data. The system runs entirely on AWS Free Tier services and targets a global audience.

## Glossary

- **Kaguide_AI**: The overall stateless web application system described in this document.
- **Frontend**: The React/Vite single-page application served via CloudFront/S3 static hosting.
- **API_Gateway**: The AWS API Gateway REST endpoint that routes requests from the Frontend to the Lambda backend.
- **Lambda**: The AWS Lambda function (Python) that orchestrates Bedrock, Price List API, and Amazon Q calls.
- **Bedrock**: Amazon Bedrock service used for intent parsing and AWS service suggestion (Nova Lite model).
- **Amazon_Q**: Amazon Q service used for generating plain-language trade-off explanations.
- **Price_List_API**: The AWS Price List API accessed via boto3 to retrieve real-time service pricing data.
- **Architecture_Suggestion**: A structured output containing recommended AWS services, alternatives, and trade-off notes for a given user input.
- **Cost_Estimate**: A computed breakdown of estimated monthly AWS costs per service, including Free Tier thresholds.
- **Traffic_Slider**: A UI control allowing the user to adjust simulated monthly active users (MAU) between 10 and 1,000,000.
- **Viral_Spike_Simulator**: A UI control that applies a multiplier (10x–100x) to usage metrics to simulate sudden traffic surges.
- **Compliance_Check**: An analysis of GDPR, CCPA, and LGPD requirements plus data residency recommendations based on the described application.
- **Region_Comparison**: A side-by-side cost and latency comparison across AWS regions (e.g., us-east-1 vs eu-central-1).
- **Free_Tier_Indicator**: A visual flag (green/amber/red) showing whether a service's estimated usage falls within, near, or beyond AWS Free Tier limits.
- **IAM_Export**: A generated IAM policy JSON document reflecting the minimum permissions required for the suggested architecture.
- **User**: A developer, architect, or entrepreneur interacting with the Frontend.

---

## Requirements

### Requirement 1: Natural Language Input Processing

**User Story:** As a developer, I want to describe my application in plain language, so that I can receive an AWS architecture recommendation without needing deep cloud expertise.

#### Acceptance Criteria

1. THE Frontend SHALL provide a text input field accepting a natural language description of up to 2,000 characters.
2. WHEN the User submits a description, THE Frontend SHALL send the description to the API_Gateway within 500ms of the submit action.
3. WHEN the API_Gateway receives a request, THE Lambda SHALL invoke Bedrock to parse the intent and extract key application attributes (e.g., user scale, data type, latency requirements).
4. IF the submitted description is empty or fewer than 10 characters, THEN THE Frontend SHALL display an inline validation message without submitting the request.
5. IF the Bedrock invocation fails, THEN THE Lambda SHALL return a structured error response with a human-readable message and HTTP status 502.
6. THE Lambda SHALL complete intent parsing and return an Architecture_Suggestion response within 15 seconds of receiving the API_Gateway request.

---

### Requirement 2: AWS Architecture Suggestion

**User Story:** As a developer, I want the app to suggest an optimized AWS architecture, so that I can understand which services to use and why.

#### Acceptance Criteria

1. WHEN Bedrock returns parsed intent, THE Lambda SHALL generate an Architecture_Suggestion containing at minimum: a primary services list, at least one alternative service per primary service where applicable, and trade-off notes for each alternative.
2. THE Architecture_Suggestion SHALL be serialized as a JSON object conforming to a documented schema (services array, alternatives map, tradeoffs map, cost_drivers array).
3. THE Frontend SHALL render the Architecture_Suggestion on a dedicated Results page with each service displayed as a card showing service name, purpose, and trade-off summary.
4. WHEN the Architecture_Suggestion is rendered, THE Frontend SHALL display a Free_Tier_Indicator (green, amber, or red) for each service based on estimated usage vs. Free Tier limits.
5. THE Frontend SHALL provide a back navigation control on the Results page that returns the User to the Homepage input without clearing the previous input value.
6. FOR ALL valid Architecture_Suggestion JSON objects, serializing then deserializing the object SHALL produce an equivalent object (round-trip property).

---

### Requirement 3: Real-Time Cost Estimation

**User Story:** As a developer, I want to see estimated AWS costs for my architecture, so that I can make budget-aware decisions.

#### Acceptance Criteria

1. WHEN an Architecture_Suggestion is displayed, THE Lambda SHALL query the Price_List_API for current pricing of each suggested service and return a Cost_Estimate breakdown.
2. THE Cost_Estimate SHALL include a per-service monthly cost in USD, a total estimated monthly cost, and identification of the top three cost drivers.
3. WHEN the User adjusts the Traffic_Slider, THE Frontend SHALL recalculate and display updated cost figures within 300ms using the last received pricing data without issuing a new Lambda invocation.
4. THE Traffic_Slider SHALL allow the User to select any integer value between 10 and 1,000,000 monthly active users.
5. THE Frontend SHALL display a cost curve visualization showing estimated monthly cost across the full Traffic_Slider range.
6. WHEN estimated usage for a service exceeds the AWS Free Tier limit, THE Frontend SHALL display an amber Free_Tier_Indicator and the overage cost for that service.
7. IF the Price_List_API returns no pricing data for a service, THEN THE Lambda SHALL include a flag in the Cost_Estimate marking that service as "pricing unavailable" and exclude it from the total.

---

### Requirement 4: Viral Spike Simulation

**User Story:** As a developer, I want to simulate sudden traffic surges, so that I can understand cost and architecture implications of viral growth.

#### Acceptance Criteria

1. THE Frontend SHALL provide a Viral_Spike_Simulator control that applies a multiplier of 10x, 25x, 50x, or 100x to all usage metrics in the current Cost_Estimate.
2. WHEN the User activates the Viral_Spike_Simulator, THE Frontend SHALL update all cost figures and Free_Tier_Indicators within 300ms to reflect the multiplied usage metrics.
3. WHEN the Viral_Spike_Simulator is active, THE Frontend SHALL display a visible banner indicating that spike simulation mode is active and showing the current multiplier.
4. WHEN the User deactivates the Viral_Spike_Simulator, THE Frontend SHALL restore all cost figures and Free_Tier_Indicators to the pre-spike values within 300ms.
5. WHILE the Viral_Spike_Simulator is active, THE Frontend SHALL highlight any service whose simulated usage exceeds AWS Free Tier limits with a red Free_Tier_Indicator.

---

### Requirement 5: Compliance Checking

**User Story:** As a developer, I want to understand compliance implications of my architecture, so that I can meet GDPR, CCPA, and LGPD requirements.

#### Acceptance Criteria

1. WHEN an Architecture_Suggestion is generated, THE Lambda SHALL perform a Compliance_Check evaluating the described application against GDPR, CCPA, and LGPD requirements.
2. THE Compliance_Check SHALL output a structured result containing: a list of applicable regulations, a list of compliance flags (potential violations or required controls), and a recommended primary AWS region with justification.
3. THE Frontend SHALL display the Compliance_Check results on a dedicated Compliance page accessible from the Results page.
4. WHEN the Compliance_Check identifies a potential violation, THE Frontend SHALL display the violation with a red accent indicator and a plain-language explanation sourced from Amazon_Q.
5. THE Frontend SHALL display a Region_Comparison showing estimated cost and latency differences between at least two AWS regions relevant to the described application (e.g., us-east-1 vs eu-central-1), with a note indicating the expected cost/latency savings range.
6. IF the described application involves personal data of EU residents, THEN THE Lambda SHALL include a GDPR flag in the Compliance_Check output regardless of the User's stated region preference.

---

### Requirement 6: Plain-Language Explanations via Amazon Q

**User Story:** As a non-expert developer, I want plain-language explanations of trade-offs, so that I can understand the recommendations without deep AWS knowledge.

#### Acceptance Criteria

1. WHEN an Architecture_Suggestion is generated, THE Lambda SHALL invoke Amazon_Q to produce a plain-language summary of the top three trade-offs in the suggested architecture.
2. THE Amazon_Q summary SHALL be no longer than 300 words and SHALL avoid AWS-internal jargon without definition.
3. THE Frontend SHALL display the Amazon_Q summary on the Results page in a visually distinct section separate from the technical service cards.
4. IF the Amazon_Q invocation fails, THEN THE Lambda SHALL substitute a static fallback explanation derived from the Architecture_Suggestion trade-off notes and SHALL include a flag in the response indicating the fallback was used.

---

### Requirement 7: Stateless Operation and Privacy

**User Story:** As a privacy-conscious user, I want the app to store no personal data, so that I can use it without privacy risk.

#### Acceptance Criteria

1. THE Lambda SHALL not write any user-submitted input or generated output to any persistent storage service (e.g., DynamoDB, S3, RDS, ElastiCache).
2. THE Lambda SHALL not log user-submitted input text to CloudWatch Logs or any other logging destination.
3. THE API_Gateway SHALL not enable request/response logging that captures request body content.
4. THE Frontend SHALL not use browser localStorage, sessionStorage, IndexedDB, or cookies to persist user input or results beyond the active browser session.
5. WHEN the User closes or navigates away from the browser tab, THE Frontend SHALL not retain any user input or result data in persistent browser storage.

---

### Requirement 8: AWS Free Tier Compliance

**User Story:** As a cost-conscious developer, I want the app itself to run within AWS Free Tier limits, so that I can operate it at zero cost.

#### Acceptance Criteria

1. THE Lambda SHALL be configured with memory of 512 MB or less and a timeout of 30 seconds or less to remain within Free Tier execution limits.
2. THE API_Gateway SHALL use the REST API type with usage plans configured to limit total monthly requests to 1,000,000 to remain within Free Tier limits.
3. THE Frontend static assets SHALL be served from an S3 bucket with CloudFront distribution, using the CloudFront Free Tier (1 TB data transfer, 10,000,000 HTTP requests per month).
4. WHEN the Lambda invokes Bedrock, THE Lambda SHALL use the Nova Lite model or an equivalent model available under the Bedrock Free Tier invocation allowance.
5. THE system SHALL not provision any resources outside the AWS Free Tier service list (e.g., no NAT Gateway, no RDS instances, no ElastiCache clusters).

---

### Requirement 9: Frontend Navigation and Page Structure

**User Story:** As a user, I want a multi-page experience with clear navigation, so that I can move between input, results, compliance, and export views without confusion.

#### Acceptance Criteria

1. THE Frontend SHALL implement at minimum four distinct pages: Homepage (input), Results/Dashboard, Compliance, and IAM Export.
2. WHEN the User submits input on the Homepage, THE Frontend SHALL navigate to the Results/Dashboard page upon receiving a successful API response.
3. THE Frontend SHALL display a navigation bar on all pages with links to accessible pages and a back/previous control that returns the User to the prior page.
4. WHEN the User navigates back from the Results/Dashboard page to the Homepage, THE Frontend SHALL restore the previously entered input text in the input field.
5. THE Frontend SHALL display a footer on all pages containing at minimum: a privacy notice stating no data is stored, and a link to the IAM Export page.

---

### Requirement 10: IAM Policy Export

**User Story:** As a developer, I want to export a minimum-privilege IAM policy for my suggested architecture, so that I can deploy it securely.

#### Acceptance Criteria

1. WHEN an Architecture_Suggestion is generated, THE Lambda SHALL produce an IAM_Export containing a JSON IAM policy document granting only the permissions required by the suggested services.
2. THE IAM_Export SHALL follow the principle of least privilege, scoping each permission to the specific AWS service actions identified in the Architecture_Suggestion.
3. THE Frontend SHALL display the IAM_Export on a dedicated IAM Export page with a copy-to-clipboard control.
4. THE IAM_Export JSON SHALL be valid IAM policy syntax parseable by the AWS IAM policy simulator.
5. FOR ALL valid Architecture_Suggestion objects, generating then parsing the IAM_Export JSON SHALL produce an equivalent policy document (round-trip property).

---

### Requirement 11: UI Design and Visual System

**User Story:** As a user, I want a polished, modern interface, so that the tool feels professional and is easy to use.

#### Acceptance Criteria

1. THE Frontend SHALL apply a primary blue color palette using hex values #bfd6f6, #8dbdff, #64a1f4, #4a91f2, and #3b7dd8 for backgrounds, cards, and primary UI elements.
2. THE Frontend SHALL use #f9f9ff as the default page background color and white (#ffffff) for card surfaces.
3. THE Frontend SHALL apply accent colors #C00707 (error/red), #FF4400 (warning/orange), #FFB33F (caution/amber), and #134E8E (CTA/dark blue) consistently for Free_Tier_Indicators, buttons, and alerts.
4. THE Frontend SHALL render per-page background SVG illustrations (geometric patterns, floating shapes) at an opacity of 0.08 or less to avoid obscuring text content.
5. WHEN the User hovers over a primary button, THE Frontend SHALL apply a scale transform of 1.03 and an elevated box-shadow transition within 150ms.
6. THE Frontend SHALL be responsive and render correctly on viewport widths from 375px (mobile) to 1440px (desktop) without horizontal scrolling.

---

### Requirement 12: Error Handling and Graceful Degradation

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and what to do next.

#### Acceptance Criteria

1. IF the API_Gateway returns an HTTP 4xx or 5xx response, THEN THE Frontend SHALL display a user-facing error message describing the issue in plain language without exposing internal stack traces or AWS resource identifiers.
2. IF the Lambda timeout is reached before a response is returned, THEN THE Frontend SHALL display a timeout message and offer the User a retry control.
3. WHEN a partial response is received (e.g., Compliance_Check succeeded but Amazon_Q failed), THE Frontend SHALL display the available results and indicate which sections are unavailable with an amber indicator.
4. THE Frontend SHALL display a loading state with a progress indicator for any operation expected to take longer than 500ms.
5. IF the User's browser does not support the Fetch API, THEN THE Frontend SHALL display a browser compatibility notice and SHALL not attempt to submit requests.

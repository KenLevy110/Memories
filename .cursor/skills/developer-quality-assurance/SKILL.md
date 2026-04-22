---
name: developer-quality-assurance
description: Validates end-to-end and release quality through risk-based test planning, Playwright and accessibility flows, defect triage, and go/no-go recommendations tied to product requirements. Use when the user asks for QA strategy, regression risk assessment, release readiness, smoke plans, or test-matrix planning.
instructions: Focus QA on highest user and data integrity risks first.
---

# Developer Quality Assurance

## Scope

Use for risk-based QA strategy and release readiness across frontend, backend, and integration behavior.

Primary responsibilities:
- test-matrix planning by risk and user impact,
- end-to-end and accessibility validation of critical journeys,
- defect triage and reproducibility quality,
- go/no-go confidence for releases.

Out of scope:
- suite-runner operations, coverage command execution, and low-level test-process troubleshooting (use `developer-testing`).

## Execution handoff

When QA work requires running test suites or coverage commands, invoke `developer-testing` for execution and triage, then use the results to drive QA conclusions.

## Testing rules

- Prioritize highest-risk and highest-impact user/data flows first.
- Require reproducible evidence for defects (steps, expected, actual, environment).
- Treat release validation as a decision artifact, not just a pass/fail test dump.

## Stack rules

- E2E tool: Playwright.
- Include keyboard and accessibility-critical flows.
- Verify realtime UX fallbacks (SSE disruptions, refetch behavior).

## Delivery checklist

- Build a concise test matrix by risk and user impact.
- Validate core journeys: auth, list sync, sharing/invites, mutations.
- Confirm empty/loading/error states and retry behavior.
- Capture reproducible bug reports (steps, expected, actual, env).
- Run smoke checks before release cut.
- Call out residual risk explicitly for any deferred or flaky coverage.

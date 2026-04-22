# Test Strategy Template

Use this template to define how quality will be validated for a feature or release.

## Document control

- Feature/release:
- Owners:
- Date:
- Related PRD/TDD/issues:

## 1) Scope and risk

- In scope:
- Out of scope:
- Critical user journeys:
- High-risk areas:

## 2) Test levels and ownership

- Unit tests:
  - Owner:
  - Focus:
- Integration tests:
  - Owner:
  - Focus:
- End-to-end tests:
  - Owner:
  - Focus:
- Non-functional (performance/accessibility/security):
  - Owner:
  - Focus:

## 3) Security test plan

- Threat model updated? (Yes/No)
- AuthN/AuthZ test scenarios:
- Input validation and injection test scenarios:
- Sensitive data handling and logging checks:
- Dependency vulnerability checks:

## 4) Test environment matrix

| Environment | Purpose | Data setup | Notes |
| --- | --- | --- | --- |
| Local | Developer checks | | |
| CI | Merge gate | | |
| Staging | Pre-release verification | | |

## 5) Coverage and pass criteria

- Required checks:
  - [ ] Lint
  - [ ] Typecheck
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] E2E smoke
  - [ ] Security workflow
- Coverage thresholds:
- Exit criteria for release:

## 6) Regression and rollback readiness

- Existing regression suite updated:
- New regression cases added:
- Manual smoke checklist:
- Rollback validation steps:

## 7) Open issues and waivers

- Known defects:
- Temporary waivers (owner + expiry):
- Follow-up work:

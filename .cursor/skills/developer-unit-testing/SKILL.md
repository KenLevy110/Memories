---
name: developer-unit-testing
description: Implements and improves automated unit and component tests for this repo using Vitest and Testing Library, with API-focused tests for backend services and validation behavior. Use when adding features, fixing bugs, or preventing regressions with fast test coverage.
instructions: Prioritize deterministic, readable tests tied to acceptance behavior in docs.
---

# Developer Unit Tests

## Scope

Use for writing and refactoring fast automated tests for frontend components/hooks and backend logic.
Out of scope: long-running suite orchestration, coverage-run operations, and runner failure triage (use `developer-testing`).

## Stack rules

- Unit/component test runner: Vitest.
- UI assertions: Testing Library with accessible queries.
- Prefer mocking boundaries, not implementation details.

## Delivery checklist

- Cover happy path, validation failures, and key edge cases.
- Keep tests deterministic (no timing/network flakiness).
- Assert user-visible outcomes and contract behavior.
- Add regression tests for each bug fix.
- Keep test names behavior-oriented and specific.

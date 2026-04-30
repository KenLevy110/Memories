# ADR-20260423-architecture-baseline

## Decision metadata

- Decision ID: `ADR-20260423-architecture-baseline`
- Date: 2026-04-23
- Status: Proposed
- Owners: Engineering
- Template used: `docs/templates/decision-log-template.md`
- Related docs/issues/PRs: `docs/product-requirements-v1.md`, `docs/technical-design-v1.md`, `docs/tech-stack.md`

## Context

The project is moving from scaffold to implementation. The architecture should preserve clear boundaries between frontend, backend, and shared contracts to reduce maintenance overhead.

## Decision

Use a monorepo architecture with three primary workspaces:

1. `apps/web` for user-facing frontend UI.
2. `apps/api` for backend APIs and integrations.
3. `packages/shared` for shared contracts, schemas, and utilities.

## Options considered

1. Monorepo with web/api/shared packages (selected)
2. Separate repositories per service and client
3. Backend-first MVP without a shared package

## Trade-offs

- Benefits: Faster contract alignment and simpler cross-layer changes.
- Risks: Requires discipline to prevent workspace coupling.
- Cost or complexity impact: Moderate setup complexity, lower integration friction.

## Consequences

- New work should be scoped to the correct workspace.
- Cross-service contracts should be defined in `packages/shared`.
- Documentation should align route/API/schema decisions with this layout.

## Rollback / reversal plan

If this layout becomes a delivery bottleneck, split workspaces into separate repositories and publish shared contracts as a versioned package.

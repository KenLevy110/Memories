# ADR-20260423-architecture-baseline

## Decision metadata

- Decision ID: `ADR-20260423-architecture-baseline`
- Date: 2026-04-23
- Status: Proposed
- Owners: Engineering
- Template used: `docs/templates/decision-log-template.md`
- Related docs/issues/PRs: [technical-design-v1.md](../technical-design-v1.md), [product-requirements-v1.md](../product-requirements-v1.md), [tech-stack.md](../tech-stack.md)

## Context

The repository is moving from scaffold state to implementation of the Memories vertical. The architecture must align with PRD and technical design goals while remaining simple and maintainable for iterative delivery.

## Decision

Use a monorepo architecture with three primary workspaces:

1. `apps/web` for the user-facing React web client.
2. `apps/api` for backend HTTP APIs and integration workflows.
3. `packages/shared` for shared contracts, schemas, and reusable types.

## Options considered

1. Monorepo with web/api/shared packages (selected)
2. Separate repositories per service and client
3. Backend-only MVP with no dedicated shared package

## Trade-offs

- Benefits: Clear ownership boundaries with easy contract sharing and coordinated changes.
- Risks: Requires discipline to avoid cross-workspace coupling and accidental dependency leakage.
- Cost or complexity impact: Moderate setup complexity, lower long-term integration overhead.

## Consequences

- New feature work should be scoped to the correct workspace and rely on `packages/shared` for cross-boundary contracts.
- Design and requirements documents should keep route/API/schema references aligned with this layout.

## Rollback / reversal plan

If monorepo boundaries become a delivery bottleneck, split `apps/api` and `apps/web` into separate repositories while preserving `packages/shared` as a versioned package.

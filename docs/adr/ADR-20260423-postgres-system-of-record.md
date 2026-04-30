# ADR-20260423-postgres-system-of-record

## Decision metadata

- Decision ID: `ADR-20260423-postgres-system-of-record`
- Date: 2026-04-23
- Status: Proposed
- Owners: Engineering
- Template used: `docs/templates/decision-log-template.md`
- Related docs/issues/PRs: `docs/tech-stack.md`, `docs/technical-design-v1.md`, `docs/product-requirements-v1.md`, [ADR-20260430-memories-platform-boundary-auth-routing.md](ADR-20260430-memories-platform-boundary-auth-routing.md)

## Context

Most template-based products need transactional consistency across core entities, access rules, and asynchronous processing state. The default datastore should favor relational integrity and operational maturity.

## Decision

Use PostgreSQL as the default system of record for core domain data.

## Options considered

1. PostgreSQL relational model (selected)
2. Document-first datastore
3. External service as primary source of truth with local cache

## Trade-offs

- Benefits: Strong constraints, mature transactions, robust indexing, broad tooling support.
- Risks: Requires migration discipline and schema management.
- Cost or complexity impact: Moderate upfront schema and migration investment.

## Consequences

- Domain entities should be modeled with explicit relations and constraints.
- Critical writes should be transactional.
- Performance work should start with query/index tuning before datastore changes.
- **Memories product boundary:** PostgreSQL in this repo is system of record for the **memory vertical** (memories, media, transcripts, jobs, memory audit) per [ADR-20260430-memories-platform-boundary-auth-routing.md](ADR-20260430-memories-platform-boundary-auth-routing.md); platform services own CRM/identity tables.

## Rollback / reversal plan

If PostgreSQL no longer fits product or scale constraints, execute a staged migration with dual-write and validation before final cutover.

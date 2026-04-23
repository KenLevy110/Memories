# ADR-20260423-postgres-system-of-record

## Decision metadata

- Decision ID: `ADR-20260423-postgres-system-of-record`
- Date: 2026-04-23
- Status: Proposed
- Owners: Engineering
- Template used: `docs/templates/decision-log-template.md`
- Related docs/issues/PRs: [tech-stack.md](../tech-stack.md), [technical-design-v1.md](../technical-design-v1.md), [product-requirements-v1.md](../product-requirements-v1.md)

## Context

Memories requires transactional consistency across memory metadata, media references, transcript status, and access control boundaries. The datastore must support relational integrity, indexing, and operational maturity for sensitive data.

## Decision

Adopt PostgreSQL as the primary system of record for core Memories domain entities and relationships.

## Options considered

1. PostgreSQL relational model (selected)
2. Document-first datastore for memory records
3. Hybrid with external service as the primary source of truth

## Trade-offs

- Benefits: Strong relational constraints, mature transaction semantics, and straightforward indexing strategies.
- Risks: Schema migration discipline is required for iterative product changes.
- Cost or complexity impact: Moderate upfront schema design and migration management.

## Consequences

- Domain tables and relationships should be modeled explicitly (memories, media, transcripts, access controls).
- Data integrity should be enforced through constraints and transactional writes.
- Future scaling patterns should prioritize query/index tuning before changing datastore strategy.

## Rollback / reversal plan

If PostgreSQL no longer meets operational or product constraints, perform a staged dual-write migration to a new primary store and keep PostgreSQL read-only during transition until cutover is validated.

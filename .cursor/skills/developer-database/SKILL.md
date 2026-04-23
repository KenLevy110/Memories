---
name: developer-database
description: Designs and maintains PostgreSQL data layer for this repo with Drizzle ORM or Prisma, migrations, foreign keys, constraints, indexes, and transactional integrity. Use when changing schema, queries, data consistency, or migration strategy.
instructions: Keep schema and migration decisions aligned with docs/tech-stack.md and docs/technical-design-v1.md.
---

# Developer Database

## Scope

Use for data modeling, migrations, query design, indexing, and performance-safe schema changes.

## Stack rules

- Datastore: PostgreSQL (system of record).
- Access layer: Drizzle ORM or Prisma.
- IDs: UUID v7 or ULID (sortable, non-guessable).
- Use foreign keys and explicit constraints for integrity.

## Delivery checklist

- Ship additive migrations first; avoid breaking deploy order.
- Add indexes for frequent filters/sorts and verify with explain plans when needed.
- Wrap multi-write flows in transactions.
- Preserve auditability for ownership, invites, and membership changes.
- Provide rollback notes for risky migrations.

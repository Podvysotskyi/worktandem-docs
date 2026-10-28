# EF Core and migrations

**Confirmed direction:** code-first Entity Framework Core with migrations.
**Implementation status:** no entity classes, DbContexts, provider packages or migrations
are introduced by this documentation. Provider selection and logical-model review
come first.

## Model versus migration

Domain entities express business state and rules. EF Fluent configurations map the
persistence model: keys, required properties, lengths, relationships, indexes,
concurrency and database constraints. EF compares the model to its snapshot to generate
a migration. Migrations version **schema changes**; they are not the primary place to
define C# entities. Generated migrations and model snapshots are committed together.
See the [EF migrations overview](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/).

## Clean Architecture placement

| Project/layer | Owns |
| --- | --- |
| Organization.Domain | Framework-free business entities, value objects, invariant rules |
| Organization.Application | Use cases and persistence ports; no DbContext dependency |
| Organization.Infrastructure | DbContext, EF Fluent configurations, provider adapter, migrations and snapshot |
| Organization.Api | Composition root, runtime configuration and endpoints |
| Proposed Identity service | Its own equivalent ownership; provider-owned models remain in the proper adapter rather than leaking into business entities |
| Gateway | No Organization migrations or business entities |

Use one IEntityTypeConfiguration per mapped entity and apply configurations from the
owning assembly. Do not introduce EF attributes/dependencies into the framework-free
Domain merely for convenience. Domain events and navigations must not point across
services. A separate migrations project is possible if deployment packaging needs it,
but not mandatory; [Microsoft documents that option](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/projects).

## Independent histories

Each owning DbContext gets its own migrations and snapshot. Prefer separate service
databases. If a temporary shared database is approved, use non-overlapping ownership
and distinct [migration history tables](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/history-table),
with no cross-service writable tables or migration dependency on another context.
There is no all-system migration stream or one migration for each company.

Normal schema changes apply consistently to all tenants in shared tables. Per-company
configuration/data changes are application operations, not generated migrations.
Do not seed a real owner account, password, invite token, Google identity, or company
through a migration. Reserved permission definitions may be versioned deterministic
reference data only after catalog design is agreed.

## Migration workflow

1. Select provider/version and compatible EF/provider tooling, then approve the
   initial entity slice and unresolved decisions from the [overview](./overview).
2. Implement Domain models and Infrastructure mappings, explicitly including tenant
   composite FKs, uniqueness, deletion rules and concurrency strategy.
3. Generate a named migration with an explicitly selected owning DbContext, startup
   project and migrations project. Commands will be documented when these exist;
   this design does not invent a runnable Identity project or DbContext today.
4. Review migration and snapshot diffs. Watch for accidental drops/recreates, data
   loss during rename/type changes, nullable-to-required changes and missing indexes.
5. Test an empty database **and** upgrade from the previous schema with representative
   data on the real selected provider. Verify invariants and model/snapshot consistency.
6. Generate and inspect a deployment SQL script or migration bundle, preserve the
   artifact, and apply once via a controlled deployment job with scoped credentials.
7. Validate schema history, readiness and application compatibility; record the outcome.

Do not use EnsureCreated alongside migration-managed databases. Do not automatically
migrate from every production API replica at startup. Even with migration locking,
production DDL permissions and rollout compatibility should remain controlled.
Microsoft recommends inspecting/testing generated migrations before production and
describes [scripts and migration bundles](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying).

## Safe evolution

Prefer expand/backfill/contract for live changes: add compatible schema, deploy code
that works during rollout, backfill safely, then remove obsolete schema after old
instances no longer need it. Long backfills may need resumable jobs rather than one
large DDL transaction. Do not rewrite an applied shared migration; add a corrective one.
A Down method is not a data backup and may lose data. Define backup/restore and
forward-fix strategy before production rollout.

No database has been created or migrated as part of this specification. Local build
validation of these Markdown pages is not database/integration-test validation.

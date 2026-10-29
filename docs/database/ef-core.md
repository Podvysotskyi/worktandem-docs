# EF Core and migrations

**Confirmed direction:** code-first Entity Framework Core with migrations.
**Implementation status:** no entity classes, DbContexts, provider packages or migrations
are introduced by this documentation. Provider selection and logical-model review
come first.
This catalog follows the [current product specification](../product/identity-and-company-access)
and [alignment dispositions](./identity-alignment-review#documentation-dispositions).
P01–P04/O decisions remain open even where a concrete proposed mapping appears.

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
| Integration capability | Company consent, protected secret references and optional domain evidence in the selected owner; no automatic new service or DbContext |
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

### Model review gate

Before generating any migration, agree the implementation slice and confirm its
mapping preserves these logical requirements:

- Global canonical issuer/subject ownership and Google-scoped per-account uniqueness;
  active Google-only accounts retain exactly one usable login. Choose the provider/
  library mapping; do not impose Google cardinality on future providers or generate
  a custom local-password/recovery schema.
- Pending company gating, versioned submissions, unique terminal review decisions
  and owner candidate distinct from activated membership. Choose one lifecycle
  representation and P03 activation behavior before declaring fields required.
- Separate platform capability grants versus company-scoped role/scope bindings;
  no seeded real operator or tenant-owner-to-platform shortcut.
- Tenant-consistent application, invitation, member, role and manual-eligibility FKs;
  external account/proof IDs remain service contracts rather than cross-DB FKs.
- One invitation for email/in-app paths with optional email-link credential storage;
  no mandatory emailed token on authenticated in-app acceptance. O07 evidence policy
  remains open, not a migration-defined OTP workflow.
- Explicit manual outside-domain eligibility survives later domain checks/directory
  absence; suspension and RBAC still deny. Sync records only follow adopted sync scope.
- Restrict deletion, concurrency and real-provider uniqueness/index support;
  approval/consumption/revoke races, audit and notification delivery are application
  workflows as well as storage constraints. SQL uniqueness alone cannot prove them.

Proposed string bounds, enum values, nullable review pointers, filtered unique keys
and evidence references need provider/library review. Do not silently replace a
Google-scoped index with global AccountId uniqueness because it is easier to map.

### Later implementation sequence

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

# Database design

**Status: design proposal, not an implemented schema.** EF Core code-first and
migrations are confirmed direction. The entity catalog translates confirmed product
requirements into a proposed relational design; naming, provider-specific types,
and new lifecycle choices remain reviewable before migrations are generated.

## Read this specification

1. [Identity entities](./identity): accounts, external identities, credentials and sessions.
2. [Organization entities](./organization): companies, members, departments and teams.
3. [Authorization entities](./authorization): company roles and complete scoped grants.
4. [Integrity and lifecycle](./integrity): relationships, tenant isolation, deletion and concurrency.
5. [EF Core and migrations](./ef-core): ownership, mappings, review and rollout.

The [account requirements](../architecture/accounts-and-authentication) and
[decision register](../architecture/decisions) remain the sources of confirmed product
behavior. This document does not replace them or claim authentication is implemented.

## Ownership and storage

| Proposed owner | Owns | Does not own |
| --- | --- | --- |
| Identity | Worktandem accounts, Google identity links, sign-in/recovery and session records | Company memberships and company permissions |
| Organization | Companies, memberships, invitations, departments, teams, roles and module availability | Passwords, Google credentials or provider tokens |
| Future business services | Their own leads, customers, products or tasks | Another service's writable tables or EF entities |

Identity is a **proposed service boundary**, not a service already present in the
backend scaffold. Organization already has Clean Architecture projects but no
business schema. The Gateway is not a business-data owner.

Recommend one service-owned database and DbContext per business service, with
separate migration history and deployment ownership. Databases can share a physical
server initially. A shared server does not permit shared writable tables, cross-service
SQL joins, foreign keys, or EF navigations. An Organization membership's AccountId is
an external reference, validated through an Identity contract rather than a database FK.
A single all-system DbContext is not proposed.

Recommend shared tables per service with CompanyId on tenant-owned data initially;
a database per customer is not required for this design. PostgreSQL remains a candidate,
not a selected or installed provider. Selecting EF does not select a database engine.

## Modeling conventions

- Names below are conceptual C# entity/property names; physical SQL naming is undecided.
- `Id` / reference fields use proposed `Guid` identifiers. Generation strategy is open.
- Required means non-null; optional fields are explicitly marked `?`.
- Time fields use UTC instants, proposed `DateTimeOffset`. Database mapping is provider-dependent.
- Mutable aggregates carry CreatedAt, UpdatedAt and a required Version concurrency token.
  Use an application-managed Guid token initially as a proposal, rather than assuming
  SQL Server rowversion or PostgreSQL system-column behavior. Pure join rows need not
  carry all aggregate metadata.
- Status values are bounded enums/string sets with allowed values checked in the DB;
  transitions are domain/application rules, not arbitrary client updates.
- API DTOs, event contracts and EF entities are separate models. No EF entities cross service boundaries.
- Field lengths and enum storage must be finalized with provider choice. Proposed lengths
  appear where important; this is not permission to truncate provider identifiers.

## First implementation slice

Start with Account/ExternalIdentity requirements and Company/CompanyMembership,
then invitations, departments/teams, and scoped roles. This is incremental modeling,
not permission to expose unprotected endpoints: business access stays denied until
required authentication and scoped authorization are implemented and tested. Do not generate authentication
provider tables until the provider decision is made. Add business modules only when
their workflows and owning services are designed.

CompanyModule is a proposed minimal enabled/disabled record, not licensing, billing,
or authorization. Disabling a module must retain its historical data. Module dependencies
and the source of the available-module catalog still need definition.

## Decisions required before initial migrations

| Decision | Current position |
| --- | --- |
| Database provider and supported version | Open; PostgreSQL is proposed |
| Identity implementation | Open; ASP.NET Core Identity versus another provider changes physical tables |
| Service persistence boundaries | Identity + Organization design proposed here; do not treat as implemented |
| Account email/login uniqueness | Open; never infer it from Google identity uniqueness |
| Multi-tab/session context | Open; account and company switching must remain distinct |
| Department cardinality/reporting | Proposed multiple department memberships, one optional primary department, one optional direct manager |
| Role scope semantics | Scoped RBAC confirmed; explicit scope bindings and direct-department-only semantics proposed |
| Deletion/retention | Archive/suspend first proposed; retention and erasure need a separate policy |
| ID generation, naming and enum mapping | Open, finalize before generating provider-specific schema |

Google Workspace domain ownership, auto-join, directory sync and company Require Google
remain research proposals. No domain, directory connector or OAuth-grant tables are
included in the initial entity catalog.

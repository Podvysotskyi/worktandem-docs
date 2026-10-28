# Application structure

## Decision: Clean Architecture with practical boundaries

**Status: confirmed direction.** These conventions guide the scaffolds and future
features. They do not claim that business workflows, persistence, authentication,
or a complete layered feature set have already been implemented.

### Backend business services

Each business service owns its model and uses inward dependencies:

- **Domain:** business rules and domain types; no framework, transport, or persistence dependencies.
- **Application:** use cases and the interfaces they need; depends on Domain, not on Infrastructure or API.
- **Infrastructure:** implementations for persistence and external systems; depends inward on Application and Domain.
- **Api:** HTTP endpoints and composition root. It invokes application use cases and wires infrastructure; business rules do not belong in controllers.

Keep models owned by their service. Do not create a shared domain library spanning
services or reach into another service's database. Expose deliberately versioned
API/event contracts instead. Add infrastructure integrations only when needed;
empty abstractions and generic repositories are not required by this decision.

Keep the gateway thin: routing and cross-cutting edge concerns, not a second home
for business logic or another copy of every service's layers.

### Nuxt applications

Organize business code by feature, with clear UI, application/composable, and API
adapter responsibilities when a feature needs them. Do not mechanically copy
backend Domain/Application/Infrastructure/Api projects into the frontend.

Keep shared UI free of business-service logic. Share stable utilities and contracts
intentionally, not mutable user/session state. Server-side authentication and
scoped authorization remain mandatory before protected data is exposed; client
navigation or rendering choices do not enforce access control.

### Verification

Test domain rules and use cases independently of infrastructure. Add integration
tests at infrastructure/API boundaries and contract tests for service interactions.
Frontend feature tests should cover behavior and adapter contracts; use end-to-end
tests for critical cross-application flows once those flows exist. Architecture
checks should guard dependency direction without substituting for behavior tests.

Scaffold build and boundary checks establish structure only. They are not evidence
of working business features or production security. Document each implemented
feature's contracts and applicable test coverage as it is added.

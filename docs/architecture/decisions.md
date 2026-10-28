# Decisions

This register separates architectural direction from delivered behavior.

| Topic | Status | Decision or open question |
| --- | --- | --- |
| Repository layout | Confirmed | Root workspace with frontend, backend, and docs as submodules |
| Documentation | Confirmed | VitePress |
| Frontend architecture | Confirmed direction | Multiple Nuxt applications; shared authentication is planned |
| Backend architecture | Confirmed | .NET multi-service architecture |
| Authorization model | Confirmed direction | Scoped RBAC; no generic ABAC engine |
| Company model | Planned | People, departments, cross-department teams, and managers; managers separate from permission roles |
| Company application path | Scaffold pending review | `/company/` base path and development proxy configured in the frontend scaffold; production prefix-preserving routing contract documented but not deployed |
| CRM application path | Proposed | A future `/crm` path is not implemented by the scaffold |
| Identity provider | Open | Select provider and define session/authentication integration |
| Persistence and messaging | Proposed | Evaluate PostgreSQL and RabbitMQ |
| Real-time and background jobs | Proposed | Evaluate SignalR and Hangfire |
| Documentation hosting | Open | No deployment or GitHub Pages publication configured |

## Recording changes

When a decision becomes concrete, describe its context, chosen option, consequences,
and implementation status. Link to the relevant reviewed code or documentation;
do not use a proposal as evidence that a capability has shipped.

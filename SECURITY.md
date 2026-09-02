# Security & Privacy Specification — OBSTAT

## 1. Screenplay Egress Boundary

OBSTAT strictly limits the outbound data leaving Google Cloud to partner APIs.

```text
[ PRIVATE GOOGLE CLOUD BOUNDARY ]
Full Screenplay Text PRIVATE -> Never leaves GCP
Scene Text & Context PRIVATE -> Never leaves GCP

          ↓ Egress Firewall (Token Whitelist Compiler)

[ OUTBOUND PARALLEL SEARCH QUERY ]
Whitelisted Item Token + Fixed Template Token + Scope Token
Example: "MERCER VALE person name official US"
```

## 2. Token Provenance Classification

Every token in an outbound query is assigned an explicit provenance category:
- `ITEM_TOKEN`: Verbatim name extracted from screenplay.
- `FROZEN_TEMPLATE_TOKEN`: Static policy search template (e.g., `person name official`).
- `USER_SCOPE_TOKEN`: Production scope territory (e.g., `US`, `UK`).

Queries containing un-whitelisted dialogue, action descriptions, or script plot details trigger an immediate `EgressViolation` and are logged as `POLICY_BLOCKED`.

## 3. Credential Security

- API keys (e.g. `PARALLEL_API_KEY`) are managed via Google Secret Manager in production deployments.
- No secrets or keys are stored in source code repositories.

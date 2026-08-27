# OBSTAT Architectural Decisions & Record (ADR)

## Core Architectural Invariants

### Invariant 1: Invalidation across Change
> **"Change the script, and stale clearance evidence cannot silently survive."**
Every clearance claim is cryptographically hashed to its item string, context, active research scope, policy version, and revision lineage. Any screenplay modification invalidates affected claims (`STALE_SCRIPT`), moving the clearance packet state to `RESEARCH_PACKET_BLOCKED`.

### Invariant 2: Provenance & Evidence Quality
> **"No evidence, no completed research state."**
Unusable classifications or unverified match spans contribute zero toward negative coverage (`UNUSABLE_EVIDENCE`). Missing evidence keeps the research outcome in `INSUFFICIENT_COVERAGE`.

---

## Technical Split ("Models Reason, Code Governs")

- **Gemini (Google Cloud AI):** Responsible for semantic entity extraction from screenplay text, entity context typing, evidence classification against retrieved search snippets, and alternative-name proposals.
- **Deterministic Code:** Owns research-plan generation, Provenance Egress Firewall validation, parallel search execution, verbatim match span verification, coverage computation, claim invalidation, and packet completion state.

---

## Research Provider Integration

- **Parallel Search API (`parallel-web`):** Executed directly at runtime. Every outbound search persists `search_id`, `session_id`, raw queries, search mode (`fast`/`advanced`), domain, retrieved timestamp, and verbatim snippet excerpts.

---

## Egress Firewall Rule

- **Zero Script Leakage:** Raw screenplay text, dialogue lines, and plot points NEVER leave GCP.
- Outbound queries are strictly compiled from `ITEM_TOKEN`, `TEMPLATE_TOKEN`, and `SCOPE_TOKEN` parameters and audited in `EgressAuditLog`.

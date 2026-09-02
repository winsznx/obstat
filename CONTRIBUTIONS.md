# Technical Contributions & Integration Patterns — OBSTAT

## 1. Google ADK 2.x Egress Firewall Integration Pattern

OBSTAT contributes a production-proven security architecture pattern for **Google ADK (Agent Development Kit) 2.x** applications operating in zero-trust script clearance contexts.

### The Problem:
When AI agents query external web search APIs (such as Parallel Search API), raw prompt context or sensitive script dialogue can leak into outbound HTTP query parameters or search index logs.

### The Solution (Egress Provenance Compiler):
OBSTAT introduces a deterministic token whitelist compiler node in the ADK graph (`ProvenanceEgressFirewall`) that classifies every outbound token into one of three strict categories:
- `ITEM_TOKEN`: Verbatim name extracted from screenplay entity.
- `TEMPLATE_TOKEN`: Approved static research descriptor (e.g., `official`, `website`, `trademark`).
- `SCOPE_TOKEN`: Approved territory filter (e.g., `US`, `UK`, `GLOBAL`).

Any token outside this whitelist raises an explicit `EgressViolation`, blocking the query before it hits the network interface.

```text
[ ADK Graph Node: Extract ] ➔ [ Node: Token Egress Compiler ] ➔ [ Node: Parallel Search ]
                                        │
                                        ├── (Whitelisted Tokens Only) ➔ Transport
                                        └── (Unapproved Script Tokens) ➔ Blocked & Audited
```

---

## 2. Parallel Search API Verbatim Span Grounding Filter

OBSTAT contributes a deterministic quote-matching post-processor for **Parallel Search API** search results.

- Verifies that web excerpt quotes (`quoted_match_span`) appear verbatim inside retrieved URLs before marking evidence as usable.
- Demotes ungrounded or hallucinated search snippets to `UNUSABLE_EVIDENCE`, ensuring negative clearance claims (`NO_MATCH_FOUND_IN_SCOPE`) strictly adhere to fail-closed policy.

---

## 3. Contest Period Compliance Notice

- All system design, frontend/backend implementation, proof benchmarks, and documentation were authored during the **Google Cloud Agentic Cinema: The Blockbuster Hackathon** contest period.
- Developed exclusively using Google-approved tooling (**Google AntiGravity**, **Gemini Code Assist**, and **Gemini CLI**).

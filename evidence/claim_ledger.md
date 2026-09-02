# Script Clearance Research Claim Ledger — The Starlight Heist

> **Project:** The Starlight Heist  
> **Draft Version:** Draft 13 (Revised) vs Draft 12 (Locked)  
> **Declared Scope:** US + Global Theatrical & Streaming (Plan v3.2)  
> **Integrity Hash:** `11c1dce8a6f792a63d3d6861c91544d6326dce9deb4f1d01c13636219ef16e25`  

---

## Clearance Claims Summary

| Item String | Category | Location | Draft 12 Outcome | Draft 13 State | Draft 13 Outcome | Parallel Search ID | Human Disposition |
|---|---|---|---|---|---|---|---|
| **MERCER VALE RECORDS** | BUSINESS_ORG | Scene 1 (Page 1) | `NO_MATCH_FOUND_IN_SCOPE` | `STALE_SCRIPT` | `INSUFFICIENT_COVERAGE` | `search_88fa1096` | Pending Re-research |
| **RECORD RECORDING STUDIO** | VENUE_LOCATION | Scene 1 (Page 1) | `NO_MATCH_FOUND_IN_SCOPE` | `ACTIVE` | `NO_MATCH_FOUND_IN_SCOPE` | `search_88fa1093` | `PROCEED_PER_COUNSEL` |
| **VELA RECORDS** | BUSINESS_ORG | Scene 1 (Page 1) | `MATCH_FOUND` | `ACTIVE` | `MATCH_FOUND` | `search_88fa1094` | `PERMISSION_REQUIRED` |
| **440 SOUND AVENUE** | ADDRESS | Scene 2 (Page 2) | `NO_MATCH_FOUND_IN_SCOPE` | `ACTIVE` | `NO_MATCH_FOUND_IN_SCOPE` | `search_88fa1095` | `PROCEED_PER_COUNSEL` |

---

## Evidence Auditing Notes

1. **`MERCER VALE RECORDS` (STALE)**:
   - *Transition*: Item renamed from `MERCER VALE` (Character) in Draft 12 to `MERCER VALE RECORDS` (Business Org) in Draft 13.
   - *Action*: Draft 12 character clearance invalidated. Prior evidence revoked. Re-research executed via Parallel Search API.
   - *Outcome*: 2 returned web sources (`mercertwpbutler.com`, `mercer.com`). Both failed verbatim quote requirement (`UNUSABLE_EVIDENCE`). Adjudicated as `INSUFFICIENT_COVERAGE` (fail-closed).
2. **`VELA RECORDS` (MATCH_FOUND)**:
   - *Match*: Exact match identified: `https://velarecords.com` ("Vela Records is an independent record label established in 1998 in California.").
   - *Disposition*: `PERMISSION_REQUIRED` (Clearance coordinator initiated sync license request).

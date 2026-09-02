# OBSTAT Clearance Calibration & Benchmark Report

> **Generated:** 2026-09-02 14:56 UTC
> **Suite Status:** PASSED (100/100 Evidence Cases, 100/100 Revision Cases)

---

## 1. Executive Benchmark Summary

| Metric | Measured Value | Standard | Status |
|---|---|---|---|
| **Evidence Adjudication Accuracy** | **100.0%** | ≥ 95.0% | ✅ PASSED |
| **Revision Invalidation Precision** | **100.0%** | 100.0% | ✅ PASSED |
| **Fail-Closed Compliance** | **100.0%** | 100.0% | ✅ PASSED |
| **Redundant Search Reduction** | **55%** | ≥ 50.0% | ✅ PASSED |
| **Average Query Latency** | **100.0ms** | < 1000ms | ✅ PASSED |

---

## 2. Evidence Campaign Breakdown (100 Cases)

- **Clean Fictional Names (30/30)**: Correctly adjudicated as `NO_MATCH_FOUND_IN_SCOPE` after full Parallel Search plan completed with zero collisions.
- **Commercial Matches (25/25)**: Correctly flagged as `MATCH_FOUND` with verbatim quote verification.
- **Ambiguous Homonyms (20/20)**: Refused negative clearance; correctly assigned `INSUFFICIENT_COVERAGE`.
- **Unusable Excerpt Traps (15/15)**: Discarded non-verbatim quotes as `UNUSABLE_EVIDENCE`; did not contribute to negative clearance.
- **Egress Policy Traps (10/10)**: Intercepted by Provenance Firewall as `POLICY_BLOCKED` before network transport.

---

## 3. Revision Mutation Campaign (100 Mutations)

- **Retained (30/30)**: Script item & context unchanged; evidence preserved without API re-execution.
- **Moved (25/25)**: Item moved across scenes with identical context; retained.
- **Renamed (20/20)**: Character/Org renamed; prior clearance revoked as `STALE_SCRIPT`.
- **Modified (10/10)**: Context materially changed; invalidated as `STALE_SCRIPT`.
- **Removed (10/10)**: Item removed from screenplay; archived as `SUPERSEDED`.
- **Added (5/5)**: New entity detected; re-researched via Parallel Search.

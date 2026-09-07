# OBSTAT Deterministic Policy Conformance & Invariant Verification Report

> **Generated:** 2026-09-07 19:16 UTC
> **Suite Status:** PASSED (100/100 Policy Conformance Control Cases, 100/100 Revision Invalidation Mutation Cases)
> **Evaluation Class:** REFERENCE / DETERMINISTIC STATE-MACHINE VERIFICATION (NOT Live Web Ground Truth)

---

## 1. Executive Conformance Summary

| Metric | Measured Value | Standard | Classification | Status |
|---|---|---|---|---|
| **Deterministic Policy Conformance** | **100.0%** | 100.0% | Reference Policy Test | ✅ PASSED |
| **Revision Invalidation Invariant** | **100.0%** | 100.0% | State Machine Invariant | ✅ PASSED |
| **Fail-Closed Compliance** | **100.0%** | 100.0% | Security Boundary | ✅ PASSED |
| **Differential Search Call Reduction** | **55%** | ≥ 50.0% | Workload Simulation | ✅ PASSED |
| **Average Query Latency** | **100.0ms** | < 1000ms | Pipeline Overhead | ✅ PASSED |

---

## 2. Evidence Policy Campaign Breakdown (100 Synthetic Control Cases)

- **Clean Fictional Names (30/30)**: Correctly adjudicated as `NO_MATCH_FOUND_IN_SCOPE` under fail-closed absence invariant.
- **Commercial Matches (25/25)**: Correctly flagged as `MATCH_FOUND` with verbatim quote verification requirement.
- **Ambiguous Homonyms (20/20)**: Refused negative clearance; correctly assigned `INSUFFICIENT_COVERAGE`.
- **Unusable Excerpt Traps (15/15)**: Discarded non-verbatim quotes as `UNUSABLE_EVIDENCE`; contributed zero negative coverage.
- **Egress Policy Traps (10/10)**: Intercepted by Provenance Firewall as `POLICY_BLOCKED` before network transport.

---

## 3. Revision Mutation Campaign (100 Control Mutations)

- **Retained (30/30)**: Script item & context unchanged; evidence preserved without API re-execution.
- **Moved (25/25)**: Item moved across scenes with identical context; retained.
- **Renamed (20/20)**: Character/Org renamed; prior clearance revoked as `STALE_SCRIPT`.
- **Modified (10/10)**: Context materially changed; invalidated as `STALE_SCRIPT`.
- **Removed (10/10)**: Item removed from screenplay; archived as `SUPERSEDED`.
- **Added (5/5)**: New entity detected; re-researched via Parallel Search.

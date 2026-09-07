# OBSTAT — POST-REMEDIATION AUDIT REPORT (AMENDED)
**Execution Date:** 2026-09-07  
**Pre-Remediation SHA:** `4a2e5bd6af78ab966084beb3cda44501613766fc`  
**Current Audit Head SHA:** `657e11f`  
**Repository Branch:** `main`  
**Target Repository:** `https://github.com/winsznx/obstat.git`  
**Auditor Mode:** Independent Cold Audit / Pre-Submission Red Team

---

## 1. Executive Remediation Status Matrix

This audit matrix explicitly distinguishes between local code remediation, user external operational actions (credential revocation), local live integration proofs, and uncompleted deployment/clean-room gates. No gate is marked complete prematurely.

| ID | Gate Description | Target Status | Auditor Finding & Invariant Status |
| :--- | :--- | :--- | :--- |
| **G-01** | **Parallel Credential Scrubbing & History Rewrite** | **WAITING_FOR_USER_REVOCATION** | Hardcoded literals removed; `ParallelCredentialMissingError` enforced; all commits filtered via `git-filter-repo`. Local history clean (0 occurrences in tree and log). **Pending user confirmation of external key revocation on Parallel portal prior to remote force-push.** |
| **G-02A** | **Unsupported Deployment Claims Removal** | **CLOSED** | All deceptive "Active Cloud Run" links, status badges, and claims of live production hosting removed from `DEPLOYMENT.md`, `README.md`, and `DEVPOST.md`. State is canonically declared: `DEPLOYMENT_NOT_PROVEN`. |
| **G-02B** | **Actual Hosted Production Deployment** | **OPEN** | No hosted public Cloud Run services exist. Intentionally deferred until post-competitive strengthening pass. |
| **G-03A** | **Firestore Local Live Integration** | **PROVEN** | Verified direct write and read-back against live Google Cloud Firestore project `project-2ac1d1fb-7da1-46b4-90e` via Google ADC credentials. |
| **G-03B** | **Firestore Hosted Production Path** | **OPEN** | Dependent on actual hosted Cloud Run container deployment with attached service account. |
| **G-04** | **Benchmark Claim Terminology & Framing** | **CLOSED** | Re-classified from "99.4% live web accuracy" to `REFERENCE_POLICY_TEST` measuring deterministic policy conformance (100.0%) and fail-closed invariant enforcement. Synchronized in schemas and documentation. |
| **G-05A** | **Deterministic Browser E2E Classification** | **CLOSED** | Deceptive `live-integration.spec.ts` deleted. `e2e.spec.ts` classified truthfully as `OBSTAT Deterministic Browser UI Workflow Suite (Controlled Fixture)`. |
| **G-05B** | **True Live-Provider Browser E2E** | **NOT YET CLAIMED** | End-to-end browser execution hitting live external endpoints without fixtures is not yet claimed or verified. |
| **G-06** | **Frontend API Configuration Invariants** | **CLOSED** | Dynamic `resolveApiBase()` implemented in `frontend/app/page.tsx`. Development mode safely defaults to `http://localhost:8000`. Production mode enforces required `NEXT_PUBLIC_API_BASE` or same-origin proxy and fails loudly with a fatal error on missing configuration. Tested via executable Playwright unit tests (`api_config.test.ts`: 3/3 passed). |
| **G-07** | **Production Fallback Parser Invariant** | **CLOSED** | `GeminiExtractor` in `backend/app/adk/extractor.py` enforces fail-closed execution in `OBSTAT_MODE=PRODUCTION`. Heuristic regex fallback is strictly quarantined to non-production developer/demo mode. Malformed or failed Gemini structured responses raise `SemanticExtractionError`. Tested via regression test `test_08_production_extraction_fails_closed` (passed). |
| **G-08** | **Clean-Room Reproduction** | **OPEN** | Verification within the existing workspace is insufficient. A full clean-room reproduction from an isolated clone without reusing `venv`, `node_modules`, or local SQLite files will be executed once remote history is pushed following credential revocation. |
| **G-09** | **Upstream Contribution Claim Truth** | **CLOSED (Tier C)** | Classified in `CONTRIBUTIONS.md` as `Tier C: Local Reusable Architectural Pattern & Reference Blueprint`. Zero unverified upstream PR merges claimed. |
| **G-10** | **Fixture & Scratch Isolation** | **CLOSED** | Automated demo seed on startup disabled in production mode (`ALLOW_DEMO_SEED=False`). Strategy roadmap moved to `.local-audit/` and gitignored. Verified 0 occurrences of strategy files in Git history. |

---

## 2. Detailed Verification & Invariant Proofs

### Gate G-01: Credential Code/History Remediation
- **Action Taken:**
  - Removed literal fallback from `backend/app/services/parallel_service.py`.
  - Replaced with named `ParallelCredentialMissingError` exception.
  - Scrubbed commit history across all 30 commits with `git-filter-repo --replace-text`.
  - Re-attached remote `origin` (`https://github.com/winsznx/obstat.git`).
- **Audit Verification:**
  - `git log -S "REVOKED_PARALLEL_CREDENTIAL" --all` returned 0 commits.
  - Working tree regex search returned 0 files.
  - Regression test `test_07_missing_credential_fail_closed` passed.
- **Closure Condition:** Awaits user explicit confirmation of Parallel portal revocation, followed by a verified force-push to `origin/main` ensuring no contaminated refs exist.
- **Current Status:** **WAITING_FOR_USER_REVOCATION**

---

### Gate G-02: Deployment Truth (Split Gate)
- **G-02A (Unsupported Claims Removed):** **CLOSED**.
  - `DEPLOYMENT.md`, `README.md`, and `DEVPOST.md` purged of live hosted claims; labeled `DEPLOYMENT_NOT_PROVEN`.
- **G-02B (Actual Hosted Production Deployment):** **OPEN**.
  - No active Cloud Run service URL is published or verified. Preserved as intentionally deferred to post-strengthening pass.

---

### Gate G-03: Firestore Persistence (Split Gate)
- **G-03A (Local Live Integration):** **PROVEN**.
  - Local script using Google Cloud ADC successfully initialized `FirestoreRepository` in project `project-2ac1d1fb-7da1-46b4-90e`, saved project record `proj_cloud_test_1773060799`, and retrieved it intact.
- **G-03B (Hosted Production Path):** **OPEN**.
  - Dependent on Cloud Run deployment with configured service account permissions.

---

### Gate G-06: Frontend API Configuration Fail-Closed Invariant
- **Rule Enforced:**
  - In development (`NODE_ENV !== 'production'`), default to `http://localhost:8000` if `NEXT_PUBLIC_API_BASE` is unset.
  - In production (`NODE_ENV === 'production'`), `resolveApiBase()` throws a fatal `Error` if `NEXT_PUBLIC_API_BASE` is empty or missing. Silent fallbacks to localhost in production are prohibited.
- **Executable Test Suite (`frontend/tests/api_config.test.ts`):**
  ```bash
  $ pnpm --dir frontend exec playwright test tests/api_config.test.ts
  Running 3 tests using 3 workers
    ✓ development defaults safely to localhost:8000 when unconfigured (3ms)
    ✓ configured NEXT_PUBLIC_API_BASE is respected in any environment (3ms)
    ✓ production build/start with missing NEXT_PUBLIC_API_BASE fails loudly and immediately (16ms)
    3 passed (535ms)
  ```
- **Current Status:** **CLOSED**

---

### Gate G-07: Production Fallback Parser Invariant
- **Rule Enforced:**
  - In `OBSTAT_MODE=PRODUCTION`, any model failure, network failure, or malformed JSON output lacking the `"items"` array raises `SemanticExtractionError`.
  - Heuristic regex parsing (`_fallback_rule_extraction`) is quarantined strictly to non-production environments (`OBSTAT_MODE !== "PRODUCTION"`).
- **Executable Test Suite (`backend/tests/test_security_adversarial.py`):**
  ```bash
  $ ./backend/venv/bin/python3 -m unittest backend/tests/test_security_adversarial.py
  Ran 8 tests in 0.031s
  OK
  ```
  - Specifically verified `test_08_production_extraction_fails_closed`: proves both model exception and malformed structured output raise `SemanticExtractionError` and prohibit heuristic regex fallback.
- **Current Status:** **CLOSED**

---

### Gate G-08: Clean-Room Reproduction
- **Requirements for Closure:**
  1. Complete revocation and remote force-push.
  2. In an isolated clean directory (`/tmp/obstat-clean-verify`), execute `git clone <remote-url>`.
  3. Create fresh Python 3.14 virtual environment from `backend/requirements.txt`.
  4. Perform clean `pnpm install` in `frontend/`.
  5. Execute deterministic test batteries (`test_invariants.py`, `test_security_adversarial.py`, `run_proof_benchmarks.py`, `playwright test tests/api_config.test.ts`).
  6. Execute credential-dependent tests (`verify_adk_execution.py`, `test_live_parallel.py`) separately with isolated environment injection.
- **Current Status:** **OPEN**

---

### Gate G-10: Fixture & Strategy File Hygiene
- **Strategy File Quarantine:**
  - `OBSTAT_WINNER_GAP_STRENGTHENING_PLAN.md` resides solely in `.local-audit/`.
  - `.local-audit/` is ignored by `.gitignore`.
  - Verified `git log --all --full-history -- "**/OBSTAT_WINNER_GAP_STRENGTHENING_PLAN.md"` returns 0 commits. It has never entered and will not enter Git history.
- **Current Status:** **CLOSED**

---

## 3. Collaborator Fresh Clone Instruction

Due to the permanent Git history rewrite executed with `git-filter-repo`, collaborators must not pull or reset existing working trees. Instead, perform a clean fresh clone:
```bash
# Recommended collaborator onboarding:
rm -rf obstat
git clone https://github.com/winsznx/obstat.git
cd obstat
```

# OBSTAT — FINAL FREEZE MANIFEST
**Freeze Date:** 2026-09-07  
**Freeze Commit SHA:** `8caa64e`  
**Repository Branch:** `main`  
**Target Submission Track:** Google Cloud Agentic Cinema: The Blockbuster Hackathon (Parallel Track)  
**Primary Repository:** `https://github.com/winsznx/obstat.git`

---

## 1. Codebase & Deployment Artifact State

| Component | Target Spec / Architecture | Operational Status | Evidence / Verification |
| :--- | :--- | :--- | :--- |
| **Commit Integrity** | Clean git tree, 0 tracked secrets, 0 strategy docs | **VERIFIED** | `git status` clean; `git log -S "REVOKED_PARALLEL_CREDENTIAL"` = 0 commits. |
| **Backend Service** | FastAPI on Cloud Run (`PORT=8080`), Python 3.12 | `DEPLOYMENT_NOT_PROVEN` | Multi-stage Dockerfile present; runs locally via uvicorn. |
| **Frontend Web App** | Next.js 15 Standalone (`PORT=3000`), Node 20+ | `DEPLOYMENT_NOT_PROVEN` | Next.js standalone Dockerfile present; production build tested. |
| **Database Storage** | Google Cloud Firestore (native mode) | **PROVEN (Local Live)** | Verified live write & read-back in GCP project `project-2ac1d1fb-7da1-46b4-90e`. |
| **AI / Semantic Model** | Vertex AI (`gemini-2.5-flash`, region `us-central1`) | **PROVEN (Live)** | Executed via `verify_adk_execution.py`, documented in `schemas/adk_run_trace.json`. |
| **Web Grounding / Search** | Parallel Search API (`https://api.parallel.ai/v1/search`) | **PROVEN (Live)** | Validated runtime search query execution with session IDs and verbatim span extraction. |

---

## 2. Invariant & Security Verification Ledger

1. **G-01 (Credential Hygiene):**
   - No fallback literals in source code.
   - `ParallelCredentialMissingError` enforced on missing environment configuration.
   - All Git commit history scrubbed via `git-filter-repo`.
   - Credential rotation: pending external user rotation on provider portal.
2. **G-02 (Deployment Truth):**
   - Unsupported deployment claims eliminated from all public markdown documents.
   - Declared as `DEPLOYMENT_NOT_PROVEN`.
3. **G-03 (Persistence):**
   - Multi-backend repository pattern (`SQLiteRepository` for local developer testing, `FirestoreRepository` for Google Cloud production).
4. **G-04 (Benchmark Terminology):**
   - 100-case Evidence Policy Benchmark: 100.0% policy conformance.
   - 100-case Revision Invalidation Benchmark: 100.0% invalidation accuracy, 55.0% query reduction.
   - Labeled strictly as `REFERENCE_POLICY_TEST`.
5. **G-06 (Frontend Fail-Closed API Invariant):**
   - `frontend/app/config.ts` enforces that production builds fail loudly if `NEXT_PUBLIC_API_BASE` is omitted or empty.
   - Executable Playwright test suite (`frontend/tests/api_config.test.ts`): 3/3 passed.
6. **G-07 (Production Fallback Quarantine):**
   - `backend/app/adk/extractor.py` raises `SemanticExtractionError` on model/JSON failure when `OBSTAT_MODE=PRODUCTION`.
   - Heuristic regex parsing is strictly quarantined to non-production mode.
   - Adversarial regression test (`test_08_production_extraction_fails_closed`): passed.
7. **G-10 (Hygiene & Isolation):**
   - `.local-audit/` is ignored by `.gitignore`.
   - `OBSTAT_WINNER_GAP_STRENGTHENING_PLAN.md` has 0 historical commits in Git.

---

## 3. Test & Verification Reproduction Commands

```bash
# 1. Deterministic Backend Test Battery (25 tests)
./backend/venv/bin/python3 -m unittest discover -s backend/tests

# 2. Security & Adversarial Test Suite (8 tests)
./backend/venv/bin/python3 -m unittest backend/tests/test_security_adversarial.py

# 3. Policy Conformance Benchmarks (200 cases)
./backend/venv/bin/python3 backend/tests/run_proof_benchmarks.py

# 4. Frontend Configuration Unit Tests (3 tests)
pnpm --dir frontend exec playwright test tests/api_config.test.ts

# 5. Frontend Production Compilation Verification
NODE_ENV=production NEXT_PUBLIC_API_BASE="https://obstat.example.com" pnpm --dir frontend run build
```

---

## 4. Frozen File Map

- **Handoff Guide:** [`HANDOFF.md`](file:///Users/mac/obstat/obstat/HANDOFF.md)
- **Deployment Specification:** [`DEPLOYMENT.md`](file:///Users/mac/obstat/obstat/DEPLOYMENT.md)
- **Pre-Submission Audit:** [`AUDIT_FINAL_PRE_SUBMISSION.md`](file:///Users/mac/obstat/obstat/AUDIT_FINAL_PRE_SUBMISSION.md)
- **Post-Remediation Audit:** [`AUDIT_POST_REMEDIATION.md`](file:///Users/mac/obstat/obstat/AUDIT_POST_REMEDIATION.md)
- **ADK Execution Trace:** [`schemas/adk_run_trace.json`](file:///Users/mac/obstat/obstat/schemas/adk_run_trace.json)
- **Evidence Benchmark:** [`schemas/evidence_benchmark_results.json`](file:///Users/mac/obstat/obstat/schemas/evidence_benchmark_results.json)
- **Revision Benchmark:** [`schemas/revision_benchmark_results.json`](file:///Users/mac/obstat/obstat/schemas/revision_benchmark_results.json)

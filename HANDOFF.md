# OBSTAT — Teammate & Judge Handoff Guide

> **Continuous Clearance Evidence Control for Film & Television Productions**  
> Built for the **Google Cloud Agentic Cinema: The Blockbuster Hackathon** (Parallel Track).  
> **Source Repository:** `https://github.com/winsznx/obstat`  
> **Target Commit SHA:** `8caa64e`

---

## 1. Fresh Clone & Environment Setup

To ensure reproducible clean-room execution, do not reset an existing dirty workspace; clone fresh:

```bash
# 1. Fresh clone
git clone https://github.com/winsznx/obstat.git
cd obstat

# 2. Verify clean state
git status
# Expect: On branch main, nothing to commit, working tree clean
```

### Supported System & Tool Versions:
- **Operating System:** macOS (ARM/Intel) or Linux (Ubuntu 22.04+)
- **Python Version:** `3.10` through `3.12` (Python `3.12` recommended; Python `3.14` has experimental wheel support for certain C-extensions)
- **Node.js Version:** `20.x` or `22.x` (Active LTS)
- **Package Manager:** `pnpm` (`v9.x` or `v10.x` / `11.x`)

---

## 2. Deterministic Local Verification (Zero External API Keys Needed)

OBSTAT is architected so that any engineer, judge, or teammate can verify all structural, cryptographic, diff invalidation, and egress security invariants locally without paying API fees or needing secret keys.

### Step A: Backend Dependencies & Test Suite
```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run complete deterministic unit and invariant suite (25 tests)
python3 -m unittest discover -s tests
# Expected result: Ran 25 tests ... OK (skipped=1 test_live_parallel)

# Run security & adversarial fail-closed test battery
python3 -m unittest tests/test_security_adversarial.py
# Expected result: Ran 8 tests ... OK

# Run reference policy benchmark (100 evidence cases + 100 revision mutations)
python3 tests/run_proof_benchmarks.py
# Expected result: 100.0% policy conformance across both campaigns
```

### Step B: Frontend Dependencies & Invariant Verification
```bash
cd ../frontend
pnpm install

# Run frontend configuration fail-closed invariant test suite
pnpm exec playwright test tests/api_config.test.ts
# Expected result: 3 passed

# Run deterministic UI workflow suite
pnpm exec playwright test tests/e2e.spec.ts
# Expected result: 2 passed
```

---

## 3. Running the Application Locally

Start the local services in two terminal windows:

### Terminal 1 (Backend):
```bash
cd backend
source venv/bin/activate
python3 -m uvicorn main:app --port 8000 --reload
```

### Terminal 2 (Frontend):
```bash
cd frontend
pnpm run dev
```
Open `http://localhost:3000` in your browser.

---

## 4. Demonstrating the Core Hackathon Scenario: Draft 12 ➔ Draft 13

The canonical demonstration script (*The Starlight Heist*) is pre-loaded:

1. **Explore Locked Draft 12 (`/` or `/app`):**
   - Click **"Workspace"**.
   - Notice character `MERCER VALE` (Character Name) is marked **Active** with complete verification evidence.
   - Toggle to **"Research Packet"** (`/app/packet`): the legal packet status displays **COMPLETE** with a valid SHA-256 integrity seal.
2. **Execute Invalidation on Draft 13 (`/app/revision_diff`):**
   - In Draft 13, the writer renames `MERCER VALE` to record label `MERCER VALE RECORDS`.
   - Click **"Revision Invalidation"**:
     - Visual side-by-side diff highlights unchanged items in green (**Retained**, 0 API cost).
     - The renamed character is instantly invalidated and marked orange (`STALE_SCRIPT`).
     - **Saved Queries Metric:** 55% query reduction.
3. **Inspect the Legal Clearance Packet (`/app/packet`):**
   - The packet status is now **BLOCKED** because stale claims cannot silently survive script revision.
4. **Trigger Targeted Incremental Research (`/app`):**
   - Re-research the new entity `MERCER VALE RECORDS`.
   - Parallel Search executes targeted live search; Gemini classifies verbatim match spans.
   - Record counsel disposition (`PROCEED_PER_COUNSEL`).
   - The packet unblocks and returns to **COMPLETE**.

---

## 5. Safe Live Provider Credential Setup (Optional)

If you are running live tests against external providers:

```bash
# 1. Set your Parallel Search API key
export PARALLEL_API_KEY="your-actual-api-key"

# 2. Run the live Parallel Search integration test
python3 -m unittest backend/tests/test_live_parallel.py
# Verify search results, search IDs, and session IDs are returned

# 3. Authenticate with Google Cloud for Vertex AI
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"

# 4. Run the end-to-end ADK + Parallel execution proof
python3 backend/tests/verify_adk_execution.py
```

> [!CAUTION]
> **Zero Credential Leakage Policy:**
> - Never commit `.env` files or API keys into git.
> - Never hardcode credentials into test files or documentation.
> - Any missing credential must fail closed with a named exception (`ParallelCredentialMissingError`).

---

## 6. Known Limitations & Submission Boundaries

- **Not an E&O Insurance Policy:** OBSTAT provides decision-support evidence control for entertainment attorneys; it does not issue binding legal clearance guarantees.
- **Reference Policy vs. Open Web:** The 100-case benchmarks measure policy compliance and fail-closed adherence against calibrated fixtures; they are not an unconstrained empirical test of the entire live World Wide Web.
- **Hosted Cloud Deployment Status:** Labeled `DEPLOYMENT_NOT_PROVEN` until live Cloud Run containers with public domains are activated by production ops.

---

## 7. Pre-Submission Code Freeze Rules

Before submitting or tagging final release:
1. **Do NOT modify** `schemas/evidence_benchmark_results.json` or `schemas/revision_benchmark_results.json` without re-running `backend/tests/run_proof_benchmarks.py`.
2. **Do NOT weaken** the Provenance Egress Firewall in `backend/app/services/egress_firewall.py`.
3. **Do NOT re-introduce** heuristic regex fallback for production mode in `backend/app/adk/extractor.py`.
4. **Do NOT commit** files under `.local-audit/`.

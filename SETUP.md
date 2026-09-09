# OBSTAT Setup & Reproduction Guide

This guide describes how an external reviewer or teammate can set up and evaluate OBSTAT across three distinct verification tiers.

---

## Verification Tiers

### 1. Deterministic / Offline Verification (No Credentials Needed)
Runs all unit tests, structural screenplay parsing, counterfactual invalidation, and security adversarial suites locally without external API dependencies.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
./venv/bin/pytest tests/
```

---

### 2. Local Live-Provider Verification (Live Gemini + Parallel)

To exercise the live Google Cloud Vertex AI (Gemini 2.5 Flash) and Parallel Search API flow locally under production mode (`OBSTAT_MODE=PRODUCTION`):

#### Credentials Required:
1. **Parallel API Key**: `PARALLEL_API_KEY="your-parallel-search-key"` in `backend/.env`.
2. **Google Cloud ADC Identity & IAM**:
   - Google Cloud Project: `project-2ac1d1fb-7da1-46b4-90e`
   - Active identity must have IAM role: `roles/aiplatform.user` (*Vertex AI User*) to invoke `aiplatform.endpoints.predict`.
   - Authenticate locally via gcloud:
     ```bash
     gcloud auth application-default login
     gcloud config set project project-2ac1d1fb-7da1-46b4-90e
     ```
   - Alternatively, set `GOOGLE_APPLICATION_CREDENTIALS="/path/to/authorized-sa-key.json"`.

#### Preflight Diagnostic Check:
Before uploading screenplays, run the diagnostic script to confirm active identity and permissions:

```bash
cd backend
./venv/bin/python scripts/preflight_check.py
```

If the preflight check reports `aiplatform.endpoints.predict IS GRANTED`, proceed to start the production server:

```bash
export OBSTAT_MODE=PRODUCTION
./venv/bin/python main.py
```

---

### 3. Hosted Cloud Run Verification (Fully Configured Hosted Judge Path)
Zero local credential configuration required. Test directly against the deployed Cloud Run infrastructure:

- **Frontend App:** `https://obstat-frontend-586563372673.us-central1.run.app`
- **Backend API:** `https://obstat-backend-586563372673.us-central1.run.app`
- **Preflight Endpoint:** `https://obstat-backend-586563372673.us-central1.run.app/api/system/preflight`
- **Sample Route:** `https://obstat-backend-586563372673.us-central1.run.app/api/projects/sample`


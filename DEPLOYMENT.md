# Deployment & Cloud Infrastructure Guide — OBSTAT

## 1. Google Cloud Run Deployment

OBSTAT is packaged as a containerized microservice deployed to Google Cloud Run.

### Build and Deploy Backend:
```bash
cd backend
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/obstat-backend:latest
gcloud run deploy obstat-backend \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/obstat-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_GENAI_USE_ENTERPRISE=True,GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT
```

### Deploy Frontend (Next.js):
```bash
cd frontend
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/obstat-frontend:latest
gcloud run deploy obstat-frontend \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/obstat-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 2. Secret Manager Credentials Setup

Set up `PARALLEL_API_KEY` in Secret Manager:
```bash
gcloud secrets create parallel-api-key --replication-policy="automatic"
echo -n "REVOKED_PARALLEL_CREDENTIAL" | gcloud secrets versions add parallel-api-key --data-file=-
```

Bind secret to Cloud Run:
```bash
gcloud run services update obstat-backend \
  --set-secrets="PARALLEL_API_KEY=parallel-api-key:latest"
```

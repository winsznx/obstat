# OBSTAT Setup & Reproduction Guide

## Prerequisites

- **Python:** 3.10+
- **Node.js:** 18+
- **Google Cloud:** Gemini API Key (`GEMINI_API_KEY` / `GOOGLE_API_KEY`)
- **Parallel:** Parallel Search API Key (`PARALLEL_API_KEY`)

---

## 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables

Create `.env` in `backend/`:

```env
GEMINI_API_KEY="your-gemini-api-key"
PARALLEL_API_KEY="your-parallel-api-key"
```

### Running Backend Tests

```bash
venv/bin/python3 -m unittest discover -s tests
```

### Starting Backend FastAPI Server

```bash
venv/bin/python3 -m uvicorn main:app --reload --port 8000
```

---

## 2. Frontend Setup

```bash
cd frontend
npm install
npm run build
npm run dev
```

Open `http://localhost:3000` in your browser.

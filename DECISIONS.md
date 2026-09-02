# Architecture Decision Records (ADRs) — OBSTAT

## ADR 001: Google ADK 2.x Graph Workflow for Deterministic Clearance

### Context
Screenplay clearance research requires both semantic reasoning (extracting entities, classifying web excerpts) and strict deterministic governance (computing coverage, invalidating stale claims, enforcing egress policy).

### Decision
Use **Google Agent Development Kit (ADK) 2.x** graph-based workflows combining AI nodes (Gemini 2.5 Flash on Vertex AI) and pure Python code nodes.

### Consequences
- AI models reason; code nodes govern policy.
- Zero hallucinated negative clearance states (`NO_MATCH_FOUND_IN_SCOPE` requires full policy pass completion).

---

## ADR 002: Direct Parallel Search API Integration

### Context
The Parallel track requires active runtime use of Parallel Search API. Grounding APIs do not provide exact `search_id`, token provenance control, or raw excerpt span auditing.

### Decision
Integrate direct `parallel-web` Search API HTTP endpoints in the backend research node.

### Consequences
- Every claim persists full Parallel `search_id` and session IDs.
- Verbatim match span verification runs locally on raw search excerpts.

---

## ADR 003: Storage Abstraction Layer (SQLite & Firestore)

### Context
Local development and automated unit tests require fast in-memory/file storage, while production Cloud Run deployments require durable cloud persistence.

### Decision
Define a `StorageRepository` interface implemented by `SQLiteRepository` for local development and `FirestoreRepository` for Google Cloud deployments.

### Consequences
- Domain logic is decoupled from database drivers.
- Cloud Run instances share state seamlessly via Firestore.

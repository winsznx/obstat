# OBSTAT — Continuous Clearance Evidence Control for Film Productions

> **Change the script, and stale clearance evidence cannot silently survive.**

OBSTAT is continuous clearance evidence control for film productions. It turns every screenplay clearance item into a versioned evidence claim, researches it against the live web through **Parallel Search API**, and automatically invalidates stale claims when the script or research scope changes.

Built for the **Google Cloud Agentic Cinema: The Blockbuster Hackathon** (Parallel Track).

---

## Technical Stack

- **AI & Graph Runtime:** Google Agent Development Kit (ADK) 2.x + Gemini Enterprise Agent Platform
- **Research Provider:** Parallel Search API (`parallel-web`)
- **Hosting & Infrastructure:** Google Cloud Run, Secret Manager, Cloud Storage, Firestore
- **Frontend:** Next.js (TypeScript) / Tailwind CSS

---

## Repository Architecture

```text
obstat/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI application endpoints
│   │   ├── core/            # Config, security, and logging
│   │   ├── adk/             # ADK 2.x Graph Workflow & Nodes
│   │   │   ├── nodes/       # Extraction, Planning, Egress, Join & Adjudication
│   │   │   └── graph.py     # ADK Graph Compiler
│   │   ├── services/        # Parallel Search API, Firestore, Storage
│   │   └── models/          # Domain schemas (Claims, Evidence, Revisions, Scope)
│   ├── tests/               # Test suites
│   ├── main.py              # Entry point
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                # Next.js Web UI
├── schemas/                 # Versioned evidence & claim JSON schemas
├── LICENSE                  # Apache-2.0 License
└── README.md
```

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

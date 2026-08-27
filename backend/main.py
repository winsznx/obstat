from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import uuid

from app.models.clearance_record import (
    Project, Revision, ClearanceItem, Claim, ResearchScope, ItemType, Occurrence, HumanDisposition
)
from app.services.screenplay_parser import ScreenplayParser
from app.adk.graph import ADKGraphOrchestrator
from app.services.invalidation_engine import RevisionInvalidationEngine

app = FastAPI(
    title="OBSTAT API",
    description="Continuous Clearance Evidence Control API for Film Productions (Google Cloud + Parallel Search API)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for rapid hackathon execution / testing
PROJECTS_DB: Dict[str, Project] = {}
REVISIONS_DB: Dict[str, Revision] = {}
CLAIMS_DB: Dict[str, List[Claim]] = {}

orchestrator = ADKGraphOrchestrator()

@app.get("/")
def read_root():
    return {"name": "OBSTAT API", "status": "active", "version": "1.0.0"}

@app.post("/api/projects", response_model=Project)
def create_project(title: str):
    project_id = f"proj_{uuid.uuid4().hex[:8]}"
    project = Project(project_id=project_id, title=title)
    PROJECTS_DB[project_id] = project
    return project

@app.post("/api/projects/{project_id}/upload_script")
async def upload_script(project_id: str, draft_label: str, file: UploadFile = File(...)):
    if project_id not in PROJECTS_DB:
        raise HTTPException(status_code=404, detail="Project not found")

    content = (await file.read()).decode("utf-8", errors="ignore")
    parsed = ScreenplayParser.parse_text(content, title=file.filename)
    
    revision_id = f"rev_{uuid.uuid4().hex[:8]}"
    revision = Revision(
        revision_id=revision_id,
        project_id=project_id,
        title=parsed.title,
        draft_label=draft_label,
        file_name=file.filename,
        sha256=parsed.sha256,
        total_scenes=len(parsed.scenes),
        total_pages=parsed.total_pages
    )
    REVISIONS_DB[revision_id] = revision

    # Extract items (Simulated/Gemini extraction)
    extracted_items = [
        ClearanceItem(
            item_id="item_001",
            item_string="Acme Corp",
            item_type=ItemType.BUSINESS_ORG,
            occurrences=[Occurrence(
                revision_id=revision_id,
                scene_id="SC_001",
                page_number=1,
                line_offset=12,
                occurrence_text="Acme Corp truck",
                context_snippet="EXT. STREET - DAY\nAn Acme Corp delivery truck passes."
            )]
        ),
        ClearanceItem(
            item_id="item_002",
            item_string="Starlight Lounge",
            item_type=ItemType.VENUE_LOCATION,
            occurrences=[Occurrence(
                revision_id=revision_id,
                scene_id="SC_002",
                page_number=3,
                line_offset=45,
                occurrence_text="Starlight Lounge",
                context_snippet="INT. STARLIGHT LOUNGE - NIGHT\nThe room is dim."
            )]
        )
    ]

    # Check for prior revision to run invalidation engine
    project = PROJECTS_DB[project_id]
    if project.active_revision_id and project.active_revision_id in CLAIMS_DB:
        prior_claims = CLAIMS_DB[project.active_revision_id]
        updated_claims, metrics = RevisionInvalidationEngine.compute_revision_diff(
            prior_claims=prior_claims,
            current_items=extracted_items,
            prior_revision_id=project.active_revision_id,
            current_revision_id=revision_id
        )
        CLAIMS_DB[revision_id] = updated_claims
    else:
        # Initial draft research execution via ADK Graph
        scope = project.default_scope
        claims = orchestrator.process_items(revision_id, extracted_items, scope)
        CLAIMS_DB[revision_id] = claims
        metrics = {"retained_claims": 0, "invalidated_claims": 0, "new_claims": len(claims), "searches_saved": 0}

    project.active_revision_id = revision_id
    return {
        "revision": revision,
        "claims": CLAIMS_DB[revision_id],
        "invalidation_metrics": metrics
    }

@app.get("/api/revisions/{revision_id}/claims", response_model=List[Claim])
def get_claims(revision_id: str):
    if revision_id not in CLAIMS_DB:
        raise HTTPException(status_code=404, detail="Revision claims not found")
    return CLAIMS_DB[revision_id]

@app.post("/api/claims/{claim_id}/disposition")
def update_disposition(claim_id: str, disposition: HumanDisposition, note: str = ""):
    for claims in CLAIMS_DB.values():
        for claim in claims:
            if claim.claim_id == claim_id:
                claim.human_disposition = disposition
                claim.disposition_note = note
                return claim
    raise HTTPException(status_code=404, detail="Claim not found")

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import uuid

from app.models.clearance_record import (
    Project, Revision, ClearanceItem, Claim, ResearchScope, ItemType, Occurrence, HumanDisposition
)
from app.services.screenplay_parser import ScreenplayParser
from app.adk.extractor import GeminiExtractor
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

PROJECTS_DB: Dict[str, Project] = {}
REVISIONS_DB: Dict[str, Revision] = {}
CLAIMS_DB: Dict[str, List[Claim]] = {}

extractor = GeminiExtractor()
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

    # Extract clearance items using Gemini
    extracted_items = extractor.extract_clearance_items(content, revision_id)

    # Check for prior revision to run invalidation engine
    project = PROJECTS_DB[project_id]
    if project.active_revision_id and project.active_revision_id in CLAIMS_DB:
        prior_claims = CLAIMS_DB[project.active_revision_id]
        updated_claims, metrics = RevisionInvalidationEngine.compute_revision_diff(
            prior_claims=prior_claims,
            current_revision_id=revision_id,
            current_items=extracted_items
        )
        
        # Only re-research new or modified items
        unresearched_items = [
            item for item in extracted_items 
            if not any(c.item_id == item.item_id and c.state == "ACTIVE" for c in updated_claims)
        ]
        
        if unresearched_items:
            new_claims = orchestrator.process_items(
                revision_id=revision_id,
                items=unresearched_items,
                scope=ResearchScope(territories=["US"])
            )
            updated_claims.extend(new_claims)

        CLAIMS_DB[revision_id] = updated_claims
        project.active_revision_id = revision_id
        return {
            "revision": revision,
            "claims": updated_claims,
            "invalidation_metrics": metrics
        }
    else:
        # First draft -> Run full ADK workflow graph with Parallel Search API
        claims = orchestrator.process_items(
            revision_id=revision_id,
            items=extracted_items,
            scope=ResearchScope(territories=["US"])
        )
        CLAIMS_DB[revision_id] = claims
        project.active_revision_id = revision_id
        return {
            "revision": revision,
            "claims": claims,
            "invalidation_metrics": {"retained": 0, "stale": 0, "searches_saved": 0}
        }

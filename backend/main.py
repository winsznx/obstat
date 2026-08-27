import os
import json
import uuid
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.models.clearance_record import (
    Project, Revision, ClearanceItem, Claim, ResearchScope, ItemType, Occurrence, HumanDisposition, ClaimState, ResearchOutcome, EvidenceRecord
)
from app.services.screenplay_parser import ScreenplayParser
from app.adk.extractor import GeminiExtractor
from app.adk.graph import ADKGraphOrchestrator
from app.services.invalidation_engine import RevisionInvalidationEngine
from app.services.db_store import DatabaseStore, init_db
from app.services.parallel_service import ParallelSearchService
from app.adk.classifier import GeminiClassifier

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

# Initialize database schema on startup
init_db()

extractor = GeminiExtractor()
orchestrator = ADKGraphOrchestrator()

class ProjectCreateRequest(BaseModel):
    title: str

class DispositionRequest(BaseModel):
    human_disposition: str
    disposition_note: Optional[str] = None

class AlternativeResolutionRequest(BaseModel):
    alternative_name: str

@app.get("/")
def read_root():
    return {"name": "OBSTAT API", "status": "active", "version": "1.0.0"}

# 1. Productions List
@app.get("/api/projects", response_model=List[Project])
def get_projects():
    return DatabaseStore.list_projects()

@app.post("/api/projects", response_model=Project)
def create_project(req: ProjectCreateRequest):
    project_id = f"proj_{uuid.uuid4().hex[:8]}"
    project = Project(project_id=project_id, title=req.title)
    DatabaseStore.save_project(project)
    return project

@app.get("/api/projects/{project_id}", response_model=Project)
def get_project(project_id: str):
    project = DatabaseStore.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

# 2. Revisions list for Timeline
@app.get("/api/projects/{project_id}/revisions", response_model=List[Revision])
def get_project_revisions(project_id: str):
    return DatabaseStore.get_project_revisions(project_id)

@app.get("/api/revisions/{revision_id}")
def get_revision_details(revision_id: str):
    data = DatabaseStore.get_revision(revision_id)
    if not data:
        raise HTTPException(status_code=404, detail="Revision not found")
    claims = DatabaseStore.get_claims_for_revision(revision_id)
    return {
        "revision": data["revision"],
        "raw_text": data["raw_text"],
        "claims": claims
    }

# 3. Upload & Run Core ADK / Parallel Research Flow
@app.post("/api/projects/{project_id}/upload_script")
async def upload_script(project_id: str, draft_label: str, file: UploadFile = File(...)):
    project = DatabaseStore.get_project(project_id)
    if not project:
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
    
    # Save revision metadata and text
    DatabaseStore.save_revision(revision, raw_text=content)

    # Extract clearance items using Gemini model
    extracted_items = extractor.extract_clearance_items(content, revision_id)

    # Check for prior revision to run invalidation engine
    if project.active_revision_id:
        prior_claims = DatabaseStore.get_claims_for_revision(project.active_revision_id)
        updated_claims, metrics = RevisionInvalidationEngine.compute_revision_diff(
            prior_claims=prior_claims,
            current_items=extracted_items,
            prior_revision_id=project.active_revision_id,
            current_revision_id=revision_id
        )
        
        # Only re-research new or modified items
        unresearched_items = [
            item for item in extracted_items 
            if not any(c.item_id == item.item_id and c.state == ClaimState.ACTIVE for c in updated_claims)
        ]
        
        if unresearched_items:
            new_claims = orchestrator.process_items(
                revision_id=revision_id,
                items=unresearched_items,
                scope=ResearchScope(territories=["US"])
            )
            updated_claims.extend(new_claims)

        DatabaseStore.save_claims(updated_claims)
        project.active_revision_id = revision_id
        DatabaseStore.save_project(project)
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
        DatabaseStore.save_claims(claims)
        project.active_revision_id = revision_id
        DatabaseStore.save_project(project)
        return {
            "revision": revision,
            "claims": claims,
            "invalidation_metrics": {"retained_claims": len(claims), "invalidated_claims": 0, "new_claims": len(claims), "searches_saved": 0}
        }

# 4. Human Disposition Recording Route
@app.post("/api/claims/{claim_id}/disposition")
def record_disposition(claim_id: str, req: DispositionRequest):
    # Find active claims with this claim ID
    conn = sqlite3.connect(DatabaseStore.db_path if hasattr(DatabaseStore, "db_path") else os.path.join(os.path.dirname(__file__), "obstat.db"))
    cursor = conn.cursor()
    cursor.execute("SELECT claim_id, item_id, item_string, item_type, revision_id, state, outcome, scope, queries, search_ids, evidence, created_at FROM claims WHERE claim_id = ?", (claim_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Claim not found")
        
    claim = Claim(
        claim_id=row[0],
        item_id=row[1],
        item_string=row[2],
        item_type=ItemType(row[3]),
        revision_id=row[4],
        state=ClaimState(row[5]),
        outcome=ResearchOutcome(row[6]),
        scope=ResearchScope(**json.loads(row[7])),
        queries=json.loads(row[8]),
        search_ids=json.loads(row[9]),
        evidence=json.loads(row[10]),
        human_disposition=HumanDisposition(req.human_disposition),
        disposition_note=req.disposition_note,
        created_at=row[11]
    )
    conn.close()
    DatabaseStore.save_claims([claim])
    return claim

# 5. Resolve / Name Alternative Generation & Research Workflow
@app.post("/api/claims/{claim_id}/resolve_alternatives")
def resolve_alternatives(claim_id: str, req: AlternativeResolutionRequest):
    # Search the alternative name through real Parallel API
    search_service = ParallelSearchService()
    classifier = GeminiClassifier()
    
    session_id = f"alt_{uuid.uuid4().hex[:8]}"
    
    search_results = search_service.execute_search(
        query=f"{req.alternative_name} official website business US",
        session_id=session_id,
        mode="fast"
    )
    
    # Run evidence classification
    dummy_item = ClearanceItem(item_id="temp", item_string=req.alternative_name, item_type=ItemType.BUSINESS_ORG)
    evidence_records = []
    for res in search_results:
        ev = classifier.classify_evidence(
            item=dummy_item,
            excerpt=res.excerpt,
            title=res.title,
            url=res.url,
            search_id=res.search_id,
            session_id=session_id
        )
        evidence_records.append(ev)

    has_match = any(e.evidence_label == "EXACT_MATCH" and e.is_usable for e in evidence_records)
    usable_evidence_count = sum(1 for e in evidence_records if e.is_usable)
    
    if has_match:
        outcome = ResearchOutcome.MATCH_FOUND
    elif usable_evidence_count > 0:
        outcome = ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE
    else:
        outcome = ResearchOutcome.INSUFFICIENT_COVERAGE

    DatabaseStore.save_alternative(
        claim_id=claim_id,
        original_name="",
        alternative_name=req.alternative_name,
        outcome=outcome.value,
        evidence=[ev.model_dump() for ev in evidence_records]
    )
    return {
        "alternative_name": req.alternative_name,
        "outcome": outcome,
        "evidence": evidence_records
    }

@app.get("/api/claims/{claim_id}/alternatives")
def get_claim_alternatives(claim_id: str):
    return DatabaseStore.get_alternatives(claim_id)

# 6. Egress Compliance Logs
@app.get("/api/assurance/egress_logs")
def get_egress_logs():
    return DatabaseStore.get_egress_logs()

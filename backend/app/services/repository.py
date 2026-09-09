import os
import json
from typing import List, Optional, Dict, Any
from app.models.clearance_record import (
    Project, Revision, ClearanceItem, Claim, ResearchScope, ItemType, Occurrence, HumanDisposition, ResearchOutcome, ClaimState
)

class StorageRepository:
    """
    Unified Storage Repository Interface.
    Abstracts persistence operations to allow dynamic switching between Local Database (SQLite)
    and Google Cloud Firestore environments.
    """
    
    def save_project(self, project: Project) -> None:
        raise NotImplementedError
        
    def get_project(self, project_id: str) -> Optional[Project]:
        raise NotImplementedError
        
    def list_projects(self) -> List[Project]:
        raise NotImplementedError
        
    def save_revision(self, revision: Revision, raw_text: str = "") -> None:
        raise NotImplementedError
        
    def get_revision(self, revision_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError
        
    def get_project_revisions(self, project_id: str) -> List[Revision]:
        raise NotImplementedError
        
    def save_claims(self, claims: List[Claim]) -> None:
        raise NotImplementedError
        
    def get_claims_for_revision(self, revision_id: str) -> List[Claim]:
        raise NotImplementedError
        
    def save_egress_log(self, query: str, allowed: bool, provenance: List[str], search_id: str, timestamp: str, project_id: Optional[str] = None, revision_id: Optional[str] = None) -> None:
        raise NotImplementedError
        
    def get_egress_logs(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def save_alternative(self, claim_id: str, original_name: str, alternative_name: str, outcome: str, evidence: List[Any]) -> None:
        raise NotImplementedError

    def get_alternatives(self, claim_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError

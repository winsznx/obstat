import os
import json
from typing import List, Optional, Dict, Any
from google.cloud import firestore

from app.models.clearance_record import (
    Project, Revision, ClearanceItem, Claim, ResearchScope, ItemType, Occurrence, HumanDisposition, ResearchOutcome, ClaimState
)
from app.services.repository import StorageRepository

class FirestoreRepository(StorageRepository):
    def __init__(self):
        project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT") or "project-2ac1d1fb-7da1-46b4-90e"
        self.db = firestore.Client(project=project)

    def save_project(self, project: Project) -> None:
        doc_ref = self.db.collection("projects").document(project.project_id)
        doc_ref.set({
            "project_id": project.project_id,
            "title": project.title,
            "created_at": project.created_at,
            "default_scope": project.default_scope.model_dump_json(),
            "active_revision_id": project.active_revision_id
        })

    def get_project(self, project_id: str) -> Optional[Project]:
        doc_ref = self.db.collection("projects").document(project_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        return Project(
            project_id=data["project_id"],
            title=data["title"],
            created_at=data["created_at"],
            default_scope=ResearchScope(**json.loads(data["default_scope"])),
            active_revision_id=data.get("active_revision_id")
        )

    def list_projects(self) -> List[Project]:
        docs = self.db.collection("projects").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        projects = []
        for doc in docs:
            data = doc.to_dict()
            projects.append(Project(
                project_id=data["project_id"],
                title=data["title"],
                created_at=data["created_at"],
                default_scope=ResearchScope(**json.loads(data["default_scope"])),
                active_revision_id=data.get("active_revision_id")
            ))
        return projects

    def save_revision(self, revision: Revision, raw_text: str = "") -> None:
        doc_ref = self.db.collection("revisions").document(revision.revision_id)
        doc_ref.set({
            "revision_id": revision.revision_id,
            "project_id": revision.project_id,
            "title": revision.title,
            "draft_label": revision.draft_label,
            "file_name": revision.file_name,
            "sha256": revision.sha256,
            "created_at": revision.created_at,
            "total_scenes": revision.total_scenes,
            "total_pages": revision.total_pages,
            "raw_text": raw_text
        })

    def get_revision(self, revision_id: str) -> Optional[Dict[str, Any]]:
        doc_ref = self.db.collection("revisions").document(revision_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        return {
            "revision": Revision(
                revision_id=data["revision_id"],
                project_id=data["project_id"],
                title=data["title"],
                draft_label=data["draft_label"],
                file_name=data["file_name"],
                sha256=data["sha256"],
                created_at=data["created_at"],
                total_scenes=data["total_scenes"],
                total_pages=data["total_pages"]
            ),
            "raw_text": data.get("raw_text", "")
        }

    def get_project_revisions(self, project_id: str) -> List[Revision]:
        docs = self.db.collection("revisions").where("project_id", "==", project_id).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        revisions = []
        for doc in docs:
            data = doc.to_dict()
            revisions.append(Revision(
                revision_id=data["revision_id"],
                project_id=data["project_id"],
                title=data["title"],
                draft_label=data["draft_label"],
                file_name=data["file_name"],
                sha256=data["sha256"],
                created_at=data["created_at"],
                total_scenes=data["total_scenes"],
                total_pages=data["total_pages"]
            ))
        return revisions

    def save_claims(self, claims: List[Claim]) -> None:
        batch = self.db.batch()
        for claim in claims:
            doc_ref = self.db.collection("claims").document(claim.claim_id)
            batch.set(doc_ref, {
                "claim_id": claim.claim_id,
                "item_id": claim.item_id,
                "item_string": claim.item_string,
                "item_type": claim.item_type.value,
                "revision_id": claim.revision_id,
                "state": claim.state.value,
                "outcome": claim.outcome.value,
                "scope": claim.scope.model_dump_json(),
                "queries": json.dumps(claim.queries),
                "search_ids": json.dumps(claim.search_ids),
                "evidence": json.dumps([ev.model_dump() for ev in claim.evidence]),
                "occurrences": json.dumps([oc.model_dump() for oc in claim.occurrences]),
                "human_disposition": claim.human_disposition.value if claim.human_disposition else None,
                "disposition_note": claim.disposition_note,
                "adk_session_id": claim.adk_session_id,
                "adk_invocation_id": claim.adk_invocation_id,
                "adk_event_count": claim.adk_event_count,
                "created_at": claim.created_at,
                "updated_at": claim.updated_at
            })
        batch.commit()

    def get_claims_for_revision(self, revision_id: str) -> List[Claim]:
        docs = self.db.collection("claims").where("revision_id", "==", revision_id).stream()
        claims = []
        for doc in docs:
            data = doc.to_dict()
            claims.append(Claim(
                claim_id=data["claim_id"],
                item_id=data["item_id"],
                item_string=data["item_string"],
                item_type=ItemType(data["item_type"]),
                revision_id=data["revision_id"],
                state=ClaimState(data["state"]),
                outcome=ResearchOutcome(data["outcome"]),
                scope=ResearchScope(**json.loads(data["scope"])),
                queries=json.loads(data["queries"]),
                search_ids=json.loads(data["search_ids"]),
                evidence=json.loads(data["evidence"]),
                occurrences=json.loads(data["occurrences"]) if data.get("occurrences") else [],
                human_disposition=HumanDisposition(data["human_disposition"]) if data.get("human_disposition") else None,
                disposition_note=data.get("disposition_note"),
                adk_session_id=data.get("adk_session_id"),
                adk_invocation_id=data.get("adk_invocation_id"),
                adk_event_count=data.get("adk_event_count", 0),
                created_at=data["created_at"],
                updated_at=data["updated_at"]
            ))
        return claims

    def save_egress_log(self, query: str, allowed: bool, provenance: List[str], search_id: str, timestamp: str) -> None:
        doc_ref = self.db.collection("egress_logs").document()
        doc_ref.set({
            "query": query,
            "allowed": allowed,
            "provenance": provenance,
            "search_id": search_id,
            "timestamp": timestamp
        })

    def get_egress_logs(self) -> List[Dict[str, Any]]:
        docs = self.db.collection("egress_logs").order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
        logs = []
        for doc in docs:
            data = doc.to_dict()
            logs.append({
                "query": data["query"],
                "allowed": data["allowed"],
                "provenance": data["provenance"],
                "search_id": data["search_id"],
                "timestamp": data["timestamp"]
            })
        return logs

    def save_alternative(self, claim_id: str, original_name: str, alternative_name: str, outcome: str, evidence: List[Any]) -> None:
        doc_ref = self.db.collection("alternatives").document()
        doc_ref.set({
            "claim_id": claim_id,
            "original_name": original_name,
            "alternative_name": alternative_name,
            "outcome": outcome,
            "evidence": json.dumps(evidence)
        })

    def get_alternatives(self, claim_id: str) -> List[Dict[str, Any]]:
        docs = self.db.collection("alternatives").where("claim_id", "==", claim_id).stream()
        alts = []
        for doc in docs:
            data = doc.to_dict()
            alts.append({
                "alternative_name": data["alternative_name"],
                "outcome": data["outcome"],
                "evidence": json.loads(data["evidence"])
            })
        return alts

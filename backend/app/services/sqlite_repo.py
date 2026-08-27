import os
import json
import sqlite3
import uuid
from typing import List, Optional, Dict, Any
from app.models.clearance_record import (
    Project, Revision, ClearanceItem, Claim, ResearchScope, ItemType, Occurrence, HumanDisposition, ResearchOutcome, ClaimState
)
from app.services.repository import StorageRepository

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "obstat.db")

class SQLiteRepository(StorageRepository):
    def __init__(self):
        self.init_db()

    def init_db(self):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            project_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            default_scope TEXT NOT NULL,
            active_revision_id TEXT
        )
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS revisions (
            revision_id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            draft_label TEXT NOT NULL,
            file_name TEXT NOT NULL,
            sha256 TEXT NOT NULL,
            created_at TEXT NOT NULL,
            total_scenes INTEGER NOT NULL,
            total_pages INTEGER NOT NULL,
            raw_text TEXT
        )
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS claims (
            claim_id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            item_string TEXT NOT NULL,
            item_type TEXT NOT NULL,
            revision_id TEXT NOT NULL,
            state TEXT NOT NULL,
            outcome TEXT NOT NULL,
            scope TEXT NOT NULL,
            queries TEXT NOT NULL,
            search_ids TEXT NOT NULL,
            evidence TEXT NOT NULL,
            occurrences TEXT NOT NULL DEFAULT '[]',
            human_disposition TEXT,
            disposition_note TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS egress_logs (
            log_id TEXT PRIMARY KEY,
            query TEXT NOT NULL,
            allowed INTEGER NOT NULL,
            provenance TEXT NOT NULL,
            search_id TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS alternatives (
            alternative_id TEXT PRIMARY KEY,
            claim_id TEXT NOT NULL,
            original_name TEXT NOT NULL,
            alternative_name TEXT NOT NULL,
            outcome TEXT NOT NULL,
            evidence TEXT NOT NULL
        )
        """)

        conn.commit()
        conn.close()

    def save_project(self, project: Project) -> None:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO projects (project_id, title, created_at, default_scope, active_revision_id) VALUES (?, ?, ?, ?, ?)",
            (project.project_id, project.title, project.created_at, project.default_scope.model_dump_json(), project.active_revision_id)
        )
        conn.commit()
        conn.close()

    def get_project(self, project_id: str) -> Optional[Project]:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT project_id, title, created_at, default_scope, active_revision_id FROM projects WHERE project_id = ?", (project_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return Project(
            project_id=row[0],
            title=row[1],
            created_at=row[2],
            default_scope=ResearchScope(**json.loads(row[3])),
            active_revision_id=row[4]
        )

    def list_projects(self) -> List[Project]:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT project_id, title, created_at, default_scope, active_revision_id FROM projects ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [
            Project(
                project_id=row[0],
                title=row[1],
                created_at=row[2],
                default_scope=ResearchScope(**json.loads(row[3])),
                active_revision_id=row[4]
            ) for row in rows
        ]

    def save_revision(self, revision: Revision, raw_text: str = "") -> None:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO revisions (revision_id, project_id, title, draft_label, file_name, sha256, created_at, total_scenes, total_pages, raw_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (revision.revision_id, revision.project_id, revision.title, revision.draft_label, revision.file_name, revision.sha256, revision.created_at, revision.total_scenes, revision.total_pages, raw_text)
        )
        conn.commit()
        conn.close()

    def get_revision(self, revision_id: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT revision_id, project_id, title, draft_label, file_name, sha256, created_at, total_scenes, total_pages, raw_text FROM revisions WHERE revision_id = ?", (revision_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return {
            "revision": Revision(
                revision_id=row[0],
                project_id=row[1],
                title=row[2],
                draft_label=row[3],
                file_name=row[4],
                sha256=row[5],
                created_at=row[6],
                total_scenes=row[7],
                total_pages=row[8]
            ),
            "raw_text": row[9]
        }

    def get_project_revisions(self, project_id: str) -> List[Revision]:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT revision_id, project_id, title, draft_label, file_name, sha256, created_at, total_scenes, total_pages FROM revisions WHERE project_id = ? ORDER BY created_at DESC", (project_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            Revision(
                revision_id=row[0],
                project_id=row[1],
                title=row[2],
                draft_label=row[3],
                file_name=row[4],
                sha256=row[5],
                created_at=row[6],
                total_scenes=row[7],
                total_pages=row[8]
            ) for row in rows
        ]

    def save_claims(self, claims: List[Claim]) -> None:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        for claim in claims:
            cursor.execute(
                "INSERT OR REPLACE INTO claims (claim_id, item_id, item_string, item_type, revision_id, state, outcome, scope, queries, search_ids, evidence, occurrences, human_disposition, disposition_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    claim.claim_id,
                    claim.item_id,
                    claim.item_string,
                    claim.item_type.value,
                    claim.revision_id,
                    claim.state.value,
                    claim.outcome.value,
                    claim.scope.model_dump_json(),
                    json.dumps(claim.queries),
                    json.dumps(claim.search_ids),
                    json.dumps([ev.model_dump() for ev in claim.evidence]),
                    json.dumps([oc.model_dump() for oc in claim.occurrences]),
                    claim.human_disposition.value if claim.human_disposition else None,
                    claim.disposition_note,
                    claim.created_at,
                    claim.updated_at
                )
            )
        conn.commit()
        conn.close()

    def get_claims_for_revision(self, revision_id: str) -> List[Claim]:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT claim_id, item_id, item_string, item_type, revision_id, state, outcome, scope, queries, search_ids, evidence, occurrences, human_disposition, disposition_note, created_at, updated_at FROM claims WHERE revision_id = ?", (revision_id,))
        rows = cursor.fetchall()
        conn.close()
        claims = []
        for row in rows:
            claims.append(Claim(
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
                occurrences=json.loads(row[11]) if row[11] else [],
                human_disposition=HumanDisposition(row[12]) if row[12] else None,
                disposition_note=row[13],
                created_at=row[14],
                updated_at=row[15]
            ))
        return claims

    def save_egress_log(self, query: str, allowed: bool, provenance: List[str], search_id: str, timestamp: str) -> None:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        log_id = f"log_{uuid.uuid4().hex[:8]}"
        cursor.execute(
            "INSERT INTO egress_logs (log_id, query, allowed, provenance, search_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (log_id, query, 1 if allowed else 0, json.dumps(provenance), search_id, timestamp)
        )
        conn.commit()
        conn.close()

    def get_egress_logs(self) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT query, allowed, provenance, search_id, timestamp FROM egress_logs ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        conn.close()
        return [
            {
                "query": row[0],
                "allowed": bool(row[1]),
                "provenance": json.loads(row[2]),
                "search_id": row[3],
                "timestamp": row[4]
            } for row in rows
        ]

    def save_alternative(self, claim_id: str, original_name: str, alternative_name: str, outcome: str, evidence: List[Any]) -> None:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        alt_id = f"alt_{uuid.uuid4().hex[:8]}"
        cursor.execute(
            "INSERT INTO alternatives (alternative_id, claim_id, original_name, alternative_name, outcome, evidence) VALUES (?, ?, ?, ?, ?, ?)",
            (alt_id, claim_id, original_name, alternative_name, outcome, json.dumps(evidence))
        )
        conn.commit()
        conn.close()

    def get_alternatives(self, claim_id: str) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT alternative_name, outcome, evidence FROM alternatives WHERE claim_id = ?", (claim_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            {
                "alternative_name": row[0],
                "outcome": row[1],
                "evidence": json.loads(row[2])
            } for row in rows
        ]

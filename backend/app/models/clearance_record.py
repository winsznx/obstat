from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import datetime

class ItemType(str, Enum):
    PERSON_NAME = "PERSON_NAME"
    CHARACTER_NAME = "CHARACTER_NAME"
    BUSINESS_ORG = "BUSINESS_ORG"
    VENUE_LOCATION = "VENUE_LOCATION"
    BRAND_PRODUCT = "BRAND_PRODUCT"
    MUSIC_REFERENCE = "MUSIC_REFERENCE"
    MEDIA_WORK = "MEDIA_WORK"
    QUOTED_TEXT = "QUOTED_TEXT"
    ARTWORK_VISUAL_REFERENCE = "ARTWORK_VISUAL_REFERENCE"
    ARCHIVAL_MATERIAL_REFERENCE = "ARCHIVAL_MATERIAL_REFERENCE"
    ADDRESS = "ADDRESS"
    PHONE_NUMBER = "PHONE_NUMBER"
    WEB_IDENTIFIER = "WEB_IDENTIFIER"
    ORG_GOV = "ORG_GOV"
    PLATE_OR_ID = "PLATE_OR_ID"
    FACTUAL_REAL_WORLD_CLAIM = "FACTUAL_REAL_WORLD_CLAIM"
    OTHER_RESEARCH_REQUIRED = "OTHER_RESEARCH_REQUIRED"

class ClaimState(str, Enum):
    ACTIVE = "ACTIVE"
    STALE_SCRIPT = "STALE_SCRIPT"
    STALE_SCOPE = "STALE_SCOPE"
    STALE_POLICY = "STALE_POLICY"
    STALE_AGE = "STALE_AGE"
    STALE_EVIDENCE = "STALE_EVIDENCE"
    DISPOSITION_VIOLATION = "DISPOSITION_VIOLATION"
    SUPERSEDED = "SUPERSEDED"
    REMOVED = "REMOVED"

class ResearchOutcome(str, Enum):
    MATCH_FOUND = "MATCH_FOUND"
    AMBIGUOUS_MATCH = "AMBIGUOUS_MATCH"
    NO_MATCH_FOUND_IN_SCOPE = "NO_MATCH_FOUND_IN_SCOPE"
    RIGHTS_PATH_REQUIRED = "RIGHTS_PATH_REQUIRED"
    INSUFFICIENT_COVERAGE = "INSUFFICIENT_COVERAGE"
    RESEARCH_ERROR = "RESEARCH_ERROR"
    POLICY_BLOCKED = "POLICY_BLOCKED"

class HumanDisposition(str, Enum):
    KEEP_FOR_COUNSEL_REVIEW = "KEEP_FOR_COUNSEL_REVIEW"
    CHANGE_REQUESTED = "CHANGE_REQUESTED"
    PERMISSION_REQUIRED = "PERMISSION_REQUIRED"
    ALTERNATIVE_SELECTED = "ALTERNATIVE_SELECTED"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    RESOLVED_EXTERNALLY = "RESOLVED_EXTERNALLY"
    PROCEED_PER_COUNSEL = "PROCEED_PER_COUNSEL"
    DEFERRED = "DEFERRED"

class EvidenceLabel(str, Enum):
    EXACT_MATCH = "EXACT_MATCH"
    PARTIAL_MATCH = "PARTIAL_MATCH"
    VALID_NON_MATCH = "VALID_NON_MATCH"
    UNUSABLE_EVIDENCE = "UNUSABLE_EVIDENCE"

class Occurrence(BaseModel):
    revision_id: str
    scene_id: str
    scene_number: Optional[int] = None
    page_number: int
    line_offset: int
    occurrence_text: str
    context_snippet: str
    usage_class: Optional[str] = "DIALOGUE"

class ClearanceItem(BaseModel):
    item_id: str
    item_string: str
    item_type: ItemType
    occurrences: List[Occurrence] = Field(default_factory=list)
    confidence: float = 1.0

class ResearchScope(BaseModel):
    territories: List[str] = Field(default_factory=lambda: ["US", "GLOBAL"])
    production_country: str = "US"
    distribution_medium: str = "THEATRICAL_AND_STREAMING"
    plan_version: str = "v1.0"
    freshness_ttl_days: int = 30

class ParallelQueryResult(BaseModel):
    query: str
    objective: Optional[str] = None
    mode: str = "fast"
    search_id: str
    session_id: str
    url: str
    title: str
    excerpt: str
    domain: str
    retrieved_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

class EvidenceRecord(BaseModel):
    evidence_id: str
    parallel_search_id: str
    session_id: str
    url: str
    title: str
    excerpt: str
    domain: str
    evidence_label: EvidenceLabel
    quoted_match_span: Optional[str] = None
    validation_status: str = "VALID"
    is_usable: bool = True

class Claim(BaseModel):
    claim_id: str
    item_id: str
    item_string: str
    item_type: ItemType
    revision_id: str
    state: ClaimState = ClaimState.ACTIVE
    outcome: ResearchOutcome = ResearchOutcome.INSUFFICIENT_COVERAGE
    scope: ResearchScope
    queries: List[str] = Field(default_factory=list)
    search_ids: List[str] = Field(default_factory=list)
    evidence: List[EvidenceRecord] = Field(default_factory=list)
    occurrences: List[Occurrence] = Field(default_factory=list)  # Backed by occurrences history for valid diff comparison
    human_disposition: Optional[HumanDisposition] = None
    disposition_note: Optional[str] = None
    invalidation_reason: Optional[str] = None
    adk_session_id: Optional[str] = None
    adk_invocation_id: Optional[str] = None
    adk_event_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

class Revision(BaseModel):
    revision_id: str
    project_id: str
    title: str
    draft_label: str
    file_name: str
    sha256: str
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    total_scenes: int = 0
    total_pages: int = 0

class Project(BaseModel):
    project_id: str
    title: str
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    default_scope: ResearchScope = Field(default_factory=ResearchScope)
    active_revision_id: Optional[str] = None

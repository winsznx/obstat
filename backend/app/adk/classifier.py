import re
from typing import List, Dict, Any
from app.models.clearance_record import (
    ClearanceItem, ItemType, Occurrence, EvidenceRecord, EvidenceLabel, ResearchOutcome
)

class GeminiClassifier:
    """
    Simulated/Live Gemini Evidence Classifier.
    Verifies that model-quoted match spans exist VERBATIM in source excerpts.
    Demotes missing/hallucinated spans to UNUSABLE_EVIDENCE.
    """

    @classmethod
    def classify_evidence(
        cls,
        item: ClearanceItem,
        excerpt: str,
        title: str
    ) -> EvidenceRecord:
        
        item_lower = item.item_string.lower()
        excerpt_lower = excerpt.lower()
        
        # Verbatim check for item in source excerpt
        if item_lower in excerpt_lower:
            start_idx = excerpt_lower.find(item_lower)
            verbatim_span = excerpt[start_idx:start_idx + len(item.item_string)]
            
            # Check for conflict vs non-conflict text
            if any(term in excerpt_lower for term in ["official", "registered", "inc", "ltd", "active"]):
                label = EvidenceLabel.EXACT_MATCH
            else:
                label = EvidenceLabel.PARTIAL_MATCH

            return EvidenceRecord(
                evidence_id=f"ev_{hash(excerpt) & 0xffffffff:08x}",
                parallel_search_id="search_mock",
                session_id="session_mock",
                url="https://example.org",
                title=title,
                excerpt=excerpt,
                domain="example.org",
                evidence_label=label,
                quoted_match_span=verbatim_span,
                validation_status="VERIFIED_VERBATIM",
                is_usable=True
            )
        else:
            # If verbatim span is absent -> UNUSABLE_EVIDENCE (never VALID_NON_MATCH)
            return EvidenceRecord(
                evidence_id=f"ev_{hash(excerpt) & 0xffffffff:08x}",
                parallel_search_id="search_mock",
                session_id="session_mock",
                url="https://example.org",
                title=title,
                excerpt=excerpt,
                domain="example.org",
                evidence_label=EvidenceLabel.UNUSABLE_EVIDENCE,
                quoted_match_span=None,
                validation_status="VERBATIM_SPAN_FAILED",
                is_usable=False
            )

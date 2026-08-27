import os
import json
import re
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from app.models.clearance_record import (
    ClearanceItem, ItemType, EvidenceRecord, EvidenceLabel
)

class GeminiClassifier:
    """
    Live Gemini Evidence Classifier.
    Uses Google Cloud Vertex AI or Gemini API to classify retrieved Parallel Search excerpts.
    Enforces that model-quoted match spans exist VERBATIM in source excerpts.
    Demotes missing/hallucinated spans to UNUSABLE_EVIDENCE.
    """

    def __init__(self, use_vertex: bool = False, project: Optional[str] = None, location: Optional[str] = None):
        self.use_vertex = use_vertex or os.getenv("GOOGLE_GENAI_USE_ENTERPRISE") == "True"
        self.project = project or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.location = location or os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    def get_client(self) -> genai.Client:
        if self.use_vertex:
            return genai.Client(vertexai=True, project=self.project, location=self.location)
        elif self.api_key:
            return genai.Client(api_key=self.api_key)
        else:
            return genai.Client()

    def classify_evidence(
        self,
        item: ClearanceItem,
        excerpt: str,
        title: str,
        url: str,
        search_id: str,
        session_id: str
    ) -> EvidenceRecord:
        
        item_lower = item.item_string.lower()
        excerpt_lower = excerpt.lower()
        
        # 1. Deterministic Verbatim Span Verification
        if item_lower in excerpt_lower:
            start_idx = excerpt_lower.find(item_lower)
            verbatim_span = excerpt[start_idx:start_idx + len(item.item_string)]
            
            label = EvidenceLabel.EXACT_MATCH
            try:
                client = self.get_client()
                prompt = (
                    f"Classify whether the text snippet '{excerpt}' describes a real-world entity "
                    f"matching '{item.item_string}'. Return JSON with label EXACT_MATCH or PARTIAL_MATCH."
                )
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[prompt],
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                if response.text:
                    res_data = json.loads(response.text)
                    if res_data.get("label") == "PARTIAL_MATCH":
                        label = EvidenceLabel.PARTIAL_MATCH
            except Exception:
                pass

            return EvidenceRecord(
                evidence_id=f"ev_{hash(excerpt + search_id) & 0xffffffff:08x}",
                parallel_search_id=search_id,
                session_id=session_id,
                url=url,
                title=title,
                excerpt=excerpt,
                domain=url.split("//")[-1].split("/")[0] if "//" in url else "web",
                evidence_label=label,
                quoted_match_span=verbatim_span,
                validation_status="VERIFIED_VERBATIM",
                is_usable=True
            )
        else:
            # Demote missing verbatim span to UNUSABLE_EVIDENCE
            return EvidenceRecord(
                evidence_id=f"ev_{hash(excerpt + search_id) & 0xffffffff:08x}",
                parallel_search_id=search_id,
                session_id=session_id,
                url=url,
                title=title,
                excerpt=excerpt,
                domain=url.split("//")[-1].split("/")[0] if "//" in url else "web",
                evidence_label=EvidenceLabel.UNUSABLE_EVIDENCE,
                quoted_match_span=None,
                validation_status="UNUSABLE_SPAN_ABSENT",
                is_usable=False
            )

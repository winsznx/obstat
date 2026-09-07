import os
import re
import uuid
import json
import time
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
import google.auth
from google.auth.transport.requests import Request

from app.models.clearance_record import ClearanceItem, ItemType, Occurrence
from app.services.screenplay_parser import ScreenplayParser

EXTRACTION_SYSTEM_PROMPT = """
You are an expert Hollywood screenplay clearance research specialist.
Analyze the provided screenplay text and extract all clearance-relevant entities that require clearance research.

Categorize each item into one of the following exact types:
- PERSON_NAME: Real people or full proper names referenced in dialogue/action
- CHARACTER_NAME: Characters appearing in screenplay cues or action lines
- BUSINESS_ORG: Corporate entities, record labels, companies, studios, brands, institutions
- VENUE_LOCATION: Specific named physical locations, venues, studio names, restaurants, hotels
- BRAND_PRODUCT: Named commercial products, trademarks, vehicle models
- MUSIC_REFERENCE: Songs, compositions, album titles, musical master recordings
- MEDIA_WORK: Movies, television shows, books, plays, artwork references
- ADDRESS: Specific real-world street addresses or registration numbers
- PHONE_NUMBER: Phone numbers
- QUOTED_TEXT: Distinctive copyrighted prose, quotes, or lyrics

Return ONLY valid JSON matching this schema:
{
  "items": [
    {
      "item_string": "Exact verbatim string as it appears in screenplay",
      "item_type": "EXACT_TYPE_FROM_LIST_ABOVE"
    }
  ]
}
"""

class SemanticExtractionError(RuntimeError):
    """Raised when semantic entity extraction fails or returns malformed structured output in production mode."""
    pass

class GeminiExtractor:
    """
    Google ADK & Gemini Screenplay Clearance Semantic Extractor.
    Uses Google Cloud Vertex AI (Gemini 2.5 Flash) to perform semantic entity extraction.
    Combines Gemini intelligence with deterministic structural anchor matching.
    """

    def __init__(
        self,
        project: Optional[str] = None,
        location: Optional[str] = None
    ):
        self.project = project or os.getenv("GOOGLE_CLOUD_PROJECT", "project-2ac1d1fb-7da1-46b4-90e")
        self.location = location or os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        self._client: Optional[genai.Client] = None

    def get_client(self) -> genai.Client:
        if self._client is None:
            credentials, _ = google.auth.default()
            credentials.refresh(Request())
            self._client = genai.Client(
                vertexai=True,
                project=self.project,
                location=self.location,
                credentials=credentials
            )
        return self._client

    def extract_clearance_items(self, screenplay_text: str, revision_id: str) -> List[ClearanceItem]:
        # 1. Invoke Vertex AI Gemini for semantic entity extraction
        extracted_entities: List[Dict[str, str]] = []
        t0 = time.time()
        is_production = os.getenv("OBSTAT_MODE") == "PRODUCTION"

        try:
            client = self.get_client()
            prompt = f"{EXTRACTION_SYSTEM_PROMPT}\n\nSCREENPLAY TEXT:\n{screenplay_text}"
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )

            if response.text:
                parsed_json = json.loads(response.text)
                if not isinstance(parsed_json, dict) or "items" not in parsed_json:
                    raise SemanticExtractionError(
                        f"Malformed structured response from Gemini: missing 'items' key. Text: {response.text[:200]}"
                    )
                extracted_entities = parsed_json.get("items", [])
                print(f"[GeminiExtractor] Vertex AI extracted {len(extracted_entities)} entities in {time.time()-t0:.2f}s")
            else:
                raise SemanticExtractionError("Empty response body received from Gemini extraction model.")
        except Exception as e:
            print(f"[GeminiExtractor ERROR] Vertex AI extraction failed: {e}")
            if is_production:
                raise SemanticExtractionError(
                    f"Production semantic extraction failed: {e}. "
                    "Fail-closed policy strictly prohibits heuristic regex fallback in PRODUCTION mode."
                ) from e
            extracted_entities = []

        # Fallback / Supplemental Structural Anchors if Gemini returned sparse results (DEVELOPER/DEMO MODE ONLY)
        if not extracted_entities:
            if is_production:
                raise SemanticExtractionError(
                    "Production extraction yielded 0 entities from model. "
                    "Fail-closed policy strictly prohibits heuristic fallback in PRODUCTION mode."
                )
            extracted_entities = self._fallback_rule_extraction(screenplay_text)

        # 2. Anchor extracted items to exact screenplay scene IDs, page numbers, line offsets
        items: List[ClearanceItem] = []
        seen = set()
        lines = screenplay_text.splitlines()
        lines_per_page = 55

        parsed_script = ScreenplayParser.parse_text(screenplay_text)

        for entity in extracted_entities:
            item_str = entity.get("item_string", "").strip()
            item_type_str = entity.get("item_type", "OTHER_RESEARCH_REQUIRED").strip()

            if not item_str or len(item_str) < 2:
                continue

            # Verify item string exists verbatim in the screenplay
            if item_str.lower() not in screenplay_text.lower():
                print(f"[GeminiExtractor] Discarding non-verbatim entity '{item_str}'")
                continue

            # Map to ItemType enum safely
            try:
                item_type = ItemType(item_type_str)
            except ValueError:
                item_type = ItemType.BUSINESS_ORG if "RECORD" in item_str.upper() else ItemType.PERSON_NAME

            key = (item_str.upper(), item_type)
            if key in seen:
                continue
            seen.add(key)

            # Find all occurrences of item_str in screenplay
            occurrences: List[Occurrence] = []
            for line_idx, line in enumerate(lines, start=1):
                if item_str.lower() in line.lower():
                    page = max(1, (line_idx // lines_per_page) + 1)
                    
                    # Match scene
                    scene_id = "SC_001"
                    for sc in parsed_script.scenes:
                        if sc.start_line <= line_idx:
                            scene_id = sc.scene_id

                    occurrences.append(Occurrence(
                        revision_id=revision_id,
                        scene_id=scene_id,
                        page_number=page,
                        line_offset=line_idx,
                        occurrence_text=item_str,
                        context_snippet=line.strip()[:200]
                    ))

            if occurrences:
                items.append(ClearanceItem(
                    item_id=f"item_{uuid.uuid4().hex[:8]}",
                    item_string=item_str,
                    item_type=item_type,
                    occurrences=occurrences
                ))

        return items

    def _fallback_rule_extraction(self, screenplay_text: str) -> List[Dict[str, str]]:
        """Structural rule parsing used only if API is unreachable."""
        results = []
        lines = screenplay_text.splitlines()
        for line in lines:
            line_str = line.strip()
            if line_str.startswith("INT.") or line_str.startswith("EXT."):
                loc = re.sub(r'^\s*(?:INT\.|EXT\.|INT/EXT\.)\s+', '', line_str, flags=re.IGNORECASE)
                loc = re.sub(r'\s*-[A-Z\s]+$', '', loc).strip()
                if loc:
                    results.append({"item_string": loc, "item_type": "VENUE_LOCATION"})
            elif re.match(r'^[A-Z][A-Z0-9 \'\-\.]{2,30}$', line_str):
                if line_str not in ('CUT TO', 'FADE OUT', 'FADE IN', 'CONTINUED'):
                    results.append({"item_string": line_str, "item_type": "CHARACTER_NAME"})
        return results

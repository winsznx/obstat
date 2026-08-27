import os
import json
import datetime
from typing import List, Optional
from google import genai
from google.genai import types
from app.models.clearance_record import ClearanceItem, ItemType, Occurrence

class GeminiExtractor:
    """
    Semantic Screenplay Extractor using Google Cloud Vertex AI or Gemini API.
    Uses Application Default Credentials (ADC) when GOOGLE_GENAI_USE_ENTERPRISE is True.
    """

    def __init__(self, use_vertex: bool = False, project: Optional[str] = None, location: Optional[str] = None):
        self.use_vertex = use_vertex or os.getenv("GOOGLE_GENAI_USE_ENTERPRISE") == "True"
        self.project = project or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.location = location or os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    def get_client(self) -> genai.Client:
        if self.use_vertex:
            # Vertex AI path using ADC (Google Cloud credentials)
            return genai.Client(vertexai=True, project=self.project, location=self.location)
        elif self.api_key:
            # AI Studio path using api key
            return genai.Client(api_key=self.api_key)
        else:
            # Automatic ADC lookup fallback for general GCP environments
            return genai.Client()

    def extract_clearance_items(self, screenplay_text: str, revision_id: str) -> List[ClearanceItem]:
        client = self.get_client()
        prompt = (
            "Extract all clearance-relevant entities from the screenplay below. "
            "For each entity, extract: item_string, item_type (choose from: PERSON_NAME, CHARACTER_NAME, "
            "BUSINESS_ORG, VENUE_LOCATION, BRAND_PRODUCT, MUSIC_REFERENCE, MEDIA_WORK, QUOTED_TEXT), "
            "scene_id (e.g. SC_001), page_number (integer), line_offset (integer), occurrence_text, "
            "and context_snippet. Return a structured JSON array of objects."
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, screenplay_text],
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        
        if not response.text:
            raise RuntimeError("Gemini API returned empty text response for extraction.")

        data = json.loads(response.text)
        items: List[ClearanceItem] = []
        for idx, entry in enumerate(data, start=1):
            items.append(ClearanceItem(
                item_id=f"item_{idx:03d}",
                item_string=entry.get("item_string", "Unknown"),
                item_type=ItemType(entry.get("item_type", "BUSINESS_ORG")),
                occurrences=[Occurrence(
                    revision_id=revision_id,
                    scene_id=entry.get("scene_id", "SC_001"),
                    page_number=entry.get("page_number", 1),
                    line_offset=entry.get("line_offset", 1),
                    occurrence_text=entry.get("occurrence_text", entry.get("item_string", "")),
                    context_snippet=entry.get("context_snippet", "")
                )]
            ))

        return items

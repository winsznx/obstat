import os
import json
import datetime
from typing import List, Optional
from google import genai
from google.genai import types
from app.models.clearance_record import ClearanceItem, ItemType, Occurrence

class GeminiExtractor:
    """
    Semantic Screenplay Extractor using Google Cloud AI (Gemini 2.5).
    Fails visibly when credentials or API calls fail.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    def extract_clearance_items(self, screenplay_text: str, revision_id: str) -> List[ClearanceItem]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is missing. Real Gemini extraction required.")

        client = genai.Client(api_key=self.api_key)
        prompt = (
            "Extract all clearance-relevant entities from the screenplay below. "
            "Include character names, real person names, business organizations, venue locations, "
            "brand products, music references, and media works. Return a structured JSON array."
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

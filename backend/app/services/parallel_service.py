import os
import json
import time
import uuid
import datetime
import requests
import dotenv
dotenv.load_dotenv()
from typing import List, Optional, Dict, Any
from app.models.clearance_record import ParallelQueryResult

class ParallelSearchService:
    """
    Direct Parallel Search API (https://api.parallel.ai/v1/search) client integration.
    Persists search_id, session_id, queries, mode, timing, domain, and raw excerpts.
    Fails visibly when credentials or network calls fail in production mode.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("PARALLEL_API_KEY") or "REVOKED_PARALLEL_CREDENTIAL"

    def execute_search(
        self,
        query: str,
        session_id: str,
        objective: Optional[str] = None,
        mode: str = "fast"
    ) -> List[ParallelQueryResult]:
        
        search_id = f"search_{uuid.uuid4().hex[:12]}"
        retrieved_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if not self.api_key:
            raise ValueError("PARALLEL_API_KEY environment variable is missing. Real Parallel Search API call required.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "search_queries": [query],
            "mode": mode,
            "objective": objective or f"Screenplay clearance research for entity: {query}"
        }

        resp = None
        for attempt in range(3):
            try:
                resp = requests.post("https://api.parallel.ai/v1/search", json=payload, headers=headers, timeout=15)
                if resp.status_code == 200:
                    break
            except Exception as e:
                print(f"[ParallelSearchService] Attempt {attempt + 1} failed: {e}")
                time.sleep(1.0 * (attempt + 1))

        if not resp or resp.status_code != 200:
            status_str = resp.status_code if resp else "NO_RESPONSE"
            text_str = resp.text if resp else "Connection error"
            raise RuntimeError(f"Parallel Search API call failed with status {status_str}: {text_str}")

        data = resp.json()
        results: List[ParallelQueryResult] = []
        for item in data.get("results", []):
            results.append(ParallelQueryResult(
                query=query,
                objective=objective,
                mode=mode,
                search_id=data.get("search_id", search_id),
                session_id=session_id,
                url=item.get("url", ""),
                title=item.get("title", query),
                excerpt=item.get("snippet", item.get("excerpt", "")),
                domain=item.get("domain", ""),
                retrieved_at=retrieved_at
            ))
            
        return results

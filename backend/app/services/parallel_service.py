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

try:
    from parallel import Parallel
    HAS_PARALLEL_SDK = True
except ImportError:
    HAS_PARALLEL_SDK = False

class ParallelCredentialMissingError(RuntimeError):
    """Raised when PARALLEL_API_KEY is not configured in the runtime environment."""
    pass

class ParallelSearchService:
    """
    Official Parallel Web Python SDK (`parallel-web`) client integration.
    Invokes client.search and client.extract.
    Persists search_id, session_id, queries, mode, timing, domain, and raw excerpts.
    Fails visibly with a named exception when credentials or network calls fail.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        raw_key = api_key or os.getenv("PARALLEL_API_KEY") or ""
        self.api_key = raw_key.strip() if raw_key else None
        if self.api_key and HAS_PARALLEL_SDK:
            self.client = Parallel(api_key=self.api_key)
        else:
            self.client = None

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
            raise ParallelCredentialMissingError(
                "PARALLEL_API_KEY environment variable is missing. Real Parallel Search API call cannot execute."
            )

        if self.client:
            try:
                res = self.client.search(
                    search_queries=[query],
                    mode=mode if mode in ("turbo", "fast", "basic", "advanced") else "fast",
                    objective=objective or f"Screenplay clearance research for entity: {query}"
                )
                raw_results = getattr(res, "results", []) or []
                res_search_id = getattr(res, "search_id", None) or search_id

                results: List[ParallelQueryResult] = []
                for item in raw_results:
                    item_url = getattr(item, "url", None) or (item.get("url") if isinstance(item, dict) else "")
                    item_title = getattr(item, "title", None) or (item.get("title") if isinstance(item, dict) else query)
                    item_snippet = (
                        getattr(item, "snippet", None) or getattr(item, "excerpt", None) or 
                        (item.get("snippet") if isinstance(item, dict) else "") or
                        (item.get("excerpt") if isinstance(item, dict) else "")
                    )
                    item_domain = getattr(item, "domain", None) or (item.get("domain") if isinstance(item, dict) else "")

                    results.append(ParallelQueryResult(
                        query=query,
                        objective=objective,
                        mode=mode,
                        search_id=res_search_id,
                        session_id=session_id,
                        url=item_url,
                        title=item_title,
                        excerpt=item_snippet,
                        domain=item_domain,
                        retrieved_at=retrieved_at
                    ))
                return results
            except Exception as e:
                print(f"[ParallelSearchService] SDK call failed, attempting REST fallback: {e}")

        # Direct REST fallback if SDK is unavailable or encounters unexpected format
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
                print(f"[ParallelSearchService REST] Attempt {attempt + 1} failed: {e}")
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

    def execute_extract(
        self,
        urls: List[str],
        session_id: str
    ) -> List[Dict[str, Any]]:
        """
        Parallel Extract API (https://api.parallel.ai/v1/extract) client integration.
        Extracts full text and clean structured markdown from target URLs.
        """
        if not self.api_key:
            raise ParallelCredentialMissingError(
                "PARALLEL_API_KEY environment variable is missing. Real Parallel Extract API call cannot execute."
            )

        if self.client:
            try:
                res = self.client.extract(urls=urls)
                raw_results = getattr(res, "results", []) or []
                results: List[Dict[str, Any]] = []
                for item in raw_results:
                    item_url = getattr(item, "url", None) or (item.get("url") if isinstance(item, dict) else "")
                    item_title = getattr(item, "title", None) or (item.get("title") if isinstance(item, dict) else "")
                    item_text = getattr(item, "text", None) or getattr(item, "content", None) or (item.get("text") if isinstance(item, dict) else "")
                    results.append({
                        "url": item_url,
                        "title": item_title,
                        "full_text": item_text,
                        "extracted_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                    })
                return results
            except Exception as e:
                print(f"[ParallelSearchService.execute_extract] SDK call failed, attempting REST fallback: {e}")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "urls": urls
        }

        resp = None
        for attempt in range(3):
            try:
                resp = requests.post("https://api.parallel.ai/v1/extract", json=payload, headers=headers, timeout=20)
                if resp.status_code == 200:
                    break
            except Exception as e:
                print(f"[ParallelSearchService.execute_extract REST] Attempt {attempt + 1} failed: {e}")
                time.sleep(1.0 * (attempt + 1))

        if not resp or resp.status_code != 200:
            status_str = resp.status_code if resp else "NO_RESPONSE"
            text_str = resp.text if resp else "Connection error"
            raise RuntimeError(f"Parallel Extract API call failed with status {status_str}: {text_str}")

        data = resp.json()
        results: List[Dict[str, Any]] = []
        for item in data.get("results", []):
            results.append({
                "url": item.get("url", ""),
                "title": item.get("title", ""),
                "full_text": item.get("text", item.get("content", "")),
                "extracted_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })
        return results


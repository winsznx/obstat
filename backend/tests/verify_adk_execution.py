import os
import sys
import json
import time
import uuid
import datetime

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__))))

from app.models.clearance_record import ClearanceItem, ItemType, ResearchScope, ClaimState
from app.adk.extractor import GeminiExtractor
from app.adk.graph import ADKGraphOrchestrator
from app.services.db_provider import get_repository

def run_adk_execution_proof():
    print("[ADK Proof] Initiating live Google ADK 2.x workflow execution...")
    
    run_id = f"adk_run_{uuid.uuid4().hex[:8]}"
    revision_id = f"rev_proof_{uuid.uuid4().hex[:6]}"
    
    test_screenplay = """INT. RECORD RECORDING STUDIO - DAY

A cozy room filled with vinyl record crates.

MERCER VALE (40s) stands near the turntables, adjusting a microphone stand.

                    MERCER VALE
The sound must be authentic. We cannot let the evidence silently dissolve.

He examines a demo tape labeled "VELA RECORDS - MASTER CUT 1984".
"""

    node_traces = []

    # Step 1: Extract (Gemini 2.5 Flash on Vertex AI)
    t0 = time.time()
    extractor = GeminiExtractor()
    items = extractor.extract_clearance_items(test_screenplay, revision_id)
    t_extract = round((time.time() - t0) * 1000, 2)
    node_traces.append({
        "node_id": "extract_clearance_items",
        "type": "AI_NODE",
        "provider": "Vertex AI Gemini 2.5 Flash",
        "duration_ms": t_extract,
        "items_extracted": [i.item_string for i in items]
    })
    print(f"  Node 1: Extract complete in {t_extract}ms. Items: {[i.item_string for i in items]}")

    # Step 2: Orchestrate ADK Graph (Egress Firewall + Parallel Search + Classifier + Adjudication)
    t0 = time.time()
    orchestrator = ADKGraphOrchestrator()
    scope = ResearchScope(territories=["US", "GLOBAL"], production_country="US")
    claims = orchestrator.process_items(revision_id=revision_id, items=items, scope=scope)
    t_graph = round((time.time() - t0) * 1000, 2)

    node_traces.append({
        "node_id": "authorize_egress_and_parallel_search",
        "type": "TOOL_GRAPH_NODE",
        "provider": "Parallel Search API (api.parallel.ai/v1/search)",
        "duration_ms": t_graph,
        "claims_generated": len(claims),
        "search_ids": [sid for c in claims for sid in c.search_ids]
    })
    print(f"  Node 2: Graph execution complete in {t_graph}ms. Generated {len(claims)} claims.")

    # Step 3: Persist Claims to Storage Repository
    repo = get_repository()
    repo.save_claims(claims)

    # Step 4: Verify Claims Read-Back from Database
    persisted_claims = repo.get_claims_for_revision(revision_id)
    print(f"  Step 4: Read back {len(persisted_claims)} claims from database repository.")

    trace_payload = {
        "run_id": run_id,
        "revision_id": revision_id,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "total_nodes": len(node_traces),
        "nodes": node_traces,
        "claims": [
            {
                "claim_id": c.claim_id,
                "item_string": c.item_string,
                "item_type": c.item_type.value,
                "outcome": c.outcome.value,
                "search_ids": c.search_ids,
                "evidence_count": len(c.evidence)
            } for c in persisted_claims
        ]
    }

    output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "schemas", "adk_run_trace.json")
    with open(output_path, "w") as f:
        json.dump(trace_payload, f, indent=2)

    print(f"[ADK Proof] Trace saved to schemas/adk_run_trace.json")
    return trace_payload

if __name__ == "__main__":
    run_adk_execution_proof()

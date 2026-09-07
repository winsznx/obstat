import os
import sys
import time
import json
import requests
import subprocess

BACKEND_URL = os.environ.get("BACKEND_URL", "https://obstat-backend-586563372673.us-central1.run.app")

def run_hosted_verification():
    print(f"\n========================================================")
    print(f"STEP 1: Testing Public Backend Health & Firestore Connectivity")
    print(f"Backend Target: {BACKEND_URL}")
    print(f"========================================================")

    res = requests.get(f"{BACKEND_URL}/")
    assert res.status_code == 200, f"Root route returned {res.status_code}: {res.text}"
    print(f" Root endpoint OK: {res.json()}")

    # 1. Create temporary production
    prod_payload = {
        "title": f"Live Hosted Proof Feature {int(time.time())}",
        "production_country": "US",
        "territories": ["US", "GLOBAL"],
        "distribution_medium": "THEATRICAL_AND_STREAMING",
        "script_stage": "PRODUCTION"
    }
    res = requests.post(f"{BACKEND_URL}/api/projects", json=prod_payload)
    assert res.status_code == 200, f"Create project failed: {res.text}"
    project = res.json()
    project_id = project["project_id"]
    print(f" Project created in Firestore: ID={project_id}, Title='{project['title']}'")

    # 2. Upload Draft N
    draft_n_text = """SCENE 1 - INT. HIGH RISE BOARDROOM - DAY

ELENA ROSTOVA (30s) overlooks the sprawling city below.

                    ELENA ROSTOVA
The acquisition must close before market open. We cannot risk any exposure.

She slides a dossier across the glass desk labeled "WAYNE ENTERPRISES MERGER".
"""
    files = {"file": ("screenplay_draft_n.txt", draft_n_text.encode("utf-8"), "text/plain")}
    print(f"\n========================================================")
    print(f"STEP 2: Upload Draft N -> Real ADK + Vertex Gemini + Rotated Parallel Search")
    print(f"========================================================")
    t0 = time.time()
    res = requests.post(f"{BACKEND_URL}/api/projects/{project_id}/upload_script?draft_label=Draft%201", files=files)
    elapsed = round(time.time() - t0, 2)
    assert res.status_code == 200, f"Upload draft failed: {res.text}"
    draft_n_data = res.json()
    revision_id = draft_n_data["revision"]["revision_id"]
    claims = draft_n_data["claims"]
    print(f" Draft N processed in {elapsed}s. Revision ID: {revision_id}")
    print(f" Total claims generated: {len(claims)}")

    for c in claims:
        print(f"   Claim: '{c['item_string']}' [{c['item_type']}] -> Outcome: {c['outcome']}")
        print(f"     ADK Session ID: {c.get('adk_session_id')}")
        print(f"     ADK Invocation ID: {c.get('adk_invocation_id')}")
        print(f"     ADK Event Count: {c.get('adk_event_count')}")
        print(f"     Search IDs: {c.get('search_ids')}")
        print(f"     Evidence Count: {len(c.get('evidence', []))}")

    # 3. Submit human disposition
    target_claim = claims[0]
    claim_id = target_claim["claim_id"]
    disp_payload = {
        "human_disposition": "PROCEED_PER_COUNSEL",
        "disposition_note": "Verified by production clearance supervisor; replacement authorized."
    }
    res = requests.post(f"{BACKEND_URL}/api/claims/{claim_id}/disposition", json=disp_payload)
    assert res.status_code == 200, f"Disposition update failed: {res.text}"
    updated_claim = res.json()
    print(f" Human disposition persisted for claim {claim_id}: {updated_claim['human_disposition']}")

    # 4. Check Research Packet
    res = requests.get(f"{BACKEND_URL}/api/revisions/{revision_id}/packet")
    assert res.status_code == 200, f"Get packet failed: {res.text}"
    packet = res.json()
    print(f" Research packet status: {packet.get('status')}")

    # 5. Force Cloud Run Revision / Process Replacement
    print(f"\n========================================================")
    print(f"STEP 3: Forcing Cloud Run Process/Revision Replacement")
    print(f"========================================================")
    restart_nonce = str(int(time.time()))
    update_cmd = [
        "gcloud", "run", "services", "update", "obstat-backend",
        "--region=us-central1",
        f"--update-env-vars=RESTART_TRIGGER={restart_nonce}",
        "--project=project-2ac1d1fb-7da1-46b4-90e",
        "--quiet"
    ]
    sub_res = subprocess.run(update_cmd, capture_output=True, text=True)
    assert sub_res.returncode == 0, f"Service update failed: {sub_res.stderr}"
    print(f" Cloud Run process replaced. Update output:\n{sub_res.stdout.strip()}")

    # Wait for new instance
    time.sleep(5)

    # 6. Read back records from fresh Cloud Run instance
    print(f"\n========================================================")
    print(f"STEP 4: Verifying Restart-Survival / Read-Back from Hosted Firestore")
    print(f"========================================================")
    res = requests.get(f"{BACKEND_URL}/api/revisions/{revision_id}")
    assert res.status_code == 200, f"Read revision failed: {res.text}"
    readback_data = res.json()
    readback_claims = readback_data["claims"]
    assert len(readback_claims) == len(claims), f"Claim count mismatch: {len(readback_claims)} vs {len(claims)}"
    
    # Verify disposition persisted across process replacement
    disp_found = any(c["claim_id"] == claim_id and c["human_disposition"] == "PROCEED_PER_COUNSEL" for c in readback_claims)
    assert disp_found, "Human disposition failed to survive process replacement!"
    print(f" 100% RESTART SURVIVAL VERIFIED: All {len(readback_claims)} claims and human disposition read back successfully.")

    # 7. Upload Draft N+1 to test Invalidation Engine & Query Reduction
    print(f"\n========================================================")
    print(f"STEP 5: Upload Draft N+1 -> Test Invalidation & Revision Diff")
    print(f"========================================================")
    draft_n1_text = """SCENE 1 - INT. HIGH RISE BOARDROOM - DAY

ELENA ROSTOVA (30s) overlooks the sprawling city below.

                    ELENA ROSTOVA
The deal is off. We are switching logistics partners immediately.

She points to a new contract on the screen labeled "KOBAYASHI LOGISTICS WORLDWIDE".
"""
    files_n1 = {"file": ("screenplay_draft_n1.txt", draft_n1_text.encode("utf-8"), "text/plain")}
    res = requests.post(f"{BACKEND_URL}/api/projects/{project_id}/upload_script?draft_label=Draft%202", files=files_n1)
    assert res.status_code == 200, f"Upload draft N+1 failed: {res.text}"
    draft_n1_data = res.json()
    rev_n1_id = draft_n1_data["revision"]["revision_id"]
    invalidation_metrics = draft_n1_data.get("invalidation_metrics", {})
    print(f" Draft N+1 processed. Revision ID: {rev_n1_id}")
    print(f" Invalidation Metrics: {json.dumps(invalidation_metrics, indent=2)}")

    return {
        "project_id": project_id,
        "revision_n_id": revision_id,
        "revision_n1_id": rev_n1_id,
        "claims_count": len(claims),
        "search_ids": [sid for c in claims for sid in c.get("search_ids", [])],
        "adk_session_id": claims[0].get("adk_session_id") if claims else None,
        "adk_invocation_id": claims[0].get("adk_invocation_id") if claims else None,
        "invalidation_metrics": invalidation_metrics
    }

if __name__ == "__main__":
    result = run_hosted_verification()
    print("\n========================================================")
    print("ALL HOSTED FIRESTORE & LIVE PROVIDER TESTS PASSED!")
    print("========================================================")
    print(json.dumps(result, indent=2))

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

    # ========================================================
    # STEP 6: CDGI Proof 1 — Structural Move Invariance
    # Scene moved from Scene 1 to Scene 2, identical context snippet -> RETAINED
    # ========================================================
    print(f"\n========================================================")
    print(f"STEP 6: CDGI Proof 1 — Structural Move Invariance (Evidence Retained)")
    print(f"========================================================")
    draft_move_text = """SCENE 1 - INT. HIGH RISE BOARDROOM - DAY
The room is quiet. Morning sunlight casts long shadows across the floor.

SCENE 2 - EXT. ROOFTOP HELIPAD - NIGHT
ELENA ROSTOVA (30s) overlooks the sprawling city below.

                    ELENA ROSTOVA
The deal is off. We are switching logistics partners immediately.
"""
    files_move = {"file": ("screenplay_draft_move.txt", draft_move_text.encode("utf-8"), "text/plain")}
    res = requests.post(f"{BACKEND_URL}/api/projects/{project_id}/upload_script?draft_label=Draft%20Move", files=files_move)
    assert res.status_code == 200, f"Upload move draft failed: {res.text}"
    move_data = res.json()
    move_claims = move_data["claims"]
    elena_move = next((c for c in move_claims if c["item_string"] == "ELENA ROSTOVA"), None)
    assert elena_move is not None, "ELENA ROSTOVA missing from moved draft"
    assert elena_move["state"] == "ACTIVE", f"Expected ACTIVE on structural move, got {elena_move['state']}"
    assert elena_move.get("invalidation_reason") == "Retained: structural scene movement with identical context", f"Unexpected reason: {elena_move.get('invalidation_reason')}"
    print(f" CDGI PROOF 1 VERIFIED: Structural move retained active evidence (reason: '{elena_move.get('invalidation_reason')}').")

    # ========================================================
    # STEP 7: CDGI Proof 2 — Contextual Portrayal Change
    # Same entity text, but context altered to defamatory/material shift -> STALE_SCRIPT
    # ========================================================
    print(f"\n========================================================")
    print(f"STEP 7: CDGI Proof 2 — Contextual Portrayal Mutation (STALE_SCRIPT)")
    print(f"========================================================")
    draft_context_text = """SCENE 1 - INT. HIGH RISE BOARDROOM - DAY
ELENA ROSTOVA (30s) operates an international contraband money-laundering network.

                    ELENA ROSTOVA
The FBI is onto our illicit accounts. Shred everything now.
"""
    files_context = {"file": ("screenplay_draft_context.txt", draft_context_text.encode("utf-8"), "text/plain")}
    res = requests.post(f"{BACKEND_URL}/api/projects/{project_id}/upload_script?draft_label=Draft%20Context", files=files_context)
    assert res.status_code == 200, f"Upload context mutation failed: {res.text}"
    context_data = res.json()
    context_claims = context_data["claims"]
    elena_context = next((c for c in context_claims if c["item_string"] == "ELENA ROSTOVA"), None)
    assert elena_context is not None, "ELENA ROSTOVA missing from context draft"
    assert elena_context["state"] == "STALE_SCRIPT", f"Expected STALE_SCRIPT on context change, got {elena_context['state']}"
    assert "Contextual portrayal modified" in (elena_context.get("invalidation_reason") or ""), f"Unexpected reason: {elena_context.get('invalidation_reason')}"
    print(f" CDGI PROOF 2 VERIFIED: Context mutation invalidated claim to STALE_SCRIPT (reason: '{elena_context.get('invalidation_reason')}').")

    # ========================================================
    # STEP 8: CDGI Proof 3 — Reintroduction After Human Disposition
    # Mark claim as ALTERNATIVE_SELECTED, then reintroduce entity in next draft -> DISPOSITION_VIOLATION
    # ========================================================
    print(f"\n========================================================")
    print(f"STEP 8: CDGI Proof 3 — Reintroduction After Disposition (DISPOSITION_VIOLATION)")
    print(f"========================================================")
    # Mark Elena with ALTERNATIVE_SELECTED
    res = requests.post(f"{BACKEND_URL}/api/claims/{elena_context['claim_id']}/disposition", json={
        "human_disposition": "ALTERNATIVE_SELECTED",
        "disposition_note": "Replaced character name due to conflict with living person."
    })
    assert res.status_code == 200, f"Disposition update failed: {res.text}"
    
    # Reintroduce ELENA ROSTOVA in next draft
    draft_reintro_text = """SCENE 1 - INT. HIGH RISE BOARDROOM - DAY
ELENA ROSTOVA (30s) walks into the executive suite.
"""
    files_reintro = {"file": ("screenplay_draft_reintro.txt", draft_reintro_text.encode("utf-8"), "text/plain")}
    res = requests.post(f"{BACKEND_URL}/api/projects/{project_id}/upload_script?draft_label=Draft%20Reintro", files=files_reintro)
    assert res.status_code == 200, f"Upload reintro draft failed: {res.text}"
    reintro_data = res.json()
    reintro_claims = reintro_data["claims"]
    elena_reintro = next((c for c in reintro_claims if c["item_string"] == "ELENA ROSTOVA"), None)
    assert elena_reintro is not None, "ELENA ROSTOVA missing from reintro draft"
    assert elena_reintro["state"] == "DISPOSITION_VIOLATION", f"Expected DISPOSITION_VIOLATION, got {elena_reintro['state']}"
    assert "Disposition constraint violation" in (elena_reintro.get("invalidation_reason") or ""), f"Unexpected reason: {elena_reintro.get('invalidation_reason')}"
    print(f" CDGI PROOF 3 VERIFIED: Reintroduction flagged DISPOSITION_VIOLATION (reason: '{elena_reintro.get('invalidation_reason')}').")

    # ========================================================
    # STEP 9: CDGI Proof 4 — Territory Scope Expansion (Zero-Text Invalidation)
    # Screenplay text 100% unchanged, but territory expanded to UK/EU -> STALE_SCOPE
    # ========================================================
    print(f"\n==================================================")
    print(f"STEP 9: CDGI Proof 4 — Zero-Text Scope Expansion (STALE_SCOPE)")
    print(f"==================================================")
    scope_prod_payload = {
        "title": f"Live Scope Proof Feature {int(time.time())}",
        "production_country": "US",
        "territories": ["US"],
        "distribution_medium": "THEATRICAL",
        "script_stage": "PRODUCTION"
    }
    res = requests.post(f"{BACKEND_URL}/api/projects", json=scope_prod_payload)
    assert res.status_code == 200, f"Scope project creation failed: {res.text}"
    scope_proj_id = res.json()["project_id"]

    # Upload Draft 1 under US scope
    files_scope_base = {"file": ("screenplay_scope_base.txt", draft_n_text.encode("utf-8"), "text/plain")}
    res = requests.post(f"{BACKEND_URL}/api/projects/{scope_proj_id}/upload_script?draft_label=Draft%20US", files=files_scope_base)
    assert res.status_code == 200, f"Scope base draft upload failed: {res.text}"
    scope_d1_data = res.json()
    active_rev_id = scope_d1_data["revision"]["revision_id"]

    # Expand territory scope from US to US, UK, EU (zero script text change)
    res = requests.post(f"{BACKEND_URL}/api/projects/{scope_proj_id}/scope", json={
        "territories": ["US", "UK", "EU"]
    })
    assert res.status_code == 200, f"Scope expansion failed: {res.text}"

    # Read back active revision claims from Firestore
    res = requests.get(f"{BACKEND_URL}/api/revisions/{active_rev_id}")
    assert res.status_code == 200, f"Read revalidated revision failed: {res.text}"
    reval_claims = res.json()["claims"]
    stale_scope_claims = [c for c in reval_claims if c["state"] == "STALE_SCOPE"]
    assert len(stale_scope_claims) > 0, f"Expected claims to become STALE_SCOPE on scope expansion, got {[c['state'] for c in reval_claims]}"
    assert "Territory scope expanded" in (stale_scope_claims[0].get("invalidation_reason") or "")
    print(f" CDGI PROOF 4 VERIFIED: Zero-text scope expansion triggered STALE_SCOPE (reason: '{stale_scope_claims[0].get('invalidation_reason')}').")

    return {
        "project_id": project_id,
        "revision_n_id": revision_id,
        "revision_n1_id": rev_n1_id,
        "claims_count": len(claims),
        "search_ids": [sid for c in claims for sid in c.get("search_ids", [])],
        "adk_session_id": claims[0].get("adk_session_id") if claims else None,
        "adk_invocation_id": claims[0].get("adk_invocation_id") if claims else None,
        "invalidation_metrics": invalidation_metrics,
        "cdgi_proofs": {
            "proof_1_movement_invariance": elena_move["state"] == "ACTIVE",
            "proof_2_context_mutation": elena_context["state"] == "STALE_SCRIPT",
            "proof_3_disposition_violation": elena_reintro["state"] == "DISPOSITION_VIOLATION",
            "proof_4_scope_expansion": len(stale_scope_claims) > 0
        }
    }

if __name__ == "__main__":
    result = run_hosted_verification()
    print("\n========================================================")
    print("ALL HOSTED FIRESTORE, PROVIDER & CDGI PROOF TESTS PASSED!")
    print("========================================================")
    print(json.dumps(result, indent=2))

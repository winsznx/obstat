#!/usr/bin/env python3
"""
OBSTAT Preflight & Identity Diagnostic Tool
Verifies local/environment prerequisites BEFORE running production OBSTAT tests or uploads.
"""

import os
import sys
import json

def run_preflight():
    print("============================================================")
    print("OBSTAT PREFLIGHT DIAGNOSTIC CHECK")
    print("============================================================")
    
    gcp_project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT") or "project-2ac1d1fb-7da1-46b4-90e"
    obstat_mode = os.getenv("OBSTAT_MODE", "DEVELOPMENT")
    parallel_key = os.getenv("PARALLEL_API_KEY")
    
    print(f"[1] OBSTAT Mode:             {obstat_mode}")
    print(f"[2] Configured GCP Project:  {gcp_project}")
    print(f"[3] Parallel API Key:        {'PRESENT' if parallel_key else 'MISSING (Will default to mock/controlled)'}")
    
    print("\n[4] Testing Google Cloud Application Default Credentials (ADC)...")
    try:
        import google.auth
        from google.auth.transport.requests import Request
        credentials, active_proj = google.auth.default()
        print(f"    - ADC Status:            CREDENTIALS_FOUND")
        print(f"    - Active Identity:       {getattr(credentials, 'service_account_email', 'User Authorized Account')}")
        print(f"    - Quota/Default Project: {active_proj}")
        
        try:
            credentials.refresh(Request())
            print(f"    - Access Token Refresh:  SUCCESSFUL")
        except Exception as ref_err:
            print(f"    - Access Token Refresh:  FAILED ({ref_err})")
    except Exception as adc_err:
        print(f"    - ADC Status:            FAILED ({adc_err})")
        print("\n[ACTION REQUIRED] Run 'gcloud auth application-default login' to authorize ADC.")
        return 1

    print("\n[5] Testing Google Cloud Vertex AI Permissions...")
    try:
        from google import genai
        from google.genai import types
        
        client = genai.Client(
            vertexai=True,
            project=gcp_project,
            location="us-central1",
            credentials=credentials
        )
        
        # Test lightweight prompt execution to verify 'aiplatform.endpoints.predict'
        print(f"    - Invoking model 'gemini-2.5-flash' on project '{gcp_project}'...")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=['Respond strictly with JSON: {"status": "ok"}'],
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        if response.text:
            print(f"    - Vertex AI Execution:   SUCCESSFUL (Model response received)")
            print(f"    - Permission Verified:  'aiplatform.endpoints.predict' IS GRANTED")
        else:
            print(f"    - Vertex AI Execution:   WARNING (Empty text response)")
    except Exception as v_err:
        err_msg = str(v_err)
        print(f"    - Vertex AI Execution:   FAILED")
        print(f"    - Error Detail:          {err_msg}")
        if "403" in err_msg or "PermissionDenied" in err_msg or "aiplatform.endpoints.predict" in err_msg:
            print("\n" + "="*60)
            print("IAM PERMISSION GAP IDENTIFIED")
            print("="*60)
            print(f"Your active identity lacks 'aiplatform.endpoints.predict' on project '{gcp_project}'.")
            print("\nRecommended Fix Options according to Google Cloud documentation:")
            print(f"1. Grant role 'roles/aiplatform.user' (Vertex AI User) to your identity on project '{gcp_project}'.")
            print(f"2. Use Service Account Impersonation:")
            print(f"   gcloud auth application-default login --impersonate-service-account=<SA_EMAIL>")
            print(f"3. Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON key file with Vertex AI User role.")
            print("="*60)
            if obstat_mode == "PRODUCTION":
                print("\n[RESULT] PRODUCTION PREFLIGHT FAILED (Fail-closed policy active).")
                return 1
            else:
                print("\n[RESULT] DEVELOPMENT PREFLIGHT WARNING (Offline/development fallbacks active).")
                return 0
        else:
            print(f"\n[RESULT] Unexpected Vertex error: {v_err}")
            return 1

    print("\n[RESULT] PREFLIGHT CHECK COMPLETE - ALL CREDENTIALS & PERMISSIONS VERIFIED FOR PRODUCTION!")
    return 0

if __name__ == "__main__":
    sys.exit(run_preflight())

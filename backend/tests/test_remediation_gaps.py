import pytest
import datetime
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app
from app.services.db_provider import get_repository
from app.models.clearance_record import Project, ResearchScope

client = TestClient(app)

def test_sample_route_collision_fix():
    """
    Regression Test B: Verify GET /api/projects/sample deterministically returns
    the dedicated sample project 'proj_starlight_01' ('The Starlight Heist')
    and NEVER matches as an arbitrary project_id='sample'.
    """
    res = client.get("/api/projects/sample")
    assert res.status_code == 200, f"Expected 200 OK from /api/projects/sample, got {res.status_code}"
    data = res.json()
    assert data["project_id"] == "proj_starlight_01", f"Expected project_id 'proj_starlight_01', got {data.get('project_id')}"
    assert "Starlight" in data["title"], f"Expected 'Starlight' in title, got {data.get('title')}"

def test_assurance_project_isolation():
    """
    Regression Test C: Verify Assurance egress logs are strictly isolated per project.
    Project A egress records must NEVER leak into Project B Assurance queries.
    """
    repo = get_repository()
    
    proj_a_id = "proj_test_tenant_alpha"
    proj_b_id = "proj_test_tenant_beta"
    
    repo.save_project(Project(
        project_id=proj_a_id,
        title="Project Alpha",
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        default_scope=ResearchScope()
    ))
    
    repo.save_project(Project(
        project_id=proj_b_id,
        title="Project Beta",
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        default_scope=ResearchScope()
    ))
    
    # Emit egress log for Project A
    repo.save_egress_log(
        query="ALPHA CORP official website business US",
        allowed=True,
        provenance=["ITEM_TOKEN", "TEMPLATE_TOKEN", "SCOPE_TOKEN"],
        search_id="search_alpha_101",
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        project_id=proj_a_id,
        revision_id="rev_alpha_1"
    )
    
    # Emit egress log for Project B
    repo.save_egress_log(
        query="BETA LABS official website business US",
        allowed=True,
        provenance=["ITEM_TOKEN", "TEMPLATE_TOKEN", "SCOPE_TOKEN"],
        search_id="search_beta_202",
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        project_id=proj_b_id,
        revision_id="rev_beta_1"
    )
    
    # Emit unscoped legacy log (no project_id binding)
    repo.save_egress_log(
        query="UNSCOPED LEGACY QUERY business US",
        allowed=True,
        provenance=["ITEM_TOKEN", "TEMPLATE_TOKEN"],
        search_id="search_unscoped_999",
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        project_id=None,
        revision_id=None
    )
    
    # Query Project A Assurance endpoint
    res_a = client.get(f"/api/projects/{proj_a_id}/assurance/egress_logs")
    assert res_a.status_code == 200
    logs_a = res_a.json()
    
    # Query Project B Assurance endpoint
    res_b = client.get(f"/api/projects/{proj_b_id}/assurance/egress_logs")
    assert res_b.status_code == 200
    logs_b = res_b.json()
    
    # Verification: A sees ONLY A; B sees ONLY B; Unscoped legacy logs do NOT leak
    search_ids_a = [log["search_id"] for log in logs_a]
    search_ids_b = [log["search_id"] for log in logs_b]
    
    assert "search_alpha_101" in search_ids_a, "Project A egress logs missing Alpha search record"
    assert "search_beta_202" not in search_ids_a, "TENANT LEAKAGE: Project A saw Project B search record!"
    assert "search_unscoped_999" not in search_ids_a, "UNSCOPED LEAKAGE: Project A saw unscoped legacy search record!"
    
    assert "search_beta_202" in search_ids_b, "Project B egress logs missing Beta search record"
    assert "search_alpha_101" not in search_ids_b, "TENANT LEAKAGE: Project B saw Project A search record!"
    assert "search_unscoped_999" not in search_ids_b, "UNSCOPED LEAKAGE: Project B saw unscoped legacy search record!"

def test_system_preflight_endpoint_safe_privacy():
    """
    Regression Test A: Verify /api/system/preflight returns safe booleans
    without leaking private emails, tokens, or infrastructure details.
    """
    res = client.get("/api/system/preflight")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "required_iam_permission" in data
    assert data["required_iam_permission"] == "aiplatform.endpoints.predict"
    
    # Assert privacy protection
    raw_text = res.text
    assert "@" not in raw_text, "Privacy Leakage: Email address detected in public preflight response!"
    assert "access_token" not in raw_text, "Privacy Leakage: Token detected in public preflight response!"
    assert "secret" not in raw_text.lower(), "Privacy Leakage: Secret detected in public preflight response!"

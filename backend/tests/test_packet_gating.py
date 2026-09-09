import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import unittest
from unittest.mock import MagicMock, patch
from app.models.clearance_record import (
    Project, Revision, Claim, ClaimState, ResearchOutcome, ItemType, HumanDisposition, EvidenceRecord, EvidenceLabel, ResearchScope
)
from main import app
from fastapi.testclient import TestClient

class TestPacketGatingFailClosed(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("main.get_repository")
    def test_packet_blocked_when_insufficient_coverage(self, mock_get_repo):
        mock_repo = MagicMock()
        mock_repo.get_revision.return_value = {
            "revision": Revision(
                revision_id="rev_test",
                project_id="proj_test",
                title="Test Project",
                draft_label="Draft 1",
                file_name="test.txt",
                sha256="abc1234567890def",
                total_scenes=1,
                total_pages=1
            )
        }
        mock_repo.get_project.return_value = Project(
            project_id="proj_test",
            title="Test Project",
            created_at="2026-09-09T00:00:00Z"
        )
        
        # 2 claims both INSUFFICIENT_COVERAGE with 0 usable evidence
        scope = ResearchScope(territories=["US"], production_country="US", distribution_medium="THEATRICAL")
        claim1 = Claim(
            claim_id="claim_1",
            item_id="item_1",
            item_string="ELENA ROSTOVA",
            item_type=ItemType.CHARACTER_NAME,
            revision_id="rev_test",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.INSUFFICIENT_COVERAGE,
            scope=scope,
            queries=["ELENA ROSTOVA"],
            search_ids=["search_1"],
            evidence=[]
        )
        claim2 = Claim(
            claim_id="claim_2",
            item_id="item_2",
            item_string="KOBAYASHI LOGISTICS WORLDWIDE",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_test",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.INSUFFICIENT_COVERAGE,
            scope=scope,
            queries=["KOBAYASHI LOGISTICS"],
            search_ids=["search_2"],
            evidence=[]
        )
        mock_repo.get_claims_for_revision.return_value = [claim1, claim2]
        mock_get_repo.return_value = mock_repo

        response = self.client.get("/api/revisions/rev_test/packet")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify fail-closed packet status
        self.assertEqual(data["packet_status"], "RESEARCH_PACKET_BLOCKED")
        self.assertFalse(data["is_complete"])
        self.assertGreater(len(data["blocked_reasons"]), 0)
        self.assertIn("INSUFFICIENT_COVERAGE", data["blocked_reasons"][0]["reason"])

    @patch("main.get_repository")
    def test_packet_complete_when_all_claims_resolved(self, mock_get_repo):
        mock_repo = MagicMock()
        mock_repo.get_revision.return_value = {
            "revision": Revision(
                revision_id="rev_test",
                project_id="proj_test",
                title="Test Project",
                draft_label="Draft 1",
                file_name="test.txt",
                sha256="abc1234567890def",
                total_scenes=1,
                total_pages=1
            )
        }
        mock_repo.get_project.return_value = Project(
            project_id="proj_test",
            title="Test Project",
            created_at="2026-09-09T00:00:00Z"
        )
        
        scope = ResearchScope(territories=["US"], production_country="US", distribution_medium="THEATRICAL")
        claim1 = Claim(
            claim_id="claim_1",
            item_id="item_1",
            item_string="ELENA ROSTOVA",
            item_type=ItemType.CHARACTER_NAME,
            revision_id="rev_test",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE,
            scope=scope,
            queries=["ELENA ROSTOVA"],
            search_ids=["search_1"],
            evidence=[
                EvidenceRecord(
                    evidence_id="ev_1",
                    parallel_search_id="search_1",
                    session_id="sess_1",
                    url="https://example.com",
                    title="Example Directory",
                    excerpt="No match found.",
                    domain="example.com",
                    evidence_label=EvidenceLabel.VALID_NON_MATCH,
                    is_usable=True
                )
            ],
            human_disposition=HumanDisposition.PROCEED_PER_COUNSEL
        )
        mock_repo.get_claims_for_revision.return_value = [claim1]
        mock_get_repo.return_value = mock_repo

        response = self.client.get("/api/revisions/rev_test/packet")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data["packet_status"], "RESEARCH_PACKET_COMPLETE")
        self.assertTrue(data["is_complete"])
        self.assertEqual(len(data["blocked_reasons"]), 0)

if __name__ == "__main__":
    unittest.main()

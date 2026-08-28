import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from unittest.mock import MagicMock, patch
from app.models.clearance_record import ClearanceItem, ResearchScope, ItemType, ParallelQueryResult, EvidenceLabel, ClaimState, ResearchOutcome
from app.adk.graph import ADKGraphOrchestrator

class TestADKGraph(unittest.TestCase):

    @patch('app.services.parallel_service.ParallelSearchService.execute_search')
    @patch('app.adk.classifier.GeminiClassifier.classify_evidence')
    def test_orchestration_workflow_path(self, mock_classify, mock_search):
        # 1. Setup mock returns for search and classifier
        mock_search.return_value = [
            ParallelQueryResult(
                query="Acme Corp official website business US",
                search_id="search_123",
                session_id="session_123",
                url="https://acme.org",
                title="Acme Corp Home",
                excerpt="This is Acme Corp in USA.",
                domain="acme.org"
            )
        ]
        
        from app.models.clearance_record import EvidenceRecord
        mock_classify.return_value = EvidenceRecord(
            evidence_id="ev_123",
            parallel_search_id="search_123",
            session_id="session_123",
            url="https://acme.org",
            title="Acme Corp Home",
            excerpt="This is Acme Corp in USA.",
            domain="acme.org",
            evidence_label=EvidenceLabel.EXACT_MATCH,
            quoted_match_span="Acme Corp",
            is_usable=True
        )

        # 2. Run orchestrator
        orchestrator = ADKGraphOrchestrator()
        items = [
            ClearanceItem(
                item_id="item_001",
                item_string="Acme Corp",
                item_type=ItemType.BUSINESS_ORG
            )
        ]
        claims = orchestrator.process_items(
            revision_id="rev_abc",
            items=items,
            scope=ResearchScope(territories=["US"])
        )

        # 3. Assertions
        self.assertEqual(len(claims), 1)
        claim = claims[0]
        self.assertEqual(claim.item_string, "Acme Corp")
        self.assertEqual(claim.state, ClaimState.ACTIVE)
        self.assertEqual(claim.outcome, ResearchOutcome.MATCH_FOUND)
        self.assertEqual(len(claim.evidence), 1)
        self.assertEqual(claim.evidence[0].evidence_label, EvidenceLabel.EXACT_MATCH)

if __name__ == '__main__':
    unittest.main()

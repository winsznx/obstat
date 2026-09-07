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

        # 4. Genuine ADK Runtime Lifecycle Verification
        self.assertIsNotNone(claim.adk_session_id, "Claim must have genuine ADK session ID")
        self.assertTrue(claim.adk_session_id.startswith("adk_sess_"), f"Unexpected ADK session format: {claim.adk_session_id}")
        self.assertGreaterEqual(claim.adk_event_count, 6, "Claim must record genuine ADK event count")
        
        # Verify events collected from Runner.run_async
        self.assertGreaterEqual(len(orchestrator.last_execution_events), 6, "Runner must emit lifecycle events")
        
        # Verify function call and response event progression
        function_calls = []
        function_responses = []
        for ev in orchestrator.last_execution_events:
            calls = ev.get_function_calls()
            if calls:
                function_calls.extend([c.name for c in calls])
            resps = ev.get_function_responses()
            if resps:
                function_responses.extend([r.name for r in resps])
                
        self.assertIn("egress_authorize_tool", function_calls)
        self.assertIn("parallel_search_tool", function_calls)
        self.assertIn("evidence_classification_tool", function_calls)
        self.assertIn("egress_authorize_tool", function_responses)
        self.assertIn("parallel_search_tool", function_responses)
        self.assertIn("evidence_classification_tool", function_responses)

    def test_adk_runner_failure_breaks_execution_path(self):
        """Proves that removing/bypassing or failing the ADK runner breaks the research pipeline."""
        orchestrator = ADKGraphOrchestrator()
        # Sabotage the runner session service
        orchestrator.adk_runner.session_service = None
        
        items = [
            ClearanceItem(
                item_id="item_fail",
                item_string="Test Entity",
                item_type=ItemType.BUSINESS_ORG
            )
        ]
        with self.assertRaises(Exception):
            orchestrator.process_items(
                revision_id="rev_fail",
                items=items,
                scope=ResearchScope(territories=["US"])
            )


if __name__ == '__main__':
    unittest.main()

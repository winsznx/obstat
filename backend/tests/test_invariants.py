import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.clearance_record import (
    Claim, ClaimState, ResearchOutcome, ClearanceItem, ItemType, Occurrence, ResearchScope
)
from app.services.invalidation_engine import RevisionInvalidationEngine

class TestRevisionInvariants(unittest.TestCase):
    
    def setUp(self):
        self.scope = ResearchScope()

    def test_unchanged_claim_retains_evidence(self):
        prior_claim = Claim(
            claim_id="claim_1",
            item_id="item_1",
            item_string="Acme Corp",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_1",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE,
            scope=self.scope,
            occurrences=[Occurrence(
                revision_id="rev_1",
                scene_id="SC_001",
                page_number=1,
                line_offset=5,
                occurrence_text="Acme Corp",
                context_snippet="We buy Acme Corp tools."
            )]
        )
        current_items = [
            ClearanceItem(
                item_id="item_1",
                item_string="Acme Corp",
                item_type=ItemType.BUSINESS_ORG,
                occurrences=[Occurrence(
                    revision_id="rev_2",
                    scene_id="SC_001",
                    page_number=1,
                    line_offset=5,
                    occurrence_text="Acme Corp",
                    context_snippet="We buy Acme Corp tools."
                )]
            )
        ]
        updated, metrics = RevisionInvalidationEngine.compute_revision_diff(
            [prior_claim], current_items, "rev_1", "rev_2"
        )
        self.assertEqual(metrics["retained_claims"], 1)
        self.assertEqual(updated[0].state, ClaimState.ACTIVE)

    def test_modified_claim_invalidates_evidence(self):
        prior_claim = Claim(
            claim_id="claim_1",
            item_id="item_1",
            item_string="Acme Corp",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_1",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE,
            scope=self.scope,
            occurrences=[Occurrence(
                revision_id="rev_1",
                scene_id="SC_001",
                page_number=1,
                line_offset=5,
                occurrence_text="Acme Corp",
                context_snippet="We buy Acme Corp tools."
            )]
        )
        # Mock evidence list to trigger comparison discrepancy
        from app.models.clearance_record import EvidenceRecord, EvidenceLabel
        prior_claim.evidence = [
            EvidenceRecord(
                evidence_id="ev_1",
                parallel_search_id="search_1",
                session_id="session_1",
                url="https://acmecorp.com",
                title="Acme Corp Registry",
                excerpt="This is Acme Corp",
                domain="acmecorp.com",
                evidence_label=EvidenceLabel.VALID_NON_MATCH
            )
        ]
        current_items = [
            ClearanceItem(
                item_id="item_1",
                item_string="Acme Corp",
                item_type=ItemType.BUSINESS_ORG,
                occurrences=[Occurrence(
                    revision_id="rev_2",
                    scene_id="SC_002",  # Moved scene context
                    page_number=2,
                    line_offset=15,
                    occurrence_text="Acme Corp",
                    context_snippet="Acme Corp is closing down."  # Changed snippet content
                )]
            )
        ]
        updated, metrics = RevisionInvalidationEngine.compute_revision_diff(
            [prior_claim], current_items, "rev_1", "rev_2"
        )
        self.assertEqual(metrics["invalidated_claims"], 1)
        self.assertEqual(updated[0].state, ClaimState.STALE_SCRIPT)
        self.assertEqual(len(updated[0].evidence), 0)

    def test_removed_claim_is_superseded(self):
        prior_claim = Claim(
            claim_id="claim_1",
            item_id="item_1",
            item_string="Acme Corp",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_1",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE,
            scope=self.scope
        )
        current_items = []
        updated, metrics = RevisionInvalidationEngine.compute_revision_diff(
            [prior_claim], current_items, "rev_1", "rev_2"
        )
        self.assertEqual(metrics["invalidated_claims"], 1)
        self.assertEqual(updated[0].state, ClaimState.SUPERSEDED)

if __name__ == '__main__':
    unittest.main()

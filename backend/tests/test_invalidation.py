import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.clearance_record import (
    Claim, ClaimState, ResearchOutcome, ClearanceItem, ItemType, Occurrence, ResearchScope
)
from app.services.invalidation_engine import RevisionInvalidationEngine

class TestInvalidationEngine(unittest.TestCase):
    def test_invalidation_engine_draft_diff(self):
        scope = ResearchScope()
        prior_claim = Claim(
            claim_id="claim_001",
            item_id="item_001",
            item_string="Acme Corp",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_1",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE,
            scope=scope
        )
        
        current_items = [
            ClearanceItem(
                item_id="item_001",
                item_string="Acme Corp",
                item_type=ItemType.BUSINESS_ORG,
                occurrences=[Occurrence(
                    revision_id="rev_2",
                    scene_id="SC_001",
                    page_number=1,
                    line_offset=12,
                    occurrence_text="Acme Corp truck",
                    context_snippet="EXT. STREET - DAY"
                )]
            )
        ]

        updated_claims, metrics = RevisionInvalidationEngine.compute_revision_diff(
            prior_claims=[prior_claim],
            current_items=current_items,
            prior_revision_id="rev_1",
            current_revision_id="rev_2"
        )

        self.assertEqual(metrics["retained_claims"], 1)
        self.assertEqual(metrics["searches_saved"], 1)
        self.assertEqual(updated_claims[0].state, ClaimState.ACTIVE)

if __name__ == '__main__':
    unittest.main()

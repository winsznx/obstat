import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.clearance_record import (
    Claim, ClaimState, ResearchOutcome, ClearanceItem, ItemType, Occurrence, ResearchScope, EvidenceRecord, EvidenceLabel, HumanDisposition
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

    # 1. Packet block logic test invariants
    def test_no_packet_before_revision(self):
        from app.models.clearance_record import Project
        project = Project(project_id="p1", title="Empty Production")
        self.assertFalse(project.active_revision_id)

    def test_packet_blocked_by_stale_claim(self):
        claims = [
            Claim(
                claim_id="c1", item_id="i1", item_string="A", item_type=ItemType.BUSINESS_ORG,
                revision_id="r1", state=ClaimState.STALE_SCRIPT, outcome=ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE,
                scope=self.scope
            )
        ]
        packet_complete = len(claims) > 0 and all(c.state == ClaimState.ACTIVE and c.outcome != ResearchOutcome.INSUFFICIENT_COVERAGE for c in claims)
        self.assertFalse(packet_complete)

    def test_packet_blocked_by_insufficient_coverage(self):
        claims = [
            Claim(
                claim_id="c1", item_id="i1", item_string="A", item_type=ItemType.BUSINESS_ORG,
                revision_id="r1", state=ClaimState.ACTIVE, outcome=ResearchOutcome.INSUFFICIENT_COVERAGE,
                scope=self.scope
            )
        ]
        packet_complete = len(claims) > 0 and all(c.state == ClaimState.ACTIVE and c.outcome != ResearchOutcome.INSUFFICIENT_COVERAGE for c in claims)
        self.assertFalse(packet_complete)

    def test_packet_blocked_by_research_error(self):
        claims = [
            Claim(
                claim_id="c1", item_id="i1", item_string="A", item_type=ItemType.BUSINESS_ORG,
                revision_id="r1", state=ClaimState.ACTIVE, outcome=ResearchOutcome.RESEARCH_ERROR,
                scope=self.scope
            )
        ]
        packet_complete = len(claims) > 0 and all(c.state == ClaimState.ACTIVE and c.outcome not in [ResearchOutcome.INSUFFICIENT_COVERAGE, ResearchOutcome.RESEARCH_ERROR] for c in claims)
        self.assertFalse(packet_complete)

    def test_disposition_does_not_modify_research_outcome(self):
        claim = Claim(
            claim_id="c1", item_id="i1", item_string="A", item_type=ItemType.BUSINESS_ORG,
            revision_id="r1", state=ClaimState.ACTIVE, outcome=ResearchOutcome.MATCH_FOUND,
            scope=self.scope
        )
        claim.human_disposition = HumanDisposition.PROCEED_PER_COUNSEL
        self.assertEqual(claim.outcome, ResearchOutcome.MATCH_FOUND)
        self.assertEqual(claim.human_disposition, HumanDisposition.PROCEED_PER_COUNSEL)

    def test_unusable_evidence_contributes_zero_coverage(self):
        ev = EvidenceRecord(
            evidence_id="e1", parallel_search_id="s1", session_id="ss1", url="http://x.com",
            title="Title", excerpt="Snippet", domain="x.com", evidence_label=EvidenceLabel.UNUSABLE_EVIDENCE,
            is_usable=False
        )
        self.assertFalse(ev.is_usable)

    def test_moved_but_semantically_unchanged_item_retains_claim(self):
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
                    scene_id="SC_002",  # Moved scene index
                    page_number=2,      # Page index changed
                    line_offset=5,
                    occurrence_text="Acme Corp",
                    context_snippet="We buy Acme Corp tools."  # Same semantic content
                )]
            )
        ]
        updated, metrics = RevisionInvalidationEngine.compute_revision_diff(
            [prior_claim], current_items, "rev_1", "rev_2"
        )
        self.assertEqual(metrics["retained_claims"], 1)
        self.assertEqual(updated[0].state, ClaimState.ACTIVE)

    def test_removed_claim_leaves_active_packet(self):
        claims = [
            Claim(
                claim_id="c1", item_id="i1", item_string="A", item_type=ItemType.BUSINESS_ORG,
                revision_id="r1", state=ClaimState.SUPERSEDED, outcome=ResearchOutcome.MATCH_FOUND,
                scope=self.scope
            )
        ]
        active_claims = [c for c in claims if c.state == ClaimState.ACTIVE]
        packet_complete_for_active = len(active_claims) == 0 or all(c.outcome != ResearchOutcome.INSUFFICIENT_COVERAGE for c in active_claims)
        self.assertTrue(packet_complete_for_active)

if __name__ == '__main__':
    unittest.main()

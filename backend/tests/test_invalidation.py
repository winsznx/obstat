import unittest
import sys
import os
import datetime
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.clearance_record import (
    Claim, ClaimState, ResearchOutcome, ClearanceItem, ItemType, Occurrence,
    ResearchScope, HumanDisposition, EvidenceRecord, EvidenceLabel
)
from app.services.invalidation_engine import RevisionInvalidationEngine

class TestClearanceDependencyGraphInvalidation(unittest.TestCase):
    def setUp(self):
        self.scope_us = ResearchScope(
            territories=["US"],
            production_country="US",
            distribution_medium="THEATRICAL",
            plan_version="v1.0",
            freshness_ttl_days=30
        )
        self.dummy_evidence = [
            EvidenceRecord(
                evidence_id="ev_001",
                parallel_search_id="search_001",
                session_id="sess_001",
                url="https://example.com",
                title="Example",
                excerpt="Acme Corp verified",
                domain="example.com",
                evidence_label=EvidenceLabel.EXACT_MATCH
            )
        ]

    def test_retains_unchanged_claim(self):
        prior_claim = Claim(
            claim_id="claim_001",
            item_id="item_001",
            item_string="Acme Corp",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_1",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.MATCH_FOUND,
            scope=self.scope_us,
            evidence=self.dummy_evidence,
            occurrences=[Occurrence(
                revision_id="rev_1",
                scene_id="SC_001",
                page_number=1,
                line_offset=12,
                occurrence_text="Acme Corp",
                context_snippet="EXT. STREET - DAY: An Acme Corp van idles."
            )]
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
                    occurrence_text="Acme Corp",
                    context_snippet="EXT. STREET - DAY: An Acme Corp van idles."
                )]
            )
        ]
        updated, metrics = RevisionInvalidationEngine.compute_revision_diff(
            prior_claims=[prior_claim],
            current_items=current_items,
            prior_revision_id="rev_1",
            current_revision_id="rev_2",
            prior_scope=self.scope_us,
            current_scope=self.scope_us
        )
        self.assertEqual(metrics["retained_claims"], 1)
        self.assertEqual(metrics["searches_saved"], 1)
        self.assertEqual(updated[0].state, ClaimState.ACTIVE)
        self.assertEqual(len(updated[0].evidence), 1)

    def test_structural_movement_retains_evidence(self):
        """Scene moved from Scene 1 to Scene 8, but context is identical -> Retained, 0 searches."""
        prior_claim = Claim(
            claim_id="claim_001",
            item_id="item_001",
            item_string="Acme Corp",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_1",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.MATCH_FOUND,
            scope=self.scope_us,
            evidence=self.dummy_evidence,
            occurrences=[Occurrence(
                revision_id="rev_1",
                scene_id="SC_001",
                page_number=1,
                line_offset=12,
                occurrence_text="Acme Corp",
                context_snippet="EXT. STREET - DAY: An Acme Corp van idles."
            )]
        )
        # Moved to Scene 8
        current_items = [
            ClearanceItem(
                item_id="item_001",
                item_string="Acme Corp",
                item_type=ItemType.BUSINESS_ORG,
                occurrences=[Occurrence(
                    revision_id="rev_2",
                    scene_id="SC_008",
                    page_number=15,
                    line_offset=420,
                    occurrence_text="Acme Corp",
                    context_snippet="EXT. STREET - DAY: An Acme Corp van idles."
                )]
            )
        ]
        updated, metrics = RevisionInvalidationEngine.compute_revision_diff(
            prior_claims=[prior_claim],
            current_items=current_items,
            prior_revision_id="rev_1",
            current_revision_id="rev_2"
        )
        self.assertEqual(metrics["retained_claims"], 1)
        self.assertEqual(metrics["searches_saved"], 1)
        self.assertEqual(updated[0].state, ClaimState.ACTIVE)
        self.assertEqual(updated[0].revision_id, "rev_2")

    def test_contextual_portrayal_mutation_invalidates_claim(self):
        """Entity name unchanged, but action lines shift to defamatory portrayal -> STALE_SCRIPT."""
        prior_claim = Claim(
            claim_id="claim_001",
            item_id="item_001",
            item_string="Acme Corp",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_1",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.MATCH_FOUND,
            scope=self.scope_us,
            evidence=self.dummy_evidence,
            occurrences=[Occurrence(
                revision_id="rev_1",
                scene_id="SC_001",
                page_number=1,
                line_offset=12,
                occurrence_text="Acme Corp",
                context_snippet="Acme Corp delivers packages cleanly."
            )]
        )
        # Portrayal changes to criminal/defamatory
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
                    occurrence_text="Acme Corp",
                    context_snippet="Acme Corp toxic dumping operation poisons groundwater."
                )]
            )
        ]
        updated, metrics = RevisionInvalidationEngine.compute_revision_diff(
            prior_claims=[prior_claim],
            current_items=current_items,
            prior_revision_id="rev_1",
            current_revision_id="rev_2"
        )
        self.assertEqual(metrics["invalidated_claims"], 1)
        self.assertEqual(metrics["stale_script_count"], 1)
        self.assertEqual(updated[0].state, ClaimState.STALE_SCRIPT)
        self.assertEqual(len(updated[0].evidence), 0)

    def test_zero_text_scope_territory_expansion(self):
        """Script text 100% unchanged, but territory scope expanded to UK/EU -> STALE_SCOPE."""
        prior_claim = Claim(
            claim_id="claim_001",
            item_id="item_001",
            item_string="Wayne Enterprises",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_1",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.MATCH_FOUND,
            scope=self.scope_us,
            evidence=self.dummy_evidence,
            occurrences=[Occurrence(
                revision_id="rev_1",
                scene_id="SC_001",
                page_number=1,
                line_offset=5,
                occurrence_text="Wayne Enterprises",
                context_snippet="Elena signs the Wayne Enterprises dossier."
            )]
        )
        current_items = [
            ClearanceItem(
                item_id="item_001",
                item_string="Wayne Enterprises",
                item_type=ItemType.BUSINESS_ORG,
                occurrences=[Occurrence(
                    revision_id="rev_2",
                    scene_id="SC_001",
                    page_number=1,
                    line_offset=5,
                    occurrence_text="Wayne Enterprises",
                    context_snippet="Elena signs the Wayne Enterprises dossier."
                )]
            )
        ]
        scope_expanded = ResearchScope(
            territories=["US", "UK", "EU"],
            production_country="US",
            distribution_medium="THEATRICAL_AND_STREAMING"
        )
        updated, metrics = RevisionInvalidationEngine.compute_revision_diff(
            prior_claims=[prior_claim],
            current_items=current_items,
            prior_revision_id="rev_1",
            current_revision_id="rev_2",
            prior_scope=self.scope_us,
            current_scope=scope_expanded
        )
        self.assertEqual(metrics["stale_scope_count"], 1)
        self.assertEqual(updated[0].state, ClaimState.STALE_SCOPE)
        self.assertIn("Territory scope expanded", updated[0].invalidation_reason)

    def test_zero_text_freshness_ttl_expiration(self):
        """Script text 100% unchanged, but claim is 45 days old (TTL 30 days) -> STALE_AGE."""
        created_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=45)
        prior_claim = Claim(
            claim_id="claim_001",
            item_id="item_001",
            item_string="Wayne Enterprises",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_1",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.MATCH_FOUND,
            scope=self.scope_us,
            evidence=self.dummy_evidence,
            created_at=created_time.isoformat(),
            occurrences=[Occurrence(
                revision_id="rev_1",
                scene_id="SC_001",
                page_number=1,
                line_offset=5,
                occurrence_text="Wayne Enterprises",
                context_snippet="Elena signs the Wayne Enterprises dossier."
            )]
        )
        current_items = [
            ClearanceItem(
                item_id="item_001",
                item_string="Wayne Enterprises",
                item_type=ItemType.BUSINESS_ORG,
                occurrences=[Occurrence(
                    revision_id="rev_2",
                    scene_id="SC_001",
                    page_number=1,
                    line_offset=5,
                    occurrence_text="Wayne Enterprises",
                    context_snippet="Elena signs the Wayne Enterprises dossier."
                )]
            )
        ]
        updated, metrics = RevisionInvalidationEngine.compute_revision_diff(
            prior_claims=[prior_claim],
            current_items=current_items,
            prior_revision_id="rev_1",
            current_revision_id="rev_2",
            prior_scope=self.scope_us,
            current_scope=self.scope_us,
            current_time=datetime.datetime.now(datetime.timezone.utc)
        )
        self.assertEqual(metrics["stale_age_count"], 1)
        self.assertEqual(updated[0].state, ClaimState.STALE_AGE)
        self.assertIn("freshness TTL", updated[0].invalidation_reason)

    def test_persisted_human_disposition_violation(self):
        """Entity previously rejected with ALTERNATIVE_SELECTED reintroduced in new revision -> DISPOSITION_VIOLATION."""
        prior_claim = Claim(
            claim_id="claim_001",
            item_id="item_001",
            item_string="MERCER VALE RECORDS",
            item_type=ItemType.BUSINESS_ORG,
            revision_id="rev_1",
            state=ClaimState.ACTIVE,
            outcome=ResearchOutcome.MATCH_FOUND,
            scope=self.scope_us,
            evidence=self.dummy_evidence,
            human_disposition=HumanDisposition.ALTERNATIVE_SELECTED,
            disposition_note="Replaced with NORTHLIGHT AUDIO due to registered trademark conflict."
        )
        current_items = [
            ClearanceItem(
                item_id="item_001",
                item_string="MERCER VALE RECORDS",
                item_type=ItemType.BUSINESS_ORG,
                occurrences=[Occurrence(
                    revision_id="rev_2",
                    scene_id="SC_004",
                    page_number=6,
                    line_offset=180,
                    occurrence_text="MERCER VALE RECORDS",
                    context_snippet="He signs the contract at MERCER VALE RECORDS."
                )]
            )
        ]
        updated, metrics = RevisionInvalidationEngine.compute_revision_diff(
            prior_claims=[prior_claim],
            current_items=current_items,
            prior_revision_id="rev_1",
            current_revision_id="rev_2"
        )
        self.assertEqual(metrics["disposition_violations"], 1)
        self.assertEqual(updated[0].state, ClaimState.DISPOSITION_VIOLATION)
        self.assertIn("Disposition constraint violation", updated[0].invalidation_reason)

if __name__ == '__main__':
    unittest.main()


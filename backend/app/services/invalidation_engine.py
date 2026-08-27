from typing import List, Dict, Tuple
from app.models.clearance_record import (
    Claim, ClaimState, ResearchOutcome, ClearanceItem, Occurrence
)

class RevisionInvalidationEngine:
    """
    Deterministic Revision Diff & Invalidation Engine.
    Compares Draft N vs Draft N+1 claims and automatically invalidates stale evidence.
    """

    @classmethod
    def compute_revision_diff(
        cls,
        prior_claims: List[Claim],
        current_items: List[ClearanceItem],
        prior_revision_id: str,
        current_revision_id: str
    ) -> Tuple[List[Claim], Dict[str, int]]:
        
        updated_claims: List[Claim] = []
        prior_item_map = {c.item_string.lower(): c for c in prior_claims}
        current_item_map = {i.item_string.lower(): i for i in current_items}

        retained_count = 0
        invalidated_count = 0
        new_count = 0

        # Check existing claims against new script revision
        for prior_claim in prior_claims:
            key = prior_claim.item_string.lower()
            if key in current_item_map:
                current_item = current_item_map[key]
                # Compare occurrences context
                prior_scene_ids = {o.scene_id for o in prior_claim.scope.dict().get('occurrences', [])} if hasattr(prior_claim.scope, 'occurrences') else set()
                current_scene_ids = {o.scene_id for o in current_item.occurrences}
                
                # Check if item context changed
                if prior_scene_ids and prior_scene_ids != current_scene_ids:
                    # Item moved or used in different context -> STALE_SCRIPT
                    stale_claim = prior_claim.copy(deep=True)
                    stale_claim.state = ClaimState.STALE_SCRIPT
                    stale_claim.revision_id = current_revision_id
                    updated_claims.append(stale_claim)
                    invalidated_count += 1
                else:
                    # Context retained -> keep ACTIVE
                    retained_claim = prior_claim.copy(deep=True)
                    retained_claim.revision_id = current_revision_id
                    updated_claims.append(retained_claim)
                    retained_count += 1
            else:
                # Item removed from script -> SUPERSEDED
                superseded_claim = prior_claim.copy(deep=True)
                superseded_claim.state = ClaimState.SUPERSEDED
                updated_claims.append(superseded_claim)
                invalidated_count += 1

        # Check for newly introduced items
        for key, item in current_item_map.items():
            if key not in prior_item_map:
                new_claim = Claim(
                    claim_id=f"claim_{item.item_id}",
                    item_id=item.item_id,
                    item_string=item.item_string,
                    item_type=item.item_type,
                    revision_id=current_revision_id,
                    state=ClaimState.ACTIVE,
                    outcome=ResearchOutcome.INSUFFICIENT_COVERAGE,
                    scope=prior_claims[0].scope if prior_claims else None
                )
                updated_claims.append(new_claim)
                new_count += 1

        metrics = {
            "retained_claims": retained_count,
            "invalidated_claims": invalidated_count,
            "new_claims": new_count,
            "searches_saved": retained_count
        }

        return updated_claims, metrics

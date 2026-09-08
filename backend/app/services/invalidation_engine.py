import datetime
from typing import List, Dict, Tuple, Optional, Set
from app.models.clearance_record import (
    Claim, ClaimState, ResearchOutcome, ClearanceItem, Occurrence,
    ResearchScope, HumanDisposition
)

class RevisionInvalidationEngine:
    """
    Clearance Dependency Graph Invalidation (CDGI) Engine.
    
    Binds clearance evidence validity to its multi-dimensional dependency set:
    D = <Text, Context, Scope, TTL, Dispositions>
    
    Ensures:
    1. Non-text changes (scope expansion, distribution medium, TTL, plan version)
       invalidate evidence even with 0 script text edits (STALE_SCOPE, STALE_AGE, STALE_POLICY).
    2. Contextual portrayal shifts invalidate evidence (STALE_SCRIPT).
    3. Structural scene movements with unchanged context preserve evidence (RETAINED).
    4. Persisted human disposition constraints flag violations across drafts (DISPOSITION_VIOLATION).
    5. Selective recomputation only executes for invalidated dependency branches.
    """

    @classmethod
    def compute_revision_diff(
        cls,
        prior_claims: List[Claim],
        current_items: List[ClearanceItem],
        prior_revision_id: str,
        current_revision_id: str,
        prior_scope: Optional[ResearchScope] = None,
        current_scope: Optional[ResearchScope] = None,
        current_time: Optional[datetime.datetime] = None,
        prior_dispositions: Optional[Dict[str, HumanDisposition]] = None
    ) -> Tuple[List[Claim], Dict[str, int]]:
        
        updated_claims: List[Claim] = []
        prior_item_map = {c.item_string.lower(): c for c in prior_claims}
        current_item_map = {i.item_string.lower(): i for i in current_items}

        now_utc = current_time or datetime.datetime.now(datetime.timezone.utc)

        retained_count = 0
        invalidated_count = 0
        stale_script_count = 0
        stale_scope_count = 0
        stale_age_count = 0
        stale_policy_count = 0
        disposition_violations = 0
        new_count = 0

        effective_prior_scope = prior_scope or (prior_claims[0].scope if prior_claims else ResearchScope())
        effective_current_scope = current_scope or effective_prior_scope

        # Check existing claims against current revision
        for prior_claim in prior_claims:
            key = prior_claim.item_string.lower()
            if key in current_item_map:
                current_item = current_item_map[key]

                # 1. Check Persisted Human Disposition Constraint
                # If previously marked ALTERNATIVE_SELECTED or CHANGE_REQUESTED and reintroduced
                if prior_claim.human_disposition in (HumanDisposition.ALTERNATIVE_SELECTED, HumanDisposition.CHANGE_REQUESTED):
                    violation_claim = prior_claim.model_copy(deep=True)
                    violation_claim.revision_id = current_revision_id
                    violation_claim.state = ClaimState.DISPOSITION_VIOLATION
                    violation_claim.invalidation_reason = (
                        f"Disposition constraint violation: entity '{prior_claim.item_string}' was previously rejected "
                        f"with disposition '{prior_claim.human_disposition.value}'. Note: {prior_claim.disposition_note or 'None'}."
                    )
                    violation_claim.evidence = []
                    violation_claim.occurrences = current_item.occurrences
                    updated_claims.append(violation_claim)
                    invalidated_count += 1
                    disposition_violations += 1
                    continue

                # 2. Check Scope / Territory / Distribution Medium Expansion (Zero-Text Invalidation)
                prior_territories: Set[str] = set(effective_prior_scope.territories if effective_prior_scope else ["US"])
                current_territories: Set[str] = set(effective_current_scope.territories if effective_current_scope else ["US"])
                scope_expanded = not current_territories.issubset(prior_territories)
                medium_changed = (
                    effective_prior_scope and effective_current_scope and 
                    effective_prior_scope.distribution_medium != effective_current_scope.distribution_medium
                )

                if scope_expanded or medium_changed:
                    stale_scope_claim = prior_claim.model_copy(deep=True)
                    stale_scope_claim.revision_id = current_revision_id
                    stale_scope_claim.state = ClaimState.STALE_SCOPE
                    stale_scope_claim.scope = effective_current_scope
                    diff_terrs = current_territories - prior_territories
                    reason_parts = []
                    if diff_terrs:
                        reason_parts.append(f"Territory scope expanded to include: {sorted(list(diff_terrs))}")
                    if medium_changed:
                        reason_parts.append(f"Distribution medium changed to '{effective_current_scope.distribution_medium}'")
                    stale_scope_claim.invalidation_reason = "; ".join(reason_parts)
                    stale_scope_claim.evidence = []
                    stale_scope_claim.occurrences = current_item.occurrences
                    updated_claims.append(stale_scope_claim)
                    invalidated_count += 1
                    stale_scope_count += 1
                    continue

                # 3. Check Freshness TTL & Clearance Policy Version (Zero-Text Invalidation)
                ttl_days = effective_current_scope.freshness_ttl_days if effective_current_scope else 30
                try:
                    claim_created = datetime.datetime.fromisoformat(prior_claim.created_at)
                    if claim_created.tzinfo is None:
                        claim_created = claim_created.replace(tzinfo=datetime.timezone.utc)
                    age_days = (now_utc - claim_created).total_seconds() / 86400.0
                except Exception:
                    age_days = 0.0

                if age_days > ttl_days:
                    stale_age_claim = prior_claim.model_copy(deep=True)
                    stale_age_claim.revision_id = current_revision_id
                    stale_age_claim.state = ClaimState.STALE_AGE
                    stale_age_claim.invalidation_reason = f"Evidence age ({age_days:.1f} days) exceeds freshness TTL ({ttl_days} days)"
                    stale_age_claim.evidence = []
                    stale_age_claim.occurrences = current_item.occurrences
                    updated_claims.append(stale_age_claim)
                    invalidated_count += 1
                    stale_age_count += 1
                    continue

                if effective_prior_scope and effective_current_scope and effective_prior_scope.plan_version != effective_current_scope.plan_version:
                    stale_policy_claim = prior_claim.model_copy(deep=True)
                    stale_policy_claim.revision_id = current_revision_id
                    stale_policy_claim.state = ClaimState.STALE_POLICY
                    stale_policy_claim.invalidation_reason = (
                        f"Clearance research policy version changed from '{effective_prior_scope.plan_version}' "
                        f"to '{effective_current_scope.plan_version}'"
                    )
                    stale_policy_claim.evidence = []
                    stale_policy_claim.occurrences = current_item.occurrences
                    updated_claims.append(stale_policy_claim)
                    invalidated_count += 1
                    stale_policy_count += 1
                    continue

                # 4. Check Contextual Portrayal Mutation vs Structural Movement
                prior_scene_ids = {o.scene_id for o in prior_claim.occurrences} if prior_claim.occurrences else set()
                current_scene_ids = {o.scene_id for o in current_item.occurrences}
                
                prior_snippets = {o.context_snippet.strip() for o in prior_claim.occurrences} if prior_claim.occurrences else set()
                current_snippets = {o.context_snippet.strip() for o in current_item.occurrences}

                if not prior_claim.occurrences or (prior_scene_ids == current_scene_ids and prior_snippets == current_snippets):
                    # Identical context & scenes -> RETAINED
                    retained_claim = prior_claim.model_copy(deep=True)
                    retained_claim.revision_id = current_revision_id
                    retained_claim.state = ClaimState.ACTIVE
                    retained_claim.occurrences = current_item.occurrences
                    retained_claim.invalidation_reason = None
                    updated_claims.append(retained_claim)
                    retained_count += 1
                elif prior_scene_ids != current_scene_ids and prior_snippets == current_snippets:
                    # MOVED (structural scene movement, unchanged dialogue/action context) -> RETAINED
                    retained_claim = prior_claim.model_copy(deep=True)
                    retained_claim.revision_id = current_revision_id
                    retained_claim.state = ClaimState.ACTIVE
                    retained_claim.occurrences = current_item.occurrences
                    retained_claim.invalidation_reason = "Retained: structural scene movement with identical context"
                    updated_claims.append(retained_claim)
                    retained_count += 1
                else:
                    # MODIFIED (contextual portrayal modified) -> STALE_SCRIPT
                    stale_claim = prior_claim.model_copy(deep=True)
                    stale_claim.state = ClaimState.STALE_SCRIPT
                    stale_claim.revision_id = current_revision_id
                    stale_claim.invalidation_reason = "Contextual portrayal modified in revision"
                    stale_claim.evidence = []
                    stale_claim.occurrences = current_item.occurrences
                    updated_claims.append(stale_claim)
                    invalidated_count += 1
                    stale_script_count += 1
            else:
                # 5. REMOVED / SUPERSEDED
                superseded_claim = prior_claim.model_copy(deep=True)
                superseded_claim.state = ClaimState.SUPERSEDED
                superseded_claim.invalidation_reason = "Entity removed from screenplay in current revision"
                updated_claims.append(superseded_claim)
                invalidated_count += 1

        # 6. Check for newly introduced items
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
                    scope=effective_current_scope,
                    occurrences=item.occurrences,
                    invalidation_reason="New entity introduced in current revision"
                )
                updated_claims.append(new_claim)
                new_count += 1

        metrics = {
            "retained_claims": retained_count,
            "invalidated_claims": invalidated_count,
            "stale_script_count": stale_script_count,
            "stale_scope_count": stale_scope_count,
            "stale_age_count": stale_age_count,
            "stale_policy_count": stale_policy_count,
            "disposition_violations": disposition_violations,
            "new_claims": new_count,
            "searches_saved": retained_count
        }

        return updated_claims, metrics

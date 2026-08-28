import uuid
from typing import List, Dict, Any
from app.models.clearance_record import (
    ClearanceItem, Claim, ResearchScope, ResearchOutcome, ClaimState, ItemType
)
from app.services.egress_firewall import ProvenanceEgressFirewall
from app.services.parallel_service import ParallelSearchService
from app.adk.classifier import GeminiClassifier

class ADKGraphOrchestrator:
    """
    Google ADK 2.x Workflow Orchestrator.
    Combines deterministic query planning, Egress Firewall validation,
    Parallel Search API execution, and Gemini evidence classification.
    """

    def __init__(self):
        self.parallel_service = ParallelSearchService()
        self.classifier = GeminiClassifier()

    def process_items(
        self,
        revision_id: str,
        items: List[ClearanceItem],
        scope: ResearchScope
    ) -> List[Claim]:
        
        claims: List[Claim] = []
        session_id = f"sess_{uuid.uuid4().hex[:8]}"

        for item in items:
            # Map item type to a clean, approved search template
            if item.item_type == ItemType.BUSINESS_ORG:
                search_template = "official website business"
            elif item.item_type == ItemType.VENUE_LOCATION:
                search_template = "location venue"
            elif item.item_type in (ItemType.CHARACTER_NAME, ItemType.PERSON_NAME):
                search_template = "person name official"
            elif item.item_type == ItemType.BRAND_PRODUCT:
                search_template = "brand product trademark"
            elif item.item_type == ItemType.MUSIC_REFERENCE:
                search_template = "song music official"
            elif item.item_type == ItemType.MEDIA_WORK:
                search_template = "film media official"
            else:
                search_template = "official website business"

            # Step 1: Egress Firewall Check (Guarantees script privacy)
            outbound_query = ProvenanceEgressFirewall.validate_and_compile_query(
                item_string=item.item_string,
                item_id=item.item_id,
                item_type=item.item_type,
                search_template=search_template,
                scope_territory=scope.territories[0] if scope.territories else "US"
            )

            # Step 2: Execute Parallel Search API (api.parallel.ai)
            search_results = self.parallel_service.execute_search(
                query=outbound_query.query_string,
                session_id=session_id,
                mode="fast"
            )

            # Step 3: Classify Evidence with Verbatim Span Verification
            evidence_records = []
            for res in search_results:
                ev = self.classifier.classify_evidence(
                    item=item,
                    excerpt=res.excerpt,
                    title=res.title,
                    url=res.url,
                    search_id=res.search_id,
                    session_id=session_id
                )
                evidence_records.append(ev)

            # Step 4: Adjudicate Deterministic Outcome
            has_match = any(e.evidence_label == "EXACT_MATCH" and e.is_usable for e in evidence_records)
            usable_evidence_count = sum(1 for e in evidence_records if e.is_usable)
            
            if has_match:
                outcome = ResearchOutcome.MATCH_FOUND
            elif usable_evidence_count > 0:
                outcome = ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE
            else:
                outcome = ResearchOutcome.INSUFFICIENT_COVERAGE

            claim = Claim(
                claim_id=f"claim_{item.item_id}",
                item_id=item.item_id,
                item_string=item.item_string,
                item_type=item.item_type,
                revision_id=revision_id,
                state=ClaimState.ACTIVE,
                outcome=outcome,
                scope=scope,
                queries=[outbound_query.query_string],
                search_ids=[r.search_id for r in search_results],
                evidence=evidence_records
            )
            claims.append(claim)

        return claims

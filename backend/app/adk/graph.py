import uuid
from typing import List, Dict, Any
from app.models.clearance_record import (
    ClearanceItem, Claim, ResearchScope, ResearchOutcome, ClaimState, ItemType, Occurrence
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

    def process_items(
        self,
        revision_id: str,
        items: List[ClearanceItem],
        scope: ResearchScope
    ) -> List[Claim]:
        
        claims: List[Claim] = []
        session_id = f"sess_{uuid.uuid4().hex[:8]}"

        for item in items:
            search_template = "official website business" if item.item_type == ItemType.BUSINESS_ORG else "location venue"
            
            # Step 1: Egress Firewall Check (Guarantees script privacy)
            outbound_query = ProvenanceEgressFirewall.validate_and_compile_query(
                item_string=item.item_string,
                item_id=item.item_id,
                item_type=item.item_type,
                search_template=search_template,
                scope_territory=scope.territories[0] if scope.territories else "US"
            )

            # Step 2: Execute Parallel Search API
            search_results = self.parallel_service.execute_search(
                query=outbound_query.query_string,
                session_id=session_id,
                mode="fast"
            )

            # Step 3: Classify Evidence
            evidence_records = []
            for res in search_results:
                ev = GeminiClassifier.classify_evidence(
                    item=item,
                    excerpt=res.excerpt,
                    title=res.title
                )
                evidence_records.append(ev)

            # Step 4: Adjudicate Deterministic Outcome
            has_match = any(e.evidence_label == "EXACT_MATCH" for e in evidence_records)
            outcome = ResearchOutcome.MATCH_FOUND if has_match else ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE

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

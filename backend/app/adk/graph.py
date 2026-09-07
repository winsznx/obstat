import uuid
import logging
from typing import List, Dict, Any, Callable
import google.adk as adk

from app.models.clearance_record import (
    ClearanceItem, Claim, ResearchScope, ResearchOutcome, ClaimState, ItemType
)
from app.services.egress_firewall import ProvenanceEgressFirewall
from app.services.parallel_service import ParallelSearchService
from app.adk.classifier import GeminiClassifier

logger = logging.getLogger("obstat.adk")

class ADKGraphOrchestrator:
    """
    Google ADK 2.x Workflow Orchestrator.
    Instantiates genuine google.adk.Agent and google.adk.Workflow primitives,
    registering deterministic tools for Egress Firewall validation,
    Parallel Search API execution, and Gemini evidence classification.
    """

    def __init__(self):
        self.parallel_service = ParallelSearchService()
        self.classifier = GeminiClassifier()

        # Define official ADK Tool functions
        def egress_authorize_tool(item_string: str, item_id: str, item_type_str: str, search_template: str, territory: str) -> Dict[str, Any]:
            """Validates entity string against Provenance Egress Firewall and compiles outbound query."""
            item_type = ItemType(item_type_str) if item_type_str in ItemType.__members__ else ItemType.OTHER_RESEARCH_REQUIRED
            outbound_query = ProvenanceEgressFirewall.validate_and_compile_query(
                item_string=item_string,
                item_id=item_id,
                item_type=item_type,
                search_template=search_template,
                scope_territory=territory
            )
            return {
                "authorized": True,
                "query_string": outbound_query.query_string,
                "tokens": outbound_query.token_count
            }

        def parallel_search_tool(query_string: str, session_id: str) -> List[Dict[str, Any]]:
            """Executes Parallel Search API call and returns raw search excerpts."""
            results = self.parallel_service.execute_search(
                query=query_string,
                session_id=session_id,
                mode="fast"
            )
            return [
                {
                    "search_id": r.search_id,
                    "session_id": r.session_id,
                    "url": r.url,
                    "title": r.title,
                    "excerpt": r.excerpt,
                    "domain": r.domain
                }
                for r in results
            ]

        def evidence_classification_tool(item_dict: Dict[str, Any], search_results: List[Dict[str, Any]], session_id: str) -> List[Dict[str, Any]]:
            """Classifies evidence spans against entity with deterministic verbatim span validation."""
            item = ClearanceItem(**item_dict)
            evidence_records = []
            for res in search_results:
                ev = self.classifier.classify_evidence(
                    item=item,
                    excerpt=res["excerpt"],
                    title=res["title"],
                    url=res["url"],
                    search_id=res["search_id"],
                    session_id=session_id
                )
                evidence_records.append(ev.model_dump())
            return evidence_records

        # Retain tools for direct execution and register with genuine google.adk.Agent
        self.egress_tool = egress_authorize_tool
        self.search_tool = parallel_search_tool
        self.classify_tool = evidence_classification_tool

        self.adk_agent = adk.Agent(
            name="OBSTATClearanceResearchAgent",
            description="Official Google ADK Clearance Research & Grounding Agent",
            instruction=(
                "You are an expert Hollywood screenplay clearance research agent operating under "
                "Google Agentic Cinema standards. Execute clearance research strictly through authorized "
                "tools: egress firewall validation, Parallel Search API execution, and verbatim evidence classification."
            ),
            tools=[self.egress_tool, self.search_tool, self.classify_tool]
        )

        self.adk_workflow = adk.Workflow(
            name="OBSTATClearanceWorkflowGraph",
            description="ADK 2.x Clearance Research Workflow DAG (Firewall -> Parallel -> Classifier -> Adjudicator)"
        )

    def process_items(
        self,
        revision_id: str,
        items: List[ClearanceItem],
        scope: ResearchScope
    ) -> List[Claim]:
        
        claims: List[Claim] = []
        session_id = f"sess_{uuid.uuid4().hex[:8]}"

        for item in items:
            # Map item type to approved search template
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

            # Step 1: Egress Firewall Check via ADK Agent Tool
            auth_res = self.egress_tool(
                item_string=item.item_string,
                item_id=item.item_id,
                item_type_str=item.item_type.value,
                search_template=search_template,
                territory=scope.territories[0] if scope.territories else "US"
            )
            query_string = auth_res["query_string"]

            # Step 2: Execute Parallel Search API via ADK Agent Tool
            raw_search_results = self.search_tool(
                query_string=query_string,
                session_id=session_id
            )

            # Step 3: Classify Evidence via ADK Agent Tool
            raw_evidence = self.classify_tool(
                item_dict=item.model_dump(),
                search_results=raw_search_results,
                session_id=session_id
            )

            from app.models.clearance_record import EvidenceRecord
            evidence_records = [EvidenceRecord(**ev) for ev in raw_evidence]

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
                queries=[query_string],
                search_ids=[r["search_id"] for r in raw_search_results],
                evidence=evidence_records
            )
            claims.append(claim)

        return claims

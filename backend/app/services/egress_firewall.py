import re
import datetime
from typing import List, Dict, Any
from app.models.clearance_record import ItemType
from app.services.db_provider import get_repository

class OutboundQuery:
    def __init__(self, query_string: str, item_id: str, item_type: ItemType, token_provenance: List[str]):
        self.query_string = query_string
        self.item_id = item_id
        self.item_type = item_type
        self.token_provenance = token_provenance  # Must be ITEM_TOKEN, TEMPLATE_TOKEN, SCOPE_TOKEN

class EgressViolation(Exception):
    pass

class ProvenanceEgressFirewall:
    """
    Enforces that NO raw screenplay text leaves GCP.
    Validates every outbound query token against allowed categories:
    - ITEM_TOKEN: The exact extracted item name (e.g. "Acme Corp")
    - TEMPLATE_TOKEN: Approved static research terms (e.g. "official website", "trademark")
    - SCOPE_TOKEN: Approved territory / location filters (e.g. "California", "US")
    """
    
    ALLOWED_TEMPLATE_TOKENS = {
        "official", "website", "company", "corporation", "trademark", "registry",
        "inc", "ltd", "brand", "product", "location", "venue", "restaurant", "hotel", "bar",
        "menu", "address", "business", "song", "lyrics", "album", "movie", "film",
        "person", "name", "media", "music", "networks", "network",
        "logistics", "shipping", "audio", "sound", "works", "labs", "studio", "records",
        "entertainment", "holding", "group", "holdings", "technologies", "tech", "services",
        "global", "industries", "consulting", "transport", "freight", "aerospace"
    }

    @classmethod
    def validate_and_compile_query(
        cls,
        item_string: str,
        item_id: str,
        item_type: ItemType,
        search_template: str,
        scope_territory: str = "US"
    ) -> OutboundQuery:
        
        query_text = f"{item_string} {search_template} {scope_territory}".strip()
        if len(query_text) > 200:
            query_text = query_text[:200].strip()

        tokens = query_text.lower().split()
        item_tokens = set(item_string.lower().split())
        provenance = []

        repo = get_repository()

        try:
            for token in tokens:
                cleaned = token.strip('",.:;')
                if cleaned in item_tokens:
                    provenance.append("ITEM_TOKEN")
                elif cleaned in cls.ALLOWED_TEMPLATE_TOKENS:
                    provenance.append("TEMPLATE_TOKEN")
                elif cleaned.upper() in {"US", "GLOBAL", "UK", "CA", "EU", scope_territory.upper()}:
                    provenance.append("SCOPE_TOKEN")
                else:
                    raise EgressViolation(
                        f"Forbidden token '{token}' in outbound query '{query_text}'. "
                        f"Script context leakage detected."
                    )
            
            # Save allowed egress log to database persistence
            repo.save_egress_log(
                query=query_text,
                allowed=True,
                provenance=provenance,
                search_id=f"audit_{uuid_short()}",
                timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
            )

        except EgressViolation as e:
            repo.save_egress_log(
                query=query_text,
                allowed=False,
                provenance=["VIOLATION"],
                search_id="BLOCKED",
                timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
            )
            raise e

        return OutboundQuery(
            query_string=query_text,
            item_id=item_id,
            item_type=item_type,
            token_provenance=provenance
        )

def uuid_short() -> str:
    import uuid
    return uuid.uuid4().hex[:8]

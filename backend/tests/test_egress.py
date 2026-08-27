import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.egress_firewall import ProvenanceEgressFirewall, EgressViolation
from app.models.clearance_record import ItemType

class TestEgressFirewall(unittest.TestCase):
    def test_egress_firewall_valid_query(self):
        outbound = ProvenanceEgressFirewall.validate_and_compile_query(
            item_string="Acme Corp",
            item_id="item_001",
            item_type=ItemType.BUSINESS_ORG,
            search_template="official website business",
            scope_territory="US"
        )
        self.assertEqual(outbound.item_id, "item_001")
        self.assertIn("Acme Corp", outbound.query_string)
        self.assertIn("ITEM_TOKEN", outbound.token_provenance)

    def test_egress_firewall_forbidden_token(self):
        with self.assertRaises(EgressViolation):
            ProvenanceEgressFirewall.validate_and_compile_query(
                item_string="Acme Corp",
                item_id="item_001",
                item_type=ItemType.BUSINESS_ORG,
                search_template="secret script line dialogue murder scene",
                scope_territory="US"
            )

if __name__ == '__main__':
    unittest.main()

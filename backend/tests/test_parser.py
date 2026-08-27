import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.screenplay_parser import ScreenplayParser

class TestScreenplayParser(unittest.TestCase):
    def test_screenplay_parser(self):
        sample_script = """INT. COFFEE SHOP - DAY

ALICE enters the coffee shop and approaches ACME CORP counter.

EXT. STREET - NIGHT

BOB meets ALICE outside STARLIGHT LOUNGE."""
        parsed = ScreenplayParser.parse_text(sample_script, title="Test Script")
        self.assertEqual(parsed.title, "Test Script")
        self.assertEqual(len(parsed.scenes), 2)
        self.assertIn("COFFEE SHOP", parsed.scenes[0].header)
        self.assertIn("STARLIGHT LOUNGE", parsed.scenes[1].text)

if __name__ == '__main__':
    unittest.main()

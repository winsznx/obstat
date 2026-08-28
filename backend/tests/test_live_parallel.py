import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.parallel_service import ParallelSearchService

class TestLiveParallelSearch(unittest.TestCase):

    def test_single_search_call_proof(self):
        # Read PARALLEL_API_KEY from env
        api_key = os.getenv("PARALLEL_API_KEY")
        if not api_key:
            self.skipTest("Skipping live search call test since PARALLEL_API_KEY is not defined in this terminal environment context.")
            return

        service = ParallelSearchService(api_key=api_key)
        session_id = "test_run_proof_session"
        
        try:
            # Execute one search query
            results = service.execute_search(
                query="Acme Corporation business",
                session_id=session_id,
                mode="fast"
            )
            
            # Print search metadata metrics to output channel safely
            print("\n=== LIVE PARALLEL API PROOF SUCCESS ===")
            print(f"Result count: {len(results)}")
            if len(results) > 0:
                first = results[0]
                print(f"Search ID: {first.search_id}")
                print(f"Session ID: {first.session_id}")
                print(f"First Domain: {first.domain}")
                print(f"Timestamp: {first.retrieved_at}")
            print("=======================================\n")
            
            self.assertGreater(len(results), 0)
            
        except Exception as e:
            self.fail(f"Live Parallel Search call failed with error: {e}")

if __name__ == '__main__':
    unittest.main()

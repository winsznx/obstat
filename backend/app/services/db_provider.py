import os
from app.services.sqlite_repo import SQLiteRepository
from app.services.firestore_repo import FirestoreRepository

def get_repository():
    """
    Factory function to initialize and return the correct storage repository provider.
    Defaults to SQLite for local development and unit tests, and switches to Firestore
    when GOOGLE_GENAI_USE_ENTERPRISE or GOOGLE_CLOUD_PROJECT is configured.
    """
    if os.getenv("GOOGLE_GENAI_USE_ENTERPRISE") == "True" or os.getenv("GOOGLE_CLOUD_PROJECT"):
        try:
            return FirestoreRepository()
        except Exception as e:
            # Fall back safely to local repository context if Firestore initialization errors out
            pass
    return SQLiteRepository()

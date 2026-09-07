import os
import logging
from app.services.sqlite_repo import SQLiteRepository
from app.services.firestore_repo import FirestoreRepository

logger = logging.getLogger("obstat.db_provider")

def get_repository():
    """
    Factory function to initialize and return the correct storage repository provider.
    Defaults to SQLite for local development and unit tests, and switches to Firestore
    when DB_TYPE == "FIRESTORE" or GOOGLE_CLOUD_PROJECT or GCP_PROJECT is configured.
    """
    db_type = os.getenv("DB_TYPE", "").upper()
    gcp_project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")

    if db_type == "FIRESTORE" or os.getenv("GOOGLE_GENAI_USE_ENTERPRISE") == "True":
        try:
            return FirestoreRepository()
        except Exception as e:
            logger.error(f"Firestore initialization failed: {e}", exc_info=True)
            if db_type == "FIRESTORE":
                raise RuntimeError(f"DB_TYPE is set to FIRESTORE but FirestoreRepository initialization failed: {e}") from e
    elif gcp_project and os.getenv("OBSTAT_MODE") == "PRODUCTION":
        try:
            return FirestoreRepository()
        except Exception as e:
            logger.error(f"Firestore initialization failed: {e}", exc_info=True)
            raise RuntimeError(f"Production mode on GCP requires Firestore: {e}") from e

    return SQLiteRepository()

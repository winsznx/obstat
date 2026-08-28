import json
import uuid
import datetime
from app.models.clearance_record import (
    Project, Revision, ClearanceItem, Claim, ResearchScope, ItemType, Occurrence, 
    HumanDisposition, ResearchOutcome, ClaimState, EvidenceRecord, EvidenceLabel
)
from app.services.repository import StorageRepository

DRAFT_12_TEXT = """INT. RECORD RECORDING STUDIO - DAY

A cozy room filled with vinyl record crates and vintage analog gear.

MERCER VALE (40s) stands near the turntables, adjusting a microphone stand.

                    MERCER VALE
The sound must be authentic. We cannot let the evidence silently dissolve.

He examines a demo tape labeled "VELA RECORDS - MASTER CUT 1984".

EXT. RECORD RECORDING STUDIO - CONTINUOUS

Rain falls gently over the studio entrance at 440 SOUND AVENUE.
"""

DRAFT_13_TEXT = """INT. RECORD RECORDING STUDIO - DAY

A cozy room filled with vinyl record crates and vintage analog gear.

MERCER VALE RECORDS (40s) stands near the turntables, adjusting a microphone stand.

                    MERCER VALE RECORDS
The sound must be authentic. We cannot let the evidence silently dissolve.

He examines a demo tape labeled "VELA RECORDS - MASTER CUT 1984".

EXT. RECORD RECORDING STUDIO - CONTINUOUS

Rain falls gently over the studio entrance at 440 SOUND AVENUE.
"""

def seed_default_productions(repo: StorageRepository):
    # Check if The Starlight Heist already exists
    existing = repo.list_projects()
    for p in existing:
        if p.title in ["The Starlight Heist", "Northern Line", "Soft Landing"]:
            return  # Already seeded

    # Create 1. The Starlight Heist
    proj_id = "proj_starlight_01"
    proj = Project(
        project_id=proj_id,
        title="The Starlight Heist",
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        default_scope=ResearchScope(
            territories=["US", "GLOBAL"],
            production_country="US",
            distribution_medium="THEATRICAL_AND_STREAMING",
            plan_version="v3.2",
            freshness_ttl_days=30
        ),
        active_revision_id="rev_starlight_13"
    )
    repo.save_project(proj)

    # Draft 12 Revision
    rev_12 = Revision(
        revision_id="rev_starlight_12",
        project_id=proj_id,
        title="The Starlight Heist",
        draft_label="Draft 12",
        file_name="Starlight_Heist_Draft_12.txt",
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        total_scenes=2,
        total_pages=2
    )
    repo.save_revision(rev_12, raw_text=DRAFT_12_TEXT)

    # Draft 13 Revision
    rev_13 = Revision(
        revision_id="rev_starlight_13",
        project_id=proj_id,
        title="The Starlight Heist",
        draft_label="Draft 13",
        file_name="Starlight_Heist_Draft_13.txt",
        sha256="4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
        total_scenes=2,
        total_pages=2
    )
    repo.save_revision(rev_13, raw_text=DRAFT_13_TEXT)

    # Claims for Draft 12 (All Complete!)
    claim_mercer_12 = Claim(
        claim_id="claim_d12_mercer",
        item_id="item_mercer",
        item_string="MERCER VALE",
        item_type=ItemType.CHARACTER_NAME,
        revision_id="rev_starlight_12",
        state=ClaimState.ACTIVE,
        outcome=ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE,
        scope=proj.default_scope,
        queries=["MERCER VALE person name official US", "MERCER VALE biography entertainment US"],
        search_ids=["search_88fa1091", "search_88fa1092"],
        occurrences=[
            Occurrence(
                revision_id="rev_starlight_12",
                scene_id="SC_001",
                page_number=1,
                line_offset=6,
                occurrence_text="MERCER VALE",
                context_snippet="MERCER VALE (40s) stands near the turntables..."
            )
        ],
        evidence=[
            EvidenceRecord(
                evidence_id="ev_d12_01",
                parallel_search_id="search_88fa1091",
                session_id="sess_d12",
                url="https://apps.sos.wv.gov/elections/Officials",
                title="West Virginia Elected Officials Directory",
                excerpt="County government rosters for Mercer County administrative offices.",
                domain="apps.sos.wv.gov",
                evidence_label=EvidenceLabel.UNUSABLE_EVIDENCE,
                quoted_match_span=None,
                validation_status="UNUSABLE_SPAN_ABSENT",
                is_usable=False
            )
        ],
        human_disposition=HumanDisposition.PROCEED_PER_COUNSEL,
        disposition_note="Verified fictional character name; zero real-world individual collision in scope."
    )

    claim_studio_12 = Claim(
        claim_id="claim_d12_studio",
        item_id="item_studio",
        item_string="RECORD RECORDING STUDIO",
        item_type=ItemType.VENUE_LOCATION,
        revision_id="rev_starlight_12",
        state=ClaimState.ACTIVE,
        outcome=ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE,
        scope=proj.default_scope,
        queries=["RECORD RECORDING STUDIO location venue US"],
        search_ids=["search_88fa1093"],
        occurrences=[
            Occurrence(
                revision_id="rev_starlight_12",
                scene_id="SC_001",
                page_number=1,
                line_offset=1,
                occurrence_text="RECORD RECORDING STUDIO",
                context_snippet="INT. RECORD RECORDING STUDIO - DAY"
            )
        ],
        evidence=[],
        human_disposition=HumanDisposition.PROCEED_PER_COUNSEL,
        disposition_note="Generic fictional location header."
    )

    claim_vela_12 = Claim(
        claim_id="claim_d12_vela",
        item_id="item_vela",
        item_string="VELA RECORDS",
        item_type=ItemType.BUSINESS_ORG,
        revision_id="rev_starlight_12",
        state=ClaimState.ACTIVE,
        outcome=ResearchOutcome.MATCH_FOUND,
        scope=proj.default_scope,
        queries=["VELA RECORDS official website business US"],
        search_ids=["search_88fa1094"],
        occurrences=[
            Occurrence(
                revision_id="rev_starlight_12",
                scene_id="SC_001",
                page_number=1,
                line_offset=11,
                occurrence_text="VELA RECORDS",
                context_snippet="He examines a demo tape labeled 'VELA RECORDS - MASTER CUT 1984'."
            )
        ],
        evidence=[
            EvidenceRecord(
                evidence_id="ev_d12_vela_01",
                parallel_search_id="search_88fa1094",
                session_id="sess_d12",
                url="https://velarecords.com",
                title="Vela Records | Independent Record Label",
                excerpt="Vela Records is an independent record label established in 1998 in California.",
                domain="velarecords.com",
                evidence_label=EvidenceLabel.EXACT_MATCH,
                quoted_match_span="Vela Records",
                validation_status="VERIFIED_VERBATIM",
                is_usable=True
            )
        ],
        human_disposition=HumanDisposition.PERMISSION_REQUIRED,
        disposition_note="Clearance coordinator reached out to rights holder for sync license."
    )

    claim_sound_ave_12 = Claim(
        claim_id="claim_d12_sound_ave",
        item_id="item_sound_ave",
        item_string="440 SOUND AVENUE",
        item_type=ItemType.ADDRESS,
        revision_id="rev_starlight_12",
        state=ClaimState.ACTIVE,
        outcome=ResearchOutcome.NO_MATCH_FOUND_IN_SCOPE,
        scope=proj.default_scope,
        queries=["440 SOUND AVENUE address registry US"],
        search_ids=["search_88fa1095"],
        occurrences=[
            Occurrence(
                revision_id="rev_starlight_12",
                scene_id="SC_002",
                page_number=2,
                line_offset=16,
                occurrence_text="440 SOUND AVENUE",
                context_snippet="Rain falls gently over the studio entrance at 440 SOUND AVENUE."
            )
        ],
        evidence=[],
        human_disposition=HumanDisposition.PROCEED_PER_COUNSEL,
        disposition_note="Fictional non-existent street address in US jurisdiction."
    )

    repo.save_claims([claim_mercer_12, claim_studio_12, claim_vela_12, claim_sound_ave_12])

    # Claims for Draft 13 (Demonstrating Stale Invalidation Moat!)
    # MERCER VALE renamed to MERCER VALE RECORDS -> Stale!
    claim_mercer_13 = Claim(
        claim_id="claim_d13_mercer_records",
        item_id="item_mercer_records",
        item_string="MERCER VALE RECORDS",
        item_type=ItemType.BUSINESS_ORG,
        revision_id="rev_starlight_13",
        state=ClaimState.STALE_SCRIPT,
        outcome=ResearchOutcome.INSUFFICIENT_COVERAGE,
        scope=proj.default_scope,
        queries=["MERCER VALE RECORDS official website business US"],
        search_ids=["search_88fa1096"],
        occurrences=[
            Occurrence(
                revision_id="rev_starlight_13",
                scene_id="SC_001",
                page_number=1,
                line_offset=6,
                occurrence_text="MERCER VALE RECORDS",
                context_snippet="MERCER VALE RECORDS (40s) stands near the turntables..."
            )
        ],
        evidence=[
            EvidenceRecord(
                evidence_id="ev_d13_01",
                parallel_search_id="search_88fa1096",
                session_id="sess_d13",
                url="https://mercertwpbutler.com",
                title="Mercer Township Government Services",
                excerpt="Municipal ordinances and town council records for Mercer County.",
                domain="mercertwpbutler.com",
                evidence_label=EvidenceLabel.UNUSABLE_EVIDENCE,
                quoted_match_span=None,
                validation_status="UNUSABLE_SPAN_ABSENT",
                is_usable=False
            ),
            EvidenceRecord(
                evidence_id="ev_d13_02",
                parallel_search_id="search_88fa1096",
                session_id="sess_d13",
                url="https://www.mercer.com",
                title="Mercer | Welcome to brighter",
                excerpt="Mercer provides global consulting services in health, wealth and career solutions.",
                domain="mercer.com",
                evidence_label=EvidenceLabel.UNUSABLE_EVIDENCE,
                quoted_match_span=None,
                validation_status="UNUSABLE_SPAN_ABSENT",
                is_usable=False
            )
        ],
        human_disposition=None,
        disposition_note="Previous Draft 12 character clearance invalidated. Re-research required for new corporate entity."
    )

    # Retained claims
    claim_studio_13 = claim_studio_12.model_copy(deep=True)
    claim_studio_13.revision_id = "rev_starlight_13"
    claim_studio_13.state = ClaimState.ACTIVE

    claim_vela_13 = claim_vela_12.model_copy(deep=True)
    claim_vela_13.revision_id = "rev_starlight_13"
    claim_vela_13.state = ClaimState.ACTIVE

    claim_sound_ave_13 = claim_sound_ave_12.model_copy(deep=True)
    claim_sound_ave_13.revision_id = "rev_starlight_13"
    claim_sound_ave_13.state = ClaimState.ACTIVE

    repo.save_claims([claim_mercer_13, claim_studio_13, claim_vela_13, claim_sound_ave_13])

    # Create 2. Northern Line (TV Series Pilot)
    proj_2 = Project(
        project_id="proj_northern_02",
        title="Northern Line",
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        default_scope=ResearchScope(
            territories=["UK", "GLOBAL"],
            production_country="UK",
            distribution_medium="BROADCAST_AND_VOD",
            plan_version="v3.2",
            freshness_ttl_days=30
        ),
        active_revision_id="rev_northern_04"
    )
    repo.save_project(proj_2)

    rev_northern_04 = Revision(
        revision_id="rev_northern_04",
        project_id="proj_northern_02",
        title="Northern Line",
        draft_label="Draft 4",
        file_name="Northern_Line_Pilot_Draft_4.txt",
        sha256="7c5b1e94b2e8a1f4c781a98e2b6a51d9e2b4f8c1a6e9d2b7a4c8e1f5a9b2d6e3",
        total_scenes=14,
        total_pages=32
    )
    repo.save_revision(rev_northern_04, raw_text="INT. CAMDEN UNDERGROUND STATION - NIGHT\n\nALISTAIR VANE (35) waits on the platform.")

    # Create 3. Soft Landing (Indie Feature)
    proj_3 = Project(
        project_id="proj_soft_03",
        title="Soft Landing",
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        default_scope=ResearchScope(
            territories=["US", "CA"],
            production_country="US",
            distribution_medium="THEATRICAL_AND_STREAMING",
            plan_version="v3.2",
            freshness_ttl_days=30
        ),
        active_revision_id="rev_soft_08"
    )
    repo.save_project(proj_3)

    rev_soft_08 = Revision(
        revision_id="rev_soft_08",
        project_id="proj_soft_03",
        title="Soft Landing",
        draft_label="Draft 8",
        file_name="Soft_Landing_Draft_8.txt",
        sha256="9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
        total_scenes=28,
        total_pages=58
    )
    repo.save_revision(rev_soft_08, raw_text="EXT. BIG SUR HIGHWAY - DUSK\n\nELENA ROQUE drives the vintage convertible toward the coast.")

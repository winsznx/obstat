import re
import uuid
from typing import List
from app.models.clearance_record import ClearanceItem, ItemType, Occurrence


# Business/org name: requires a Title Case word before a corp suffix
# so plain lowercase nouns like "vinyl record crates" don't match
CORP_PREFIX = re.compile(
    r'\b([A-Z][A-Za-z&\'\-]+(?:\s+[A-Z][A-Za-z&\'\-]+){0,4})\s+(?:Inc\.?|LLC\.?|Ltd\.?|Corp\.?|Co\.?|Group|Studios?|Records?|Entertainment|Productions?|Media|Films?|Networks?|Brands?|Industries)\b'
)

# Screenplay character cue: ALL CAPS line (optionally with (V.O.) / (O.S.))
CHAR_CUE = re.compile(r'^[ \t]{10,}([A-Z][A-Z0-9 \'\-\.]{1,40})(?:\s*\((?:V\.O\.|O\.S\.|O\.C\.|CONT\'D)\))?\s*$')

# Scene header line
SCENE_HEADER = re.compile(r'^\s*(?:INT\.|EXT\.|INT/EXT\.|EXT/INT\.)\s+(.+)', re.IGNORECASE)

# Inline proper noun (Title Case words >= 2 chars, not common words)
PROPER_NOUN = re.compile(r'\b([A-Z][a-z]{1,}(?:\s+[A-Z][a-z]{1,}){1,5})\b')

STOPWORDS = {
    'The', 'A', 'An', 'And', 'Or', 'But', 'In', 'On', 'At', 'To', 'For',
    'Of', 'By', 'With', 'From', 'Is', 'Are', 'Was', 'Were', 'Be', 'Been',
    'Have', 'Has', 'Had', 'Do', 'Does', 'Did', 'Will', 'Would', 'Could',
    'Should', 'May', 'Might', 'Must', 'Shall', 'Can', 'Not', 'No', 'So',
    'As', 'If', 'Then', 'That', 'This', 'These', 'Those', 'He', 'She',
    'They', 'We', 'You', 'It', 'His', 'Her', 'Their', 'Our', 'Its', 'My',
    'Your', 'Day', 'Night', 'Morning', 'Later', 'Back', 'Scene',
}


class GeminiExtractor:
    """
    Deterministic Screenplay Clearance Extractor.
    Uses fast regex-based extraction to identify clearance-relevant entities
    without any external API calls. This ensures instant processing and
    eliminates hallucination risk from LLM-based extraction.

    Entities extracted:
    - Character names (from screenplay cue formatting + ALL CAPS in action)
    - Business/org names (Title Case + corp suffix indicators)
    - Venue/locations (from scene headers)
    - Proper nouns (Title Case multi-word phrases in dialogue/action)
    """

    def __init__(self, **kwargs):
        # Accept kwargs for compatibility but ignore - no API keys needed
        pass

    def extract_clearance_items(self, screenplay_text: str, revision_id: str) -> List[ClearanceItem]:
        lines = screenplay_text.splitlines()
        items: List[ClearanceItem] = []
        seen: set = set()

        def add_item(name: str, item_type: ItemType, scene_id: str, page: int, line_num: int, occurrence: str, snippet: str):
            key = (name.strip().upper(), item_type)
            if key in seen or len(name.strip()) < 3:
                return
            seen.add(key)
            items.append(ClearanceItem(
                item_id=f"item_{uuid.uuid4().hex[:8]}",
                item_string=name.strip(),
                item_type=item_type,
                occurrences=[Occurrence(
                    revision_id=revision_id,
                    scene_id=scene_id,
                    page_number=page,
                    line_offset=line_num,
                    occurrence_text=occurrence.strip()[:120],
                    context_snippet=snippet.strip()[:200]
                )]
            ))

        current_scene = "SC_000"
        scene_count = 0
        lines_per_page = 55

        for line_num, line in enumerate(lines, start=1):
            page = max(1, (line_num // lines_per_page) + 1)
            snippet = line.strip()

            # --- Scene headers -> VENUE_LOCATION ---
            scene_match = SCENE_HEADER.match(line)
            if scene_match:
                scene_count += 1
                current_scene = f"SC_{scene_count:03d}"
                location_text = scene_match.group(1)
                # Strip time-of-day suffixes
                location_text = re.sub(
                    r'\s*[-\u2013]\s*(DAY|NIGHT|MORNING|EVENING|DUSK|DAWN|CONTINUOUS|LATER)\s*$',
                    '', location_text, flags=re.IGNORECASE
                ).strip()
                if location_text:
                    add_item(location_text, ItemType.VENUE_LOCATION, current_scene, page, line_num, location_text, snippet)
                continue

            # --- Character cues -> CHARACTER_NAME ---
            char_match = CHAR_CUE.match(line)
            if char_match:
                char_name = char_match.group(1).strip()
                if char_name not in ('CONTINUED', 'CUT TO', 'FADE OUT', 'FADE IN', 'THE END', 'SMASH CUT'):
                    add_item(char_name, ItemType.CHARACTER_NAME, current_scene, page, line_num, char_name, snippet)
                continue

            # --- Business / org names anywhere in line (Title Case + corp suffix) ---
            for m in CORP_PREFIX.finditer(line):
                org_name = m.group(0).strip()
                add_item(org_name, ItemType.BUSINESS_ORG, current_scene, page, line_num, org_name, snippet)

            # --- Inline ALL-CAPS proper nouns in action lines (e.g. "MERCER VALE") ---
            all_caps_words = re.findall(r'\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b', line)
            for phrase in all_caps_words:
                words = phrase.split()
                if len(words) == 1 and phrase in {
                    'INT', 'EXT', 'CUT', 'FADE', 'DAY', 'NIGHT', 'CONTINUED',
                    'DISSOLVE', 'SMASH', 'BACK', 'THE', 'OF', 'A', 'AND', 'OR'
                }:
                    continue
                if len(phrase) >= 4:
                    add_item(phrase, ItemType.CHARACTER_NAME, current_scene, page, line_num, phrase, snippet)

            # --- Title-case proper nouns in action/dialogue ---
            for m in PROPER_NOUN.finditer(line):
                noun = m.group(1)
                words = noun.split()
                if any(w in STOPWORDS for w in words):
                    continue
                if len(noun) >= 5 and len(words) >= 2:
                    add_item(noun, ItemType.PERSON_NAME, current_scene, page, line_num, noun, snippet)

        return items

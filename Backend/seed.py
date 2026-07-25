"""
Load Backend/definitions/*.json into Firestore.

    ./.venv/bin/python seed.py                    write
    ./.venv/bin/python seed.py --dry-run          preview
    ./.venv/bin/python seed.py --prune            also delete definition docs not in the JSON
    ./.venv/bin/python seed.py --purge-runs --yes also delete all collected run data

--prune only touches the collections listed in COLLECTIONS. --purge-runs is
never implied by --prune and additionally requires --yes.
"""

import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

from firebase_config import db

BASE = Path(__file__).parent
DEFS_DIR = BASE / "definitions"
SCHEMA_PATH = BASE / "schema" / "definitions.schema.json"

# (firestore collection, definitions/<file>.json, $defs key in the schema)
COLLECTIONS = [
    ("caseStudies", "case_studies", "caseStudy"),
    ("taskTrials", "task_trials", "taskTrial"),
    ("probeQuestions", "probe_questions", "probeQuestion"),
    ("assessmentItems", "assessment_items", "assessmentItem"),
    ("protocols", "protocols", "protocol"),
]

RUN_COLLECTIONS = ["sessions", "emotion_records"]


def load():
    schema = json.loads(SCHEMA_PATH.read_text())
    data = {
        collection: json.loads((DEFS_DIR / f"{filename}.json").read_text())
        for collection, filename, _ in COLLECTIONS
    }
    return schema, data


def validate_shapes(schema, data):
    errors = []
    for collection, _, def_key in COLLECTIONS:
        validator = Draft202012Validator(
            {"$ref": f"#/$defs/{def_key}", "$defs": schema["$defs"]}
        )
        for doc_id, doc in data[collection].items():
            for err in validator.iter_errors(doc):
                where = ".".join(str(p) for p in err.absolute_path) or "(root)"
                errors.append(f"{collection}/{doc_id} {where}: {err.message}")
    return errors


def validate_references(data):
    """Cross-document checks. JSON Schema cannot express these."""
    errors = []
    cases = data["caseStudies"]
    trials = data["taskTrials"]
    probes = data["probeQuestions"]
    items = data["assessmentItems"]

    for trial_id, trial in trials.items():
        if trial["caseStudyId"] not in cases:
            errors.append(f"taskTrials/{trial_id} -> missing caseStudies/{trial['caseStudyId']}")
        speakers = sorted(a["speaker"] for a in trial["assertions"])
        if speakers != ["peer", "tutor"]:
            errors.append(f"taskTrials/{trial_id} needs one peer and one tutor assertion, got {speakers}")
        if trial["correctKey"] not in trial["choices"]:
            errors.append(f"taskTrials/{trial_id} correctKey not among its choices")

    for case_id, case in cases.items():
        owned = [t for t in trials.values() if t["caseStudyId"] == case_id]
        if len(owned) != case["trialCount"]:
            errors.append(
                f"caseStudies/{case_id} declares trialCount={case['trialCount']} but {len(owned)} trials exist"
            )
        indexes = sorted(t["index"] for t in owned)
        if indexes != list(range(len(owned))):
            errors.append(f"caseStudies/{case_id} trial indexes not contiguous from 0: {indexes}")

    for item_id, item in items.items():
        if item["correctKey"] not in item["choices"]:
            errors.append(f"assessmentItems/{item_id} correctKey not among its choices")

    for version, protocol in data["protocols"].items():
        for probe_id in protocol["probeIds"]:
            if probe_id not in probes:
                errors.append(f"protocols/{version} -> missing probeQuestions/{probe_id}")
        for stage, stage_ids in protocol["assessmentItemIds"].items():
            for item_id in stage_ids:
                if item_id not in items:
                    errors.append(f"protocols/{version} -> missing assessmentItems/{item_id}")
                elif items[item_id]["stage"] != stage:
                    errors.append(
                        f"protocols/{version} lists {item_id} under {stage} "
                        f"but its stage is {items[item_id]['stage']}"
                    )
        for case_id in protocol["caseStudyIds"]:
            if case_id not in cases:
                errors.append(f"protocols/{version} -> missing caseStudies/{case_id}")

    return errors


def delete_recursive(doc_ref, dry_run):
    """Firestore does not cascade: subcollections outlive a deleted parent."""
    count = 0
    for sub in doc_ref.collections():
        for child in sub.stream():
            count += delete_recursive(child.reference, dry_run)
    if not dry_run:
        doc_ref.delete()
    return count + 1


def main():
    argv = sys.argv[1:]
    dry_run = "--dry-run" in argv
    prune = "--prune" in argv
    purge_runs = "--purge-runs" in argv
    confirmed = "--yes" in argv

    if purge_runs and not confirmed and not dry_run:
        print("--purge-runs deletes collected data and requires --yes (or --dry-run to preview).")
        return 1

    schema, data = load()

    errors = validate_shapes(schema, data) + validate_references(data)
    if errors:
        print(f"Validation failed ({len(errors)}) — nothing written:\n")
        for err in errors:
            print(f"  - {err}")
        return 1

    verb = "would" if dry_run else ""

    if prune:
        for collection, _, _ in COLLECTIONS:
            known = set(data[collection])
            for doc in db.collection(collection).stream():
                if doc.id not in known:
                    n = delete_recursive(doc.reference, dry_run)
                    print(f"{verb}prune   {collection}/{doc.id} ({n} doc(s))")

    if purge_runs:
        for collection in RUN_COLLECTIONS:
            for doc in db.collection(collection).stream():
                n = delete_recursive(doc.reference, dry_run)
                print(f"{verb}purge   {collection}/{doc.id} ({n} doc(s) incl. subcollections)")

    written = 0
    for collection, _, _ in COLLECTIONS:
        for doc_id, doc in data[collection].items():
            if not dry_run:
                db.collection(collection).document(doc_id).set(doc)
            print(f"{verb}write   {collection}/{doc_id}")
            written += 1

    print(f"\n{'Would write' if dry_run else 'Wrote'} {written} documents.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from firebase_admin import firestore
from predict import predict_emotion
from chatbot import get_chatbot_response, get_flashcard
from auth import auth_required
from encryption import encrypt, decrypt
from firebase_config import db

import jwt
from jwt_utils import generate_jwt
import os
import shutil
import subprocess
import bcrypt
from datetime import datetime, timedelta, timezone
from werkzeug.utils import secure_filename


app = Flask(__name__)
CORS(app)

# Two forms, deliberately. The absolute one is for touching the filesystem; the
# relative one is what gets stored, because an absolute path records the layout
# of whichever machine happened to run the server and is wrong everywhere else.
VIDEO_SUBDIR = os.path.join("uploads", "videos")
VIDEO_DIR = os.path.join(os.path.dirname(__file__), VIDEO_SUBDIR)


### USERS

@app.route("/users", methods=["GET"])
@auth_required
def get_all_users():
    users_ref = db.collection('users')
    docs = users_ref.stream()
    users = []
    for doc in docs:
        data = doc.to_dict()
        users.append(data)
    return jsonify(users), 200

@app.route("/users/<user_id>", methods=["GET"])
@auth_required
def get_user(user_id):
    doc_ref = db.collection('users').document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "user not found"}), 404
    user_data = doc.to_dict()
    user_data["id"] = doc.id
    if "name" in user_data:
        user_data["name"] = decrypt(user_data["name"])
    if "email" in user_data:
        user_data["email"] = decrypt(user_data["email"])
    return jsonify(user_data), 200

@app.route("/users", methods=["POST"])
@auth_required
def add_user():
    data = request.get_json()
    if "name" in data:
        data["name"] = encrypt(data["name"])
    if "email" in data:
        data["email"] = encrypt(data["email"])
    db.collection('users').add(data)
    return jsonify({"message": "user added"}), 201

@app.route("/users/<user_id>", methods=["PUT"])
@auth_required
def modify_user(user_id):
    data = request.get_json()
    doc_ref = db.collection("users").document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"message": "document not exist"}), 404
    if "name" in data:
        data["name"] = encrypt(data["name"])
    if "email" in data:
        data["email"] = encrypt(data["email"])
    doc_ref.update(data)
    return jsonify({"message": "user successfully updated"}), 200

@app.route("/users/<user_id>", methods=["DELETE"])
@auth_required
def delete_user(user_id):
    doc_ref = db.collection("users").document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"message": "document not found"}), 404
    doc_ref.delete()
    return jsonify({"message": "user successfully deleted"}), 200


### SESSIONS

@app.route("/sessions", methods=["GET"])
@auth_required
def get_all_sessions():
    sessions_ref = db.collection('sessions')
    docs = sessions_ref.stream()
    sessions = []
    for session in docs:
        data = session.to_dict()
        data["id"] = session.id
        if "video_url" in data:
            data["video_url"] = decrypt(data["video_url"])
        sessions.append(data)
    return jsonify(sessions), 200

def session_owned_by_caller(session_id):
    """
    (doc_ref, error_response) for a session the caller is allowed to write.

    Session ids are chosen by the client so that writes can be idempotent, which
    means they are also guessable — and /sessions lists them. Without this check
    any authenticated user could address another participant's run: overwrite
    their consent, file answers under their id, or (since userId is stamped from
    the caller's token) reassign the run to themselves. Ownership is checked
    rather than forbidding overwrite outright, because a repeated write from the
    run's own owner is a retry, not an attack.
    """
    doc_ref = db.collection("sessions").document(session_id)
    snapshot = doc_ref.get()

    if snapshot.exists:
        owner = (snapshot.to_dict() or {}).get("userId")
        if owner != g.current_user_id:
            return None, (jsonify({"error": "forbidden"}), 403)

    return doc_ref, None


@app.route("/sessions", methods=["POST"])
@auth_required
def add_session():
    # The client names the session, rather than Firestore generating an id the
    # client never learns: responses are posted to /sessions/<id>/responses, so
    # the app has to know the id before it can write anything. The id is derived
    # from the run's seed, so it is reproducible, and set() rather than add()
    # makes a retried create idempotent instead of leaving a duplicate run.
    data = request.get_json()
    session_id = data.pop("id", None)
    if not session_id:
        return jsonify({"error": "id is required"}), 400

    doc_ref, error = session_owned_by_caller(session_id)
    if error:
        return error

    # Stamped from the token, never taken from the body — a client should not be
    # able to file a run under someone else's account.
    data["userId"] = g.current_user_id

    if "video_url" in data:
        data["video_url"] = encrypt(data["video_url"])

    doc_ref.set(data, merge=True)
    return jsonify({"id": session_id}), 201

@app.route("/sessions/<session_id>", methods=["PUT"])
@auth_required
def modify_session(session_id):
    data = request.get_json()

    doc_ref, error = session_owned_by_caller(session_id)
    if error:
        return error

    if not doc_ref.get().exists:
        return jsonify({"message": "document not found"}), 404

    # userId is not the caller's to change, even on their own run.
    data.pop("userId", None)

    if "video_url" in data:
        data["video_url"] = encrypt(data["video_url"])
    doc_ref.update(data)
    return jsonify({"message": "session successfully updated"}), 200

@app.route("/sessions/<session_id>", methods=["DELETE"])
@auth_required
def delete_session(session_id):
    doc_ref = db.collection("sessions").document(session_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"message": "document not found"}), 404
    doc_ref.delete()
    return jsonify({"message": "session successfully deleted"}), 200


### SESSION VIDEO
#
# Storage only. Deliberately separate from /predict, which stores *and* runs
# inference *and* answers as a chatbot: none of that belongs in a collection
# path. Inference during collection contributes nothing to the dataset being
# collected, and /predict files its output under `labels` — a model's guess
# stored as a label, in a study about where labels legitimately come from.
#
# Uploaded in sequence-numbered parts as the recording is produced rather than
# as one file at the end, for the same reason responses are: a participant who
# quits mid-task is the case most worth keeping, and a single upload at the end
# is exactly what such a run never reaches. Each part is named by its sequence
# number, so a retried part overwrites itself instead of duplicating.

def video_part_path(session_id, seq):
    return os.path.join(VIDEO_DIR, f"{secure_filename(session_id)}.{int(seq):06d}.part")


def video_final_path(session_id):
    return os.path.join(VIDEO_DIR, f"{secure_filename(session_id)}.webm")


def video_stored_path(session_id):
    """What goes in the session document: relative to Backend/, POSIX separators."""
    return f"{VIDEO_SUBDIR}/{secure_filename(session_id)}.webm".replace(os.sep, "/")


@app.route("/sessions/<session_id>/video", methods=["POST"])
@auth_required
def add_session_video(session_id):
    if "chunk" not in request.files:
        return jsonify({"error": "no chunk provided"}), 400

    doc_ref, error = session_owned_by_caller(session_id)
    if error:
        return error
    if not doc_ref.get().exists:
        return jsonify({"error": "session not found"}), 404

    try:
        seq = int(request.form.get("seq", ""))
    except ValueError:
        return jsonify({"error": "seq must be an integer"}), 400
    if seq < 0:
        return jsonify({"error": "seq must not be negative"}), 400

    os.makedirs(VIDEO_DIR, exist_ok=True)
    request.files["chunk"].save(video_part_path(session_id, seq))

    # Written on the first part, not at finalize. A run that is abandoned never
    # reaches finalize, so if the pointer were only written there, a partial
    # recording would sit on disk with nothing in the database referring to it —
    # findable only by scanning filenames. The destination is deterministic from
    # the session id, so it can be recorded before the file exists.
    if seq == 0:
        doc_ref.set(
            {"captures": {"videoPath": video_stored_path(session_id), "videoStatus": "partial"}},
            merge=True,
        )

    return jsonify({"seq": seq}), 201


@app.route("/sessions/<session_id>/video/finalize", methods=["POST"])
@auth_required
def finalize_session_video(session_id):
    doc_ref, error = session_owned_by_caller(session_id)
    if error:
        return error
    if not doc_ref.get().exists:
        return jsonify({"error": "session not found"}), 404

    safe_id = secure_filename(session_id)
    parts = sorted(
        p for p in os.listdir(VIDEO_DIR)
        if p.startswith(f"{safe_id}.") and p.endswith(".part")
    ) if os.path.isdir(VIDEO_DIR) else []

    if not parts:
        return jsonify({"error": "no parts to finalize"}), 404

    # A MediaRecorder timeslice stream is only valid concatenated in order — the
    # first part carries the container header and the rest are continuations.
    # Sorting on the zero-padded sequence number is that order.
    final_path = video_final_path(session_id)
    with open(final_path, "wb") as out:
        for part in parts:
            with open(os.path.join(VIDEO_DIR, part), "rb") as chunk:
                shutil.copyfileobj(chunk, out)

    for part in parts:
        os.remove(os.path.join(VIDEO_DIR, part))

    stored = video_stored_path(session_id)
    doc_ref.set(
        {"captures": {"overallVideoUrl": stored, "videoPath": stored, "videoStatus": "complete"}},
        merge=True,
    )
    return jsonify({"parts": len(parts), "path": stored}), 200


### SESSIONS RESPONSES

@app.route("/sessions/<session_id>/responses", methods=["GET"])
@auth_required
def get_responses(session_id):
    docs = db.collection("sessions").document(session_id).collection("responses").stream()
    responses = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        responses.append(data)
    return jsonify(responses), 200

@app.route("/sessions/<session_id>/responses/<response_id>", methods=["GET"])
@auth_required
def get_response(session_id, response_id):
    doc_ref = db.collection("sessions").document(session_id).collection("responses").document(response_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "response not found"}), 404
    data = doc.to_dict()
    data["id"] = doc.id
    return jsonify(data), 200

@app.route("/sessions/<session_id>/responses", methods=["POST"])
@auth_required
def add_response(session_id):
    # Accepts a client-supplied id so a retried write overwrites rather than
    # duplicating. Responses are sent as they happen, over a connection that may
    # drop mid-session, so a retry is a normal event and not an error path.
    data = request.get_json()

    doc_ref, error = session_owned_by_caller(session_id)
    if error:
        return error

    # A response may only be written into a session that already exists and
    # belongs to the caller — otherwise anyone could file answers under another
    # participant's run, or conjure a session by writing into its subcollection.
    if not doc_ref.get().exists:
        return jsonify({"error": "session not found"}), 404

    responses = doc_ref.collection("responses")

    response_id = data.pop("id", None)
    if response_id:
        responses.document(response_id).set(data)
    else:
        responses.add(data)

    return jsonify({"id": response_id}), 201

@app.route("/sessions/<session_id>/responses/<response_id>", methods=["PUT"])
@auth_required
def modify_response(session_id, response_id):
    data = request.get_json()
    doc_ref = db.collection("sessions").document(session_id).collection("responses").document(response_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "response not found"}), 404
    doc_ref.update(data)
    return jsonify({"message": "response updated"}), 200

@app.route("/sessions/<session_id>/responses/<response_id>", methods=["DELETE"])
@auth_required
def delete_response(session_id, response_id):
    doc_ref = db.collection("sessions").document(session_id).collection("responses").document(response_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "response not found"}), 404
    doc_ref.delete()
    return jsonify({"message": "response deleted"}), 200


### SESSIONS LABELS

@app.route("/sessions/<session_id>/labels", methods=["GET"])
@auth_required
def get_labels(session_id):
    docs = db.collection("sessions").document(session_id).collection("labels").stream()
    labels = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        labels.append(data)
    return jsonify(labels), 200

@app.route("/sessions/<session_id>/labels/<label_id>", methods=["GET"])
@auth_required
def get_label(session_id, label_id):
    doc_ref = db.collection("sessions").document(session_id).collection("labels").document(label_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "label not found"}), 404
    data = doc.to_dict()
    data["id"] = doc.id
    return jsonify(data), 200

@app.route("/sessions/<session_id>/labels", methods=["POST"])
@auth_required
def add_label(session_id):
    data = request.get_json()
    db.collection("sessions").document(session_id).collection("labels").add(data)
    return jsonify({"message": "label added"}), 201

@app.route("/sessions/<session_id>/labels/<label_id>", methods=["PUT"])
@auth_required
def modify_label(session_id, label_id):
    data = request.get_json()
    doc_ref = db.collection("sessions").document(session_id).collection("labels").document(label_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "label not found"}), 404
    doc_ref.update(data)
    return jsonify({"message": "label updated"}), 200

@app.route("/sessions/<session_id>/labels/<label_id>", methods=["DELETE"])
@auth_required
def delete_label(session_id, label_id):
    doc_ref = db.collection("sessions").document(session_id).collection("labels").document(label_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "label not found"}), 404
    doc_ref.delete()
    return jsonify({"message": "label deleted"}), 200


### EMOTION RECORDS

@app.route("/emotion_records", methods=["GET"])
@auth_required
def get_all_emotion_records():
    docs = db.collection('emotion_records').stream()
    records = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        records.append(data)
    return jsonify(records), 200

@app.route("/emotion_records", methods=["POST"])
@auth_required
def add_emotion_record():
    data = request.get_json()
    db.collection('emotion_records').add(data)
    return jsonify({"message": "emotion record added"}), 201

@app.route("/emotion_records/<emotion_record_id>", methods=["PUT"])
@auth_required
def modify_emotion_record(emotion_record_id):
    data = request.get_json()
    doc_ref = db.collection("emotion_records").document(emotion_record_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"message": "document not found"}), 404
    doc_ref.update(data)
    return jsonify({"message": "emotion record successfully updated"}), 200

@app.route("/emotion_records/<emotion_record_id>", methods=["DELETE"])
@auth_required
def delete_emotion_record(emotion_record_id):
    doc_ref = db.collection("emotion_records").document(emotion_record_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"message": "document not exist"}), 404
    doc_ref.delete()
    return jsonify({"message": "emotion record successfully deleted"}), 200


### PROTOCOLS

@app.route("/protocols", methods=["GET"])
@auth_required
def get_all_protocols():
    docs = db.collection('protocols').stream()
    protocols = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        protocols.append(data)
    return jsonify(protocols), 200

@app.route("/protocols/<version>", methods=["GET"])
@auth_required
def get_protocol(version):
    doc_ref = db.collection('protocols').document(version)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "protocol not found"}), 404
    protocol_data = doc.to_dict()
    protocol_data["id"] = doc.id
    return jsonify(protocol_data), 200

@app.route("/protocols", methods=["POST"])
@auth_required
def add_protocol():
    data = request.get_json()
    version = data.get("version")
    if not version:
        return jsonify({"error": "version is required"}), 400
    doc_ref = db.collection('protocols').document(version)
    if doc_ref.get().exists:
        return jsonify({"error": "protocol version already exists"}), 409
    doc_ref.set(data)
    return jsonify({"message": "protocol added"}), 201


### PROBE QUESTIONS

@app.route("/probe_questions", methods=["GET"])
@auth_required
def get_all_probe_questions():
    docs = db.collection('probeQuestions').stream()
    probe_questions = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        probe_questions.append(data)
    return jsonify(probe_questions), 200

@app.route("/probe_questions/<question_id>", methods=["GET"])
@auth_required
def get_probe_question(question_id):
    doc_ref = db.collection('probeQuestions').document(question_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "probe question not found"}), 404
    question_data = doc.to_dict()
    question_data["id"] = doc.id
    return jsonify(question_data), 200

@app.route("/probe_questions", methods=["POST"])
@auth_required
def add_probe_question():
    data = request.get_json()
    question_id = data.pop("id", None)
    if not question_id:
        return jsonify({"error": "id is required"}), 400
    doc_ref = db.collection('probeQuestions').document(question_id)
    if doc_ref.get().exists:
        return jsonify({"error": "probe question already exists"}), 409
    doc_ref.set(data)
    return jsonify({"message": "probe question added"}), 201


### ASSESSMENT ITEMS

@app.route("/assessmentItems", methods=["GET"])
@auth_required
def get_all_assessment_items():
    docs = db.collection("assessmentItems").stream()
    items = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        items.append(data)
    return jsonify(items), 200

@app.route("/assessmentItems/<item_id>", methods=["GET"])
@auth_required
def get_assessment_item(item_id):
    doc_ref = db.collection("assessmentItems").document(item_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "assessment item not found"}), 404
    data = doc.to_dict()
    data["id"] = doc.id
    return jsonify(data), 200

@app.route("/assessmentItems", methods=["POST"])
@auth_required
def add_assessment_item():
    data = request.get_json()
    valid_stages = ["pretest", "posttest", "transfer"]
    if data.get("stage") not in valid_stages:
        return jsonify({"error": "stage must be pretest, posttest, or transfer"}), 400
    item_id = data.pop("id", None)
    if not item_id:
        return jsonify({"error": "id is required"}), 400
    doc_ref = db.collection("assessmentItems").document(item_id)
    if doc_ref.get().exists:
        return jsonify({"error": "assessment item already exists"}), 409
    doc_ref.set(data)
    return jsonify({"message": "assessment item added"}), 201


### CASE STUDIES

# A case study is the flawed research study a participant reads, and it is the
# parent of the 4-5 task trials that critique it (D'Mello et al. 2014, Table 1).
# The study text lives here so it is stored once, not repeated on every trial.

@app.route("/caseStudies", methods=["GET"])
@auth_required
def get_all_case_studies():
    docs = db.collection("caseStudies").stream()
    case_studies = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        case_studies.append(data)
    return jsonify(case_studies), 200

@app.route("/caseStudies/<case_study_id>", methods=["GET"])
@auth_required
def get_case_study(case_study_id):
    doc_ref = db.collection("caseStudies").document(case_study_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "case study not found"}), 404
    data = doc.to_dict()
    data["id"] = doc.id
    return jsonify(data), 200

@app.route("/caseStudies/<case_study_id>/trials", methods=["GET"])
@auth_required
def get_case_study_trials(case_study_id):
    docs = db.collection("taskTrials").where("caseStudyId", "==", case_study_id).stream()
    trials = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        trials.append(data)
    # Sorted here rather than with order_by so the query stays a single-field
    # filter. Adding order_by("index") would require a composite Firestore index.
    trials.sort(key=lambda t: t.get("index", 0))
    return jsonify(trials), 200

@app.route("/caseStudies", methods=["POST"])
@auth_required
def add_case_study():
    data = request.get_json()
    case_study_id = data.pop("id", None)
    if not case_study_id:
        return jsonify({"error": "id is required"}), 400
    doc_ref = db.collection("caseStudies").document(case_study_id)
    if doc_ref.get().exists:
        return jsonify({"error": "case study already exists"}), 409
    doc_ref.set(data)
    return jsonify({"message": "case study added"}), 201


### TASK TRIALS

@app.route("/taskTrials", methods=["GET"])
@auth_required
def get_all_task_trials():
    docs = db.collection("taskTrials").stream()
    trials = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        trials.append(data)
    return jsonify(trials), 200

@app.route("/taskTrials/<trial_id>", methods=["GET"])
@auth_required
def get_task_trial(trial_id):
    doc_ref = db.collection("taskTrials").document(trial_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "task trial not found"}), 404
    data = doc.to_dict()
    data["id"] = doc.id
    return jsonify(data), 200

@app.route("/taskTrials", methods=["POST"])
@auth_required
def add_task_trial():
    data = request.get_json()
    trial_id = data.pop("id", None)
    if not trial_id:
        return jsonify({"error": "id is required"}), 400
    case_study_id = data.get("caseStudyId")
    if not case_study_id:
        return jsonify({"error": "caseStudyId is required"}), 400
    if not db.collection("caseStudies").document(case_study_id).get().exists:
        return jsonify({"error": "caseStudyId does not refer to an existing case study"}), 400
    doc_ref = db.collection("taskTrials").document(trial_id)
    if doc_ref.get().exists:
        return jsonify({"error": "task trial already exists"}), 409
    doc_ref.set(data)
    return jsonify({"message": "task trial added"}), 201


### CHATBOT

@app.route("/chatbot", methods=["POST"])
@auth_required
def chatbot():
    data = request.get_json()
    student_message = data.get("student_message")
    emotion = data.get("emotion")
    response = get_chatbot_response(student_message, emotion)
    return jsonify({"response": response}), 200

@app.route("/learning/start", methods = ["POST"])
@auth_required
def start_learning():
    data = request.get_json()
    topic = data["topic"]

    if not "topic":
        return jsonify({"error" : "topic required"}), 400
    
    flashcard = get_flashcard(topic)
    return jsonify(flashcard), 200


### AUTH

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    users_ref = db.collection("users").where("username", "==", username).get()
    if not users_ref:
        return jsonify({"error": "user not found"}), 404
    user_doc = users_ref[0]
    user_data = user_doc.to_dict()
    stored_hash = user_data.get("password", "")
    if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
        return jsonify({"error": "invalid password"}), 401
    existing_token = user_data.get("token")
    if existing_token:
        try:
            jwt.decode(existing_token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
            return jsonify({"token": existing_token}), 200
        except Exception:
            pass
    token = generate_jwt(user_doc.id)
    db.collection("auth_tokens").add({
        "JWT": token,
        "userId": user_doc.id,
        "expirationDate": datetime.now(timezone.utc) + timedelta(hours=720)
    })
    db.collection("users").document(user_doc.id).update({"token": token})
    return jsonify({"token": token}), 200

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    existing = db.collection("users").where("username", "==", username).get()

    if existing:
        return jsonify({"error": "username already taken"}), 409
    
    data["password"] = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    user_ref = db.collection('users').add(data)
    token = generate_jwt(user_ref[-1].id)
    db.collection("auth_tokens").add({
        "JWT": token,
        "userId": user_ref[-1].id,
        "expirationDate": datetime.now(timezone.utc) + timedelta(hours=720)
    })
    return jsonify({"token": token}), 200

@app.route("/logout", methods=["GET"])
def logout():
    auth_header = request.headers.get("Authorization", "")
    if " " in auth_header:
        token = auth_header.split(" ")[1]
    else:
        token = auth_header
        if not token:
            return jsonify({"error": "no token provided"}), 401
        try:
            payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        except Exception:
            return jsonify({"error": "invalid or expired token"}), 401
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            return jsonify({"error": "token missing user id"}), 401
        db.collection("users").document(user_id).update({"token": firestore.DELETE_FIELD})
        tokens_ref = db.collection("auth_tokens").where("JWT", "==", token).stream()
        for doc in tokens_ref:
            doc.reference.delete()
        return jsonify({"message": "logged out successfully"}), 200
    

# NOTE: the missing leading slash here raised ValueError at import, so the whole
# server failed to start — not just this endpoint. Everything else about this
# route is left as written; see /sessions/<id>/video for the study's own upload
# path, which stores and does not infer.
@app.route("/predict", methods = ["POST"])
@auth_required
def predict():
    if "video" not in request.files:
        return jsonify({"error": "no video file provided"}), 400
    
    video = request.files["video"]

    video_filename = secure_filename(video.filename)
    video_path = os.path.join("uploads/videos", video_filename)
    video.save(video_path)

    audio_path = video_path.replace(".mp4", ".wav")
    subprocess.run(["ffmpeg", "-i", video_path, "-y", audio_path])
    
    emotion = predict_emotion(video_path, audio_path)

    session_id = request.form.get("session_id")
    if session_id:
        db.collection("sessions").document(session_id).collection("labels").add({
        "derivedLabel": emotion,
        "videoSegmentUrl": video_path,
        "confidence": 0.0,  # add actual confidence if available
        "labeledAt": datetime.now(timezone.utc)
        })

    student_message = request.form.get("student_message", "")
    response = get_chatbot_response(student_message, emotion)

    return jsonify({"emotion": emotion,
        "chatbot_response": response
    }), 200



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
from flask import Flask, jsonify, request
from flask_cors import CORS
from firebase_admin import firestore
from predict import predict_emotion
from chatbot import get_chatbot_response
from auth import auth_required
from encryption import encrypt, decrypt

import jwt
from jwt_utils import generate_jwt

import os
from datetime import datetime, timedelta, timezone

from firebase_config import db

app = Flask(__name__)
CORS(app)


### USERS

@app.route("/users", methods=["GET"])
def get_all_users():
    users_ref = db.collection('users')
    docs = users_ref.stream()
    users = []
    for doc in docs:
        data = doc.to_dict()
        users.append(data)
    return jsonify(users), 200

@app.route("/users/<user_id>", methods=["GET"])
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
def add_user():
    data = request.get_json()
    if "name" in data:
        data["name"] = encrypt(data["name"])
    if "email" in data:
        data["email"] = encrypt(data["email"])
    db.collection('users').add(data)
    return jsonify({"message": "user added"}), 201

@app.route("/users/<user_id>", methods=["PUT"])
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
def delete_user(user_id):
    doc_ref = db.collection("users").document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"message": "document not found"}), 404
    doc_ref.delete()
    return jsonify({"message": "user successfully deleted"}), 200


### SESSIONS

@app.route("/sessions", methods=["GET"])
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

@app.route("/sessions", methods=["POST"])
@auth_required
def add_session():
    data = request.get_json()
    if "video_url" in data:
        data["video_url"] = encrypt(data["video_url"])
    db.collection('sessions').add(data)
    return jsonify({"message": "session added"}), 201

@app.route("/sessions/<session_id>", methods=["PUT"])
@auth_required
def modify_session(session_id):
    data = request.get_json()
    doc_ref = db.collection("sessions").document(session_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"message": "document not found"}), 404
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
    data = request.get_json()
    db.collection("sessions").document(session_id).collection("responses").add(data)
    return jsonify({"message": "response added"}), 201

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
def get_all_assessment_items():
    docs = db.collection("assessmentItems").stream()
    items = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        items.append(data)
    return jsonify(items), 200

@app.route("/assessmentItems/<item_id>", methods=["GET"])
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
def get_all_case_studies():
    docs = db.collection("caseStudies").stream()
    case_studies = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        case_studies.append(data)
    return jsonify(case_studies), 200

@app.route("/caseStudies/<case_study_id>", methods=["GET"])
def get_case_study(case_study_id):
    doc_ref = db.collection("caseStudies").document(case_study_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "case study not found"}), 404
    data = doc.to_dict()
    data["id"] = doc.id
    return jsonify(data), 200

@app.route("/caseStudies/<case_study_id>/trials", methods=["GET"])
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
def get_all_task_trials():
    docs = db.collection("taskTrials").stream()
    trials = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        trials.append(data)
    return jsonify(trials), 200

@app.route("/taskTrials/<trial_id>", methods=["GET"])
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
    if user_data.get("password") != password:
        return jsonify({"error": "invalid password"}), 401
    existing_token = user_data.get("token")
    if existing_token:
        try:
            jwt.decode(existing_token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
            return jsonify(user_data)
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


if __name__ == '__main__':
    app.run(debug=True)
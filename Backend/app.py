from flask import Flask, jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore
from predict import predict_emotion
from chatbot import get_chatbot_response
from auth import auth_required
from encryption import encrypt, decrypt

import jwt
from jwt_utils import generate_jwt

import os
from datetime import datetime, timedelta, timezone

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

app = Flask(__name__)



### GET METHODS

@app.route("/users", methods=["GET"])
@auth_required
def get_all_users():
    users_ref = db.collection('users')
    docs = users_ref.stream()

    users = []

    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        if "name" in data:
            data["name"] = decrypt(data["name"])
        if "email" in data:
            data["email"] = decrypt(data["email"])
        users.append(data)

    return jsonify(users), 200

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

@app.route("/emotion_records", methods =["GET"])
@auth_required
def get_all_emotion_records():
    emotion_records = db.collection('emotion_records')
    docs = emotion_records.stream()

    records = []

    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        records.append(data)

    return jsonify(records), 200

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

@app.route("/protocols", methods=["GET"])
@auth_required
def get_all_protocols():
    protocols_ref = db.collection('protocols')
    docs = protocols_ref.stream()
 
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

 
@app.route("/probe_questions", methods=["GET"])
@auth_required
def get_all_probe_questions():
    probe_questions_ref = db.collection('probeQuestions')
    docs = probe_questions_ref.stream()
 
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


### POST METHODS

@app.route("/users", methods = ["POST"])
@auth_required
def add_user():
    data = request.get_json()

    if "name" in data:
        data["name"] = encrypt(data["name"])
    if "email" in data:
        data["email"] = encrypt(data["email"])

    db.collection('users').add(data)

    return jsonify({"message": "user added"}), 201

@app.route("/sessions", methods = ["POST"])
@auth_required
def add_session():
    data = request.get_json()
    if "video_url" in data:
        data["video_url"] = encrypt(data["video_url"])
    db.collection('sessions').add(data)

    return jsonify({"message": "session added"}), 201

@app.route("/emotion_records", methods = ["POST"])
@auth_required
def add_emotion_record():
    data = request.get_json()
    db.collection('emotion_records').add(data)

    return jsonify({"message": "emotion record added"}), 201

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

 
@app.route("/probe_questions", methods=["POST"])
@auth_required
def add_probe_question():
    data = request.get_json()
 
    db.collection('probeQuestions').add(data)
 
    return jsonify({"message": "probe question added"}), 201

### PUT METHODS

@app.route("/users/<user_id>", methods = ["PUT"])
@auth_required
def modify_user(user_id):
    data = request.get_json()

    doc_ref = db.collection("users").document(user_id)
    doc = doc_ref.get()

    if not doc.exists:
        return jsonify({"message" : "document not exist"}), 404
    
    
    if "name" in data:
        data["name"] = encrypt(data["name"])
    if "email" in data:
        data["email"] = encrypt(data["email"])

    doc_ref.update(data)
    return jsonify({"message" : "user successfully updated"}), 200

@app.route("/sessions/<session_id>", methods = ["PUT"])
@auth_required
def modify_session(session_id):
    data = request.get_json()

    doc_ref = db.collection("sessions").document(session_id)
    doc = doc_ref.get()

    if not doc.exists:
        return jsonify({"message" : "document not found"}), 404
    
    if "video_url" in data:
        data["video_url"] = encrypt(data["video_url"])

    doc_ref.update(data)
    return jsonify({"message" : "session successfully updated"}), 200

@app.route("/emotion_records/<emotion_record_id>", methods = ["PUT"])
@auth_required
def modify_emotion_record(emotion_record_id):
    data = request.get_json()

    doc_ref = db.collection("emotion_records").document(emotion_record_id)
    doc = doc_ref.get()

    if not doc.exists:
        return jsonify({"message" : "document not found"}), 404
    
    doc_ref.update(data)
    return jsonify({"message" : "emotion record successfully updated"}), 200


### DELETE METHODS

@app.route("/users/<user_id>", methods = ["DELETE"])
@auth_required
def delete_user(user_id):
    doc_ref = db.collection("users").document(user_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return jsonify({"message" : "document not found"}), 404
    
    doc_ref.delete()

    return jsonify({"message" : "user successfully deleted"}), 200

@app.route("/sessions/<session_id>", methods = ["DELETE"])
@auth_required
def delete_session(session_id):
    doc_ref = db.collection("sessions").document(session_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return jsonify({"message" : "document not found"}), 404
    
    doc_ref.delete()


    return jsonify({"message" : "session successfully deleted"}), 200

@app.route("/emotion_records/<emotion_record_id>", methods = ["DELETE"])
@auth_required
def delete_emotion_record(emotion_record_id):
    doc_ref = db.collection("emotion_records").document(emotion_record_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return jsonify({"message" : "document not exist"}), 404
    
    doc_ref.delete()

    return jsonify({"message" : "emotion record successfully deleted"}), 200



### CHATBOT

@app.route("/chatbot", methods = ["POST"])
@auth_required
def chatbot():
    data = request.get_json()
    student_message = data.get("student_message")
    emotion = data.get("emotion")

    response = get_chatbot_response(student_message, emotion)
    return jsonify({"response": response}), 200


### LOGIN

@app.route("/login", methods = ["POST"])
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
            return jsonify({"token" : existing_token})
        except Exception:
            pass

    token = generate_jwt(user_doc.id)
    db.collection("auth_tokens").add({
        "JWT": token,
        "userId": user_doc.id,
        "expirationDate": datetime.now(timezone.utc) + timedelta(hours=720)
    })
    db.collection("users").document(user_doc.id).update({"token": token})

    return jsonify({"token" : token}), 200


### SIGNUP
@app.route("/signup", methods = ["POST"])
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
        "JWT" : token,
        "userId" : user_ref[-1].id,
        "expirationDate" : datetime.now(timezone.utc) + timedelta(hours=720)
    })
    return jsonify({"token" : token}), 200

### LOGOUT
@app.route("/logout", methods = ["GET"])
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

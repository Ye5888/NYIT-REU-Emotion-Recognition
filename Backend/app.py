from flask import Flask, jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore
from predict import predict_emotion
from chatbot import get_chatbot_response
from auth import auth_required
from encryption import encrypt, decrypt

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



### Chatbot
@app.route("/chatbot", methods = ["POST"])
@auth_required
def chatbot():
    data = request.get_json()
    student_message = data.get("student_message")
    emotion = data.get("emotion")

    response = get_chatbot_response(student_message, emotion)
    return jsonify({"response": response}), 200



if __name__ == '__main__':
    app.run(debug=True)

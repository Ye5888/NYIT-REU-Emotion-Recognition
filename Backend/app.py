from flask import Flask, jsonify, request
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

app = Flask(__name__)

@app.route("/users", methods=["GET"])
def get_all_users():
    users_ref = db.collection('users')
    docs = users_ref.stream()

    users = []

    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        users.append(data)

    return jsonify(users), 200

@app.route("/sessions", methods=["GET"])
def get_all_sessions():
    sessions_ref = db.collection('sessions')
    docs = sessions_ref.stream()

    sessions = []

    for session in docs:
        data = session.to_dict()
        data["id"] = session.id
        sessions.append(session)

    return jsonify(sessions), 200

@app.route("/emotion_records", methods =["GET"])
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
def get_user(user_id):
    doc_ref = db.collection('users').document(user_id)
    doc = doc_ref.get()

    if not doc.exists:
        return jsonify({"error": "user not found"}), 404
    
    user_data = doc.to_dict()
    user_data["id"] = doc.id
    
    return jsonify(user_data), 200

@app.route("/users", methods = ["POST"])
def add_user():
    data = request.get_json()
    db.collection('users').add(data)

    return jsonify({"message": "user added"}), 201

@app.route("/sessions", methods = ["POST"])
def add_session():
    data = request.get_json()
    db.collection('sessions').add(data)

    return jsonify({"message": "session added"}), 201

@app.route("/emotion_records", methods = ["POST"])
def add_emotion_record():
    data = request.get_json()
    db.collection('emotion_records').add(data)

    return jsonify({"message": "emotion record added"}), 201

if __name__ == '__main__':
    app.run(debug=True)

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


@app.route("/users/<user_id>", methods=["POST"])
def get_user(id):
    doc_ref = db.collection('users').document(id)
    doc = doc_ref.get()

    if not doc.exists:
        return jsonify({"error": "user not found"}), 404
    
    user_data = doc.to_dict()
    user_data["id"] = doc.id
    
    return jsonify(user_data), 200



if __name__ == '__main__':
    app.run(debug=True)

from functools import wraps
from flask import request, jsonify, g
import jwt
import os
from datetime import datetime, timedelta, timezone

from firebase_config import db

def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")

        if request.method == "OPTIONS":
            return "", 200

        if not auth.startswith("Bearer "):
            return jsonify({"error": "missing bearer token"}), 401
        
        token = auth.split(" ", 1)[1].strip()

        try:
            payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])

            if not "sub" in payload:
                return jsonify({"error" : "invalid payload"}), 401
            
            token_docs = db.collection("auth_tokens").where("JWT", "==", token).get()
            
            if not token_docs:
                return jsonify({"error" : "token not found"}), 401
            
            token_data = token_docs[0].to_dict()
            if (token_data["expirationDate"] < datetime.now(timezone.utc)):
                return jsonify({"error" : "expired token"}), 401
            

        except Exception:
            return jsonify({"error": "invalid or expired token"}), 401
        
        user = db.collection("users").document(payload["sub"]).get()

        if not user.exists:
            return jsonify({"error" : "user not found"}), 401
        
        g.current_user_id = payload["sub"]

        return fn(*args, **kwargs)
    return wrapper



# 1. User logs in ... /login endpoint (@POST BODY username password) {user id -- jwt}
# 2. Server, checks database for this userID. If JWT exists & is not expired, then send back the exisitng jwt, otherwise create jwt for user.
# 3. Send JWT back to frontend, and 200. Frontend stores JWT.
# 4. Whenever frontend makes a request to backend, they need to provide JWT.
# 5. Request from frontend being make to backend. (ex GET) @auth_token <-- run this wrapper before executing code (in endpoint)
#     5.a. (auth.py) Wrapper takes requeest, decodes the authorized token, find unique user identification, and retreives user from data 
#     5.b. (auth.py) returns a "g" object, which acts as a object where in "current_user" the user data stored
#     5.c. 
import jwt
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
load_dotenv()

def generate_jwt(user_id):
    payload = {
        "sub" : user_id,
        "exp" : datetime.now(timezone.utc) + timedelta(hours=720)
    }

    token = jwt.encode(payload, os.getenv("JWT_SECRET"), algorithm="HS256")
    return token
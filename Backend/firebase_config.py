import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# serviceAccountKey.json is a Firebase Admin SDK credential -- full project
# access, bypasses every Firestore security rule. It was previously
# distributed by email and copied by hand onto whichever machine needed it;
# email isn't a secret store -- it sits in every recipient's inbox/backups
# indefinitely, with no audit trail or revocation. Reading it from an env
# var instead keeps the actual credential out of git and out of email going
# forward. Base64-encoded because the raw JSON's private_key field contains
# literal newlines, which are awkward to pass through a single-line env var
# otherwise.
_key_b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_B64")
if _key_b64:
    cred = credentials.Certificate(json.loads(base64.b64decode(_key_b64)))
else:
    # Fallback for any environment that hasn't migrated yet (e.g. local dev
    # before the env var is set). Remove once every environment is on the
    # env var and the actual JSON file has been deleted everywhere it was
    # ever copied to.
    cred = credentials.Certificate(
        os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    )

firebase_admin.initialize_app(cred)

db = firestore.client()

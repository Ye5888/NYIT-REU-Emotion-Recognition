from cryptography.fernet import Fernet
import os
from dot_env import load_dotenv

load_dotenv()

key = os.get_env("ENCRYPTION_KEY")
fernet = Fernet(key)

def encrypt(data : str) -> str:
    return fernet.encrypt(data.encode()).decode()

def decrypt(data : str) -> str:
    return fernet.decrypt(data.encode()).decode()
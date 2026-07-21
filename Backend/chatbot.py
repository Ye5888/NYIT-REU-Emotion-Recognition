import os
from google import genai
from google.genai import types

from dotenv import load_dotenv
load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

### Change This
SYSTEM_INSTRUCTION = "HI"

def get_chatbot_response(student_message, emotion=None):
    prompt = student_message
    if emotion:
        prompt = "Here is the student message: " + student_message + " Here is what the student seems to be feeling based on their facial expressions and audio recording" + emotion
    
    chat = client.chats.create(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
        ),
    )

    response = chat.send_message(prompt)
    return response.text

import os
from google import genai
from google.genai import types

from dotenv import load_dotenv
load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


SYSTEM_INSTRUCTION = """You are an educational AI tutor helping a student learn a topic through guided dialogue.
You will receive the student's message and their current emotional state detected from their facial expressions and audio.
Use the emotional context to adapt your teaching:
- If confused: simplify your explanation, use analogies, and check understanding
- If frustrated: be patient and encouraging, try a different explanation approach
- If bored: increase the challenge level and make the content more engaging
- If engaged: build on their momentum and deepen the topic
Ask follow-up questions to guide the student toward understanding rather than giving direct answers.
Keep responses concise and conversational."""

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

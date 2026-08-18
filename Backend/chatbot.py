import os
import json
from openai import OpenAI

from dotenv import load_dotenv
load_dotenv()

# llama-3.3-70b-versatile started 404ing ("does not exist or you do not
# have access to it") -- Groq's available models can change over time.
# Confirmed openai/gpt-oss-120b is currently live and accessible via the
# Groq Playground before switching to it.
MODEL = "openai/gpt-oss-120b"

# Groq speaks the OpenAI Chat Completions API, so the official OpenAI SDK
# works as-is once pointed at Groq's base URL with a Groq key.
#
# Built lazily rather than at import time: the SDK raises immediately if
# GROQ_API_KEY is missing, and app.py imports this module at startup, so a
# missing key used to take down the whole backend before any route could
# even report a clear error. Deferring construction to first use means only
# the routes that actually need it fail, with a real error instead of an
# import-time crash.
_client = None

def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
    return _client

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

    response = _get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
    )

    return response.choices[0].message.content

def generate_flashcard(topic, emotion=None):
    emotion_context = f"The student is currently feeling: {emotion}. " if emotion else ""

    prompt = f"""{emotion_context}Generate a flashcard for the topic "{topic}".
        Provide a term and two definitions that are subtly different — one correct, one plausibly wrong but not obviously so.
        The wrong option should be a common misconception or a slight distortion of the truth.
        Return ONLY valid JSON in exactly this format, no other text:
    {{
        "term": "the term or concept",
        "option_a": "first definition",
        "option_b": "second definition",
        "correct_key": "A or B"
    }}"""

    response = _get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )

    text = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
    data = json.loads(text)
    return _normalize_flashcard(data)

def _normalize_flashcard(data):
    """
    Validates shape and normalizes correct_key to exactly 'A' or 'B'.

    The frontend compares correct_key against the literal strings 'A'/'B' --
    if the model ever returns "a", "Option A", or similar, every answer on
    that card would silently score wrong with no error raised anywhere.
    Raises ValueError on anything unusable, which the caller already treats
    as a generation failure (502) rather than serving a broken card.
    """
    term = data.get("term")
    option_a = data.get("option_a")
    option_b = data.get("option_b")
    correct_key = data.get("correct_key")

    if not all(isinstance(v, str) and v.strip() for v in (term, option_a, option_b, correct_key)):
        raise ValueError(f"Malformed flashcard from model: {data!r}")

    key = correct_key.strip().upper()
    if key.startswith("OPTION_A") or key == "A":
        key = "A"
    elif key.startswith("OPTION_B") or key == "B":
        key = "B"
    else:
        raise ValueError(f"Unrecognized correct_key from model: {correct_key!r}")

    return {"term": term, "option_a": option_a, "option_b": option_b, "correct_key": key}

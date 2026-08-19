# NYIT REU — Emotion-Aware Learning

An adaptive flashcard tutor that watches a student's facial expressions while they answer questions, classifies their engagement-related emotional state, and feeds that back into an AI tutor's next response.

## 1. Overview

The core idea: while a student is looking at a flashcard, their webcam records the moment from when the card appears to when they answer it. That clip gets run through a facial-emotion-recognition pipeline, classifying the student's state as one of four categories — **Boredom, Engagement, Confusion, Frustration** — using the labels defined by the [DAiSEE](https://people.iith.ac.in/vineethnb/resources/daisee/index.html) dataset. That prediction is then:

- logged against the session, for later analysis, and
- passed to an LLM-based tutor (via Groq), which adapts its explanation and the next flashcard's difficulty based on how the student seems to be doing.

The system was originally built around CREMA-D (an acted, audio-visual emotion dataset) before switching to DAiSEE, which — being made of real students' webcam recordings during e-learning — is a much closer match for the four target states this project actually cares about. See [Section 5](#5-the-ml-pipeline) for what that migration involved and what was learned from it.

## 2. The Learning Experience & Experiment Design

**The gamified part, concretely:** each round is a two-choice flashcard — a term with two subtly different definitions, one correct and one a plausible misconception, generated on the fly by the tutor LLM. The student picks A or B, gets immediate correct/wrong feedback, and a running accuracy score (`correctCount` / `totalCount`) is tracked for the whole session, reported back at the end. It's a lightweight quiz loop, not a game in the point-and-leaderboard sense — the "game" is closer to "keep answering, watch your accuracy, get an explanation when you're wrong."

**The research idea underneath that loop:** DAiSEE's four categories weren't picked arbitrarily — they're specifically the states the dataset's own creators built it around measuring in an e-learning context, which is exactly this project's setting (as opposed to CREMA-D's generic acted emotions, built for a different kind of task). The underlying hypothesis being explored is whether detecting a student's real-time engagement/confusion/boredom/frustration from webcam video during a task can be used to adapt the tutoring response — simplify and add analogies if confused, ease off and encourage if frustrated, raise the challenge if bored, build on momentum if engaged (see `SYSTEM_INSTRUCTION` in `chatbot.py` for exactly how that's phrased to the model).

**An open methodological question worth stating plainly, not glossing over:** right now the same emotion signal is both *logged as data* (for later analysis of what states show up when) and *used live* to change what the student sees next. Those are two different roles that can interfere with each other — if the tutor visibly reacts to a detected state, that reaction itself becomes part of what's shaping the student's *next* state, which muddies any attempt to cleanly measure how emotion relates to learning outcomes on its own. Whether and how to separate "record emotion" from "act on emotion" — e.g., running a measurement-only mode, or A/B'ing adaptive vs. non-adaptive tutoring — is an active discussion with the project's mentors, not yet a settled part of the design. The current build takes the simpler, both-at-once path described above.

## 3. Architecture

```
FrontendApp/          Expo / React Native app (web-first — uses browser MediaRecorder)
Backend/               Flask API
  app.py               Routes: auth, sessions, /predict, /learning/*
  predict.py            Live inference: video -> OpenFace -> feature vector -> model -> emotion
  chatbot.py            Groq (OpenAI-compatible) calls: flashcard generation + tutor responses
  firebase_config.py    Firestore client, credential loaded from env (not a committed file)
  models/
    extract_daisee.py   Offline: DAiSEE dataset -> per-clip feature CSVs
    daisee_sequences.py  Offline: DAiSEE dataset -> per-clip frame sequences (for the LSTM)
    train_daisee.py       Trains the MLP
    train_daisee_svm.py    Trains the SVM
    train_daisee_lstm.py   Trains the LSTM
    artifacts/            Trained model weights + scalers/encoders (committed to the repo)
```

**Request flow for one flashcard answer:**
1. Frontend records video from when the flashcard renders to when the student clicks an answer.
2. `POST /predict` — video + whether the answer was correct. Backend runs OpenFace, builds a feature vector, runs it through the trained model, gets back one of the four emotion labels, logs it to Firestore, and (only on a wrong answer, to avoid a wasted LLM call) asks the chatbot for an explanation.
3. `POST /learning/answer` — updates the session's running score in Firestore, then generates the next flashcard, with the detected emotion folded into the prompt.

## 4. Setup / Running It

### Backend

Requires Python 3, [OpenFace](https://github.com/TadasBaltrusaitis/OpenFace) built somewhere on the machine, and a `Backend/.env` file with:

```
JWT_SECRET=<any secret string, used to sign auth tokens>
ENCRYPTION_KEY=<key used to encrypt stored name/email fields>
GROQ_API_KEY=<from console.groq.com>
FIREBASE_SERVICE_ACCOUNT_B64=<base64-encoded Firebase service account JSON — see Section 6 of the security notes below>
OPENFACE_BIN=<path to OpenFace's FeatureExtraction binary — defaults to a specific dev machine's path if unset>
SIGNUP_CODE=<optional — if set, gates signup behind this invite code>
```

Install and run:
```bash
cd Backend
pip install -r requirements.txt
gunicorn -w 2 -b 0.0.0.0:5000 app:app
```
(`python3 app.py` also works for local single-threaded dev, but isn't what's used for anything reachable from outside the box.)

### Frontend

Requires a `FrontendApp/.env` with:
```
EXPO_PUBLIC_API_BASE=http://<backend host>:5000
```

```bash
cd FrontendApp
npm install
npx expo start
```
Press `w` to open it in a browser — the camera-recording flow depends on the browser's `MediaRecorder` API, so this is a web-first app, not a native-first one.

## 5. The ML Pipeline

**Offline (run once, or whenever you want to retrain):**
```bash
cd Backend/models
python3 extract_daisee.py        # DAiSEE dataset -> Train/Validation/Test_features.csv
python3 train_daisee.py          # -> artifacts/daisee_model.pt (MLP)
python3 train_daisee_svm.py      # -> artifacts/daisee_svm_model.pkl (SVM)
python3 train_daisee_lstm.py     # -> artifacts/daisee_lstm_model.pt (LSTM)
```
These need `DAISEE_ROOT` (path to the downloaded dataset), `DAISEE_OUTPUT_DIR` (where extracted features/sequences land), and `DAISEE_ARTIFACTS_DIR` (defaults to `Backend/models/artifacts/`, inside the repo) set as env vars if the defaults (tuned for one specific dev machine) don't match yours.

**Feature representation:** each clip's per-frame OpenFace Action Unit output gets collapsed into 20 statistical functionals (mean, std, quartiles, skew, slope, etc.) per AU column for the MLP/SVM — a flat, ~700-dimensional vector per clip. The LSTM instead uses the raw per-frame sequence directly (padded to a fixed length), to test whether temporal information the flattened statistics discard actually helps.

**Results, honestly reported:**

| | MLP | SVM | LSTM |
|---|---|---|---|
| Test Accuracy | 73.7% | 74.2% | 76.0% |
| Macro F1 | 0.27 | 0.25 | 0.23 |
| Confusion / Frustration recall | 0.00 | 0.00 | 0.00 |

Five approaches were tried in total (plain MLP, class-weighted MLP, plain SVM, SMOTE-oversampled SVM, and the LSTM above), and **all five converge on the same failure**: Confusion and Frustration are essentially never predicted, regardless of model architecture, class weighting, or synthetic oversampling. Given that consistency, the bottleneck looks less like "wrong model" and more like a data/framing issue — DAiSEE gives four separate 0–3 intensity scores per clip, and the current pipeline collapses that to a single dominant label, discarding real signal for clips where Confusion/Frustration were present but not dominant. That reframing is the most promising next step, currently pending further discussion.

**Currently deployed (`predict.py`): the plain MLP** — best macro F1 of the five, and the cheapest and most predictable at inference time for a live, per-answer prediction.

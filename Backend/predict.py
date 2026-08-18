import os
import subprocess
import numpy as np
import pandas as pd
import joblib
import torch
import torch.nn as nn

# Reusing extract_daisee.py's actual extract_features() rather than hand-
# rolling a second implementation here, the way the old CREMA-D version did
# -- that's exactly how a live feature vector can quietly drift out of sync
# with what the model was actually trained on. extract_daisee.py's main
# extraction loop is guarded behind `if __name__ == "__main__":` so this
# import doesn't trigger it. No sys.path manipulation needed -- Backend/ is
# already on the path (same reason `from predict import predict_emotion`
# works in app.py), so models/ is importable as a plain namespace package.
from models.extract_daisee import extract_features

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
ARTIFACTS_DIR = os.path.join(MODELS_DIR, "artifacts")

scaler = joblib.load(os.path.join(ARTIFACTS_DIR, "daisee_scaler.pkl"))
label_encoder = joblib.load(os.path.join(ARTIFACTS_DIR, "daisee_label_encoder.pkl"))


# Same architecture as train_daisee.py's EmotionMLP -- has to match exactly,
# since we're loading a state dict (learned weights) into this structure,
# not a full serialized model object.
class EmotionMLP(nn.Module):
    def __init__(self, input_size, num_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_size, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        return self.net(x)


# scaler.mean_ has one entry per input feature, so its length is exactly the
# input size the model was trained on -- avoids hardcoding 700 here.
model = EmotionMLP(input_size=scaler.mean_.shape[0], num_classes=len(label_encoder.classes_))
model.load_state_dict(torch.load(os.path.join(ARTIFACTS_DIR, "daisee_model.pt")))
model.eval()


def predict_emotion(video_path, audio_path=None):
    """audio_path is accepted for backward compatibility with app.py's
    /predict route, which still extracts it -- unused here. DAiSEE is
    video-only, so the model was never trained on audio features.
    """
    feature_vector_scaled = construct_feature_vector(video_path)
    with torch.no_grad():
        logits = model(torch.FloatTensor(feature_vector_scaled))
        pred_idx = logits.argmax(dim=1).item()
    return label_encoder.inverse_transform([pred_idx])[0]


def construct_feature_vector(video_path):
    csv_dir = os.path.join(os.path.dirname(__file__), "uploads/CSVs/")
    os.makedirs(csv_dir, exist_ok=True)
    video_name = os.path.basename(video_path)

    run_openface(video_path, csv_dir)
    # OpenFace names its output after the input's basename regardless of the
    # source container, so derive it the same way instead of assuming .mp4.
    csv_name = os.path.splitext(video_name)[0] + ".csv"
    csv_path = os.path.join(csv_dir, csv_name)

    df = pd.read_csv(csv_path)
    visual_features, au_cols = extract_features(df)

    feature_vector = np.array(visual_features, dtype=np.float64).reshape(1, -1)
    feature_vector_scaled = scaler.transform(feature_vector)
    return feature_vector_scaled


def run_openface(video_path, csv_output_dir):
    openface_bin = os.getenv("OPENFACE_BIN", "/home/yesongquing/OpenFace/build/bin/FeatureExtraction")

    subprocess.run([
        openface_bin,
        "-f", os.path.abspath(video_path),
        "-out_dir", os.path.abspath(csv_output_dir)
    ])

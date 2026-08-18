import os
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report
import joblib

# No OpenFace/openSMILE/video paths here at all -- this used to re-run the
# entire extraction pipeline from scratch on every training run (full
# OpenFace cost across all 9,068 clips, a second time alongside
# extract_daisee.py doing the exact same work), which is very likely why
# daisee_output ballooned to 113GB. Now it just loads the {split}_features.csv
# files extract_daisee.py already saved. Run extract_daisee.py once; run
# this as many times as you want after that.
OUTPUT_DIR = os.getenv("DAISEE_OUTPUT_DIR", "/home/yesongquing/daisee_output")
# Defaults to a folder inside the repo now, not OUTPUT_DIR (which is
# .gitignore'd, same as the DAiSEE dataset itself) -- so a normal run's
# artifacts land somewhere git actually tracks, without needing a manual
# copy step. .gitignore has a matching exception for *.pkl files under here.
ARTIFACTS_DIR = os.getenv(
    "DAISEE_ARTIFACTS_DIR", os.path.join(os.path.dirname(__file__), "artifacts")
)
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)

def load_split(split):
    path = os.path.join(OUTPUT_DIR, f"{split}_features.csv")
    # A pre-fix version of extract_daisee.py could write a row with a
    # different field count than the header, if a clip's OpenFace output had
    # a different AU column set than whichever clip established the split's
    # header -- caused pandas.errors.ParserError: "Expected 702 fields ...
    # saw 1309" here. extract_daisee.py now rejects those rows going
    # forward, but can't retroactively fix rows already written by an
    # earlier run; on_bad_lines drops any surviving malformed row (and
    # prints which one) instead of crashing the whole training run over it.
    df = pd.read_csv(path, on_bad_lines='warn')
    # ClipID is now in the extracted CSVs (needed for extract_daisee.py's
    # resume support) -- an identifier, not a feature, so drop it alongside
    # Emotion rather than trying to cast a clip filename to float.
    X = df.drop(columns=['ClipID', 'Emotion']).values.astype(float)
    y = df['Emotion'].values
    return X, y

X_train, y_train = load_split("Train")
X_val, y_val = load_split("Validation")
X_test, y_test = load_split("Test")

# encode labels
le = LabelEncoder()
y_train_enc = le.fit_transform(y_train)
y_val_enc = le.transform(y_val)
y_test_enc = le.transform(y_test)

# scale features
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_val = scaler.transform(X_val)
X_test = scaler.transform(X_test)

# convert to tensors
X_train_t = torch.FloatTensor(X_train)
y_train_t = torch.LongTensor(y_train_enc)
X_val_t = torch.FloatTensor(X_val)
y_val_t = torch.LongTensor(y_val_enc)
X_test_t = torch.FloatTensor(X_test)
y_test_t = torch.LongTensor(y_test_enc)

# define MLP
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

model = EmotionMLP(input_size=X_train.shape[1], num_classes=len(le.classes_))
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

# train, keeping the best validation checkpoint rather than whatever epoch
# 100 happens to land on -- there was no early stopping or checkpointing at
# all before, so the saved model could easily have been past its peak.
best_val_acc = -1.0
best_state = None

for epoch in range(100):
    model.train()
    optimizer.zero_grad()
    output = model(X_train_t)
    loss = criterion(output, y_train_t)
    loss.backward()
    optimizer.step()

    model.eval()
    with torch.no_grad():
        val_pred = model(X_val_t).argmax(dim=1)
        val_acc = (val_pred == y_val_t).float().mean().item()

    if val_acc > best_val_acc:
        best_val_acc = val_acc
        best_state = {k: v.clone() for k, v in model.state_dict().items()}

    if epoch % 10 == 0:
        print(f"Epoch {epoch} | Loss: {loss.item():.4f} | Val Acc: {val_acc:.4f} | Best: {best_val_acc:.4f}")

print(f"\nBest validation accuracy: {best_val_acc:.4f}")
model.load_state_dict(best_state)

# evaluate on test using the best checkpoint, not the final epoch
model.eval()
with torch.no_grad():
    test_pred = model(X_test_t).argmax(dim=1)
    test_acc = (test_pred == y_test_t).float().mean()
    print(f"\nTest Accuracy: {test_acc:.4f}")
    print(classification_report(y_test_enc, test_pred.numpy(), target_names=le.classes_))

# save
joblib.dump(scaler, os.path.join(ARTIFACTS_DIR, "daisee_scaler.pkl"))
joblib.dump(le, os.path.join(ARTIFACTS_DIR, "daisee_label_encoder.pkl"))
torch.save(best_state, os.path.join(ARTIFACTS_DIR, "daisee_model.pt"))
print(f"\nSaved scaler, label encoder, and best model state to {ARTIFACTS_DIR}")

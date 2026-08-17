import os
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
import joblib

from daisee_sequences import load_split_sequences

OUTPUT_DIR = os.getenv("DAISEE_OUTPUT_DIR", "/home/yesongquing/daisee_output")
ARTIFACTS_DIR = os.getenv("DAISEE_ARTIFACTS_DIR", OUTPUT_DIR)
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)

# max_len is determined from Train, then reused for Validation/Test so every
# split gets padded/truncated to the same shape -- the LSTM needs a
# consistent input size regardless of which split it's looking at.
X_train, y_train, max_len = load_split_sequences("Train")
X_val, y_val, _ = load_split_sequences("Validation", max_len=max_len)
X_test, y_test, _ = load_split_sequences("Test", max_len=max_len)

num_au_cols = X_train.shape[2]

# LSTM uses CrossEntropyLoss same as the MLP, which needs integer class
# indices -- unlike SVC, which accepted raw string labels directly.
le = LabelEncoder()
y_train_enc = le.fit_transform(y_train)
y_val_enc = le.transform(y_val)
y_test_enc = le.transform(y_test)

# No StandardScaler here, unlike train_daisee.py/train_daisee_svm.py -- those
# feature vectors mixed wildly different-scale statistics (means alongside
# kurtosis alongside slopes), which genuinely needed normalizing. Raw
# per-frame AU values are already on comparable scales across columns
# (roughly 0-5 for _r intensity, 0/1 for _c presence), so scaling matters
# less here. A length-aware scaler (excluding the zero-padded frames from
# the fit) would be the correct next step if results suggest it's needed.

X_train_t = torch.FloatTensor(X_train)
y_train_t = torch.LongTensor(y_train_enc)
X_val_t = torch.FloatTensor(X_val)
y_val_t = torch.LongTensor(y_val_enc)
X_test_t = torch.FloatTensor(X_test)
y_test_t = torch.LongTensor(y_test_enc)

# Real mini-batching, unlike the MLP's full-batch approach -- the padded
# sequence tensor is much bigger than a flat feature matrix, and LSTMs are
# typically trained with batches anyway.
BATCH_SIZE = 32
train_ds = TensorDataset(X_train_t, y_train_t)
train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)


class EmotionLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_classes, num_layers=1):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, num_classes)

    def forward(self, x):
        # x: (batch, seq_len, input_size)
        output, (h_n, c_n) = self.lstm(x)
        last_hidden = h_n[-1]  # (batch, hidden_size) -- summary of the whole sequence
        return self.fc(last_hidden)


HIDDEN_SIZE = 128
model = EmotionLSTM(input_size=num_au_cols, hidden_size=HIDDEN_SIZE, num_classes=len(le.classes_))
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

# Same best-validation-checkpoint pattern as train_daisee.py.
best_val_acc = -1.0
best_state = None

# Fewer epochs than the MLP's 100 -- with batching, each epoch here is
# ~len(train_ds)/BATCH_SIZE gradient updates already (~150), versus the
# MLP's one full-batch update per epoch. Adjust based on results.
NUM_EPOCHS = 30

for epoch in range(NUM_EPOCHS):
    model.train()
    epoch_loss = 0.0
    for X_batch, y_batch in train_loader:
        optimizer.zero_grad()
        output = model(X_batch)
        loss = criterion(output, y_batch)
        loss.backward()
        optimizer.step()
        epoch_loss += loss.item() * X_batch.size(0)
    epoch_loss /= len(train_ds)

    model.eval()
    with torch.no_grad():
        val_pred = model(X_val_t).argmax(dim=1)
        val_acc = (val_pred == y_val_t).float().mean().item()

    if val_acc > best_val_acc:
        best_val_acc = val_acc
        best_state = {k: v.clone() for k, v in model.state_dict().items()}

    print(f"Epoch {epoch} | Loss: {epoch_loss:.4f} | Val Acc: {val_acc:.4f} | Best: {best_val_acc:.4f}")

print(f"\nBest validation accuracy: {best_val_acc:.4f}")
model.load_state_dict(best_state)

# Evaluate on Test using the best checkpoint, not the final epoch.
model.eval()
with torch.no_grad():
    test_pred = model(X_test_t).argmax(dim=1)
    test_acc = (test_pred == y_test_t).float().mean()
    print(f"\nTest Accuracy: {test_acc:.4f}")
    print(classification_report(y_test_enc, test_pred.numpy(), target_names=le.classes_))

joblib.dump(le, os.path.join(ARTIFACTS_DIR, "daisee_lstm_label_encoder.pkl"))
torch.save(best_state, os.path.join(ARTIFACTS_DIR, "daisee_lstm_model.pt"))
print(f"\nSaved label encoder and best model state to {ARTIFACTS_DIR}")

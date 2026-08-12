import os
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score

table_dir = '/Users/songye/Desktop/Dev/REU/CREMA-D/table'
list_of_csvs = [csv for csv in os.listdir(table_dir) if csv.endswith(".csv")]

# get AU columns from first file
first_df = pd.read_csv(os.path.join(table_dir, list_of_csvs[0]))
first_df.columns = first_df.columns.str.strip()
au_cols = [col for col in first_df.columns 
           if col.startswith('AU') and (col.endswith('_r') or col.endswith('_c'))]

MAX_FRAMES = 100  # pad/truncate all clips to same length

sequences = []
labels = []
actors = []

print("Loading sequences...")
for csv in list_of_csvs:
    df = pd.read_csv(os.path.join(table_dir, csv))
    df.columns = df.columns.str.strip()
    
    # get per-frame AU values
    frames = df[au_cols].values.astype(float)
    
    # pad or truncate to MAX_FRAMES
    if len(frames) >= MAX_FRAMES:
        frames = frames[:MAX_FRAMES]
    else:
        pad = np.zeros((MAX_FRAMES - len(frames), len(au_cols)))
        frames = np.vstack([frames, pad])
    
    sequences.append(frames)
    labels.append(csv.split('_')[2])
    actors.append(csv.split('_')[0])

sequences = np.array(sequences)  # shape: (n_clips, MAX_FRAMES, n_AUs)
labels = np.array(labels)
actors = np.array(actors)

print(f"Sequences shape: {sequences.shape}")

# actor-independent split
unique_actors = np.unique(actors)
train_actors = unique_actors[:73]
test_actors = unique_actors[73:]

train_mask = np.isin(actors, train_actors)
test_mask = np.isin(actors, test_actors)

X_train = sequences[train_mask]
y_train = labels[train_mask]
X_test = sequences[test_mask]
y_test = labels[test_mask]

# encode labels
le = LabelEncoder()
y_train_enc = le.fit_transform(y_train)
y_test_enc = le.transform(y_test)

# normalize per AU column across training set
scaler = StandardScaler()
n_train, T, n_au = X_train.shape
X_train_flat = X_train.reshape(-1, n_au)
X_train_flat = scaler.fit_transform(X_train_flat)
X_train = X_train_flat.reshape(n_train, T, n_au)

n_test = X_test.shape[0]
X_test_flat = X_test.reshape(-1, n_au)
X_test_flat = scaler.transform(X_test_flat)
X_test = X_test_flat.reshape(n_test, T, n_au)

# convert to tensors
X_train_t = torch.FloatTensor(X_train)
y_train_t = torch.LongTensor(y_train_enc)
X_test_t = torch.FloatTensor(X_test)
y_test_t = torch.LongTensor(y_test_enc)

# dataset and dataloader
class EmotionDataset(Dataset):
    def __init__(self, X, y):
        self.X = X
        self.y = y
    def __len__(self):
        return len(self.y)
    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

train_loader = DataLoader(EmotionDataset(X_train_t, y_train_t), batch_size=32, shuffle=True)

# define LSTM
class EmotionLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, num_classes):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, 
                            batch_first=True, dropout=0.3)
        self.fc = nn.Linear(hidden_size, num_classes)
    
    def forward(self, x):
        out, _ = self.lstm(x)
        out = out[:, -1, :]  # take last timestep
        return self.fc(out)

model = EmotionLSTM(
    input_size=len(au_cols),
    hidden_size=128,
    num_layers=2,
    num_classes=len(le.classes_)
)

optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

# train
for epoch in range(50):
    model.train()
    total_loss = 0
    for X_batch, y_batch in train_loader:
        optimizer.zero_grad()
        output = model(X_batch)
        loss = criterion(output, y_batch)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    
    if epoch % 5 == 0:
        model.eval()
        with torch.no_grad():
            pred = model(X_test_t).argmax(dim=1)
            acc = (pred == y_test_t).float().mean()
        print(f"Epoch {epoch} | Loss: {total_loss:.4f} | Acc: {acc:.4f}")

# final evaluation
model.eval()
with torch.no_grad():
    test_pred = model(X_test_t).argmax(dim=1)
    print(f"\nLSTM Test Accuracy: {(test_pred == y_test_t).float().mean():.4f}")
    print(classification_report(y_test_enc, test_pred.numpy(), target_names=le.classes_))
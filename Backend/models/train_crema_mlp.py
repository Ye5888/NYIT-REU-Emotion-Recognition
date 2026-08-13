import os
import subprocess
import pandas as pd
import numpy as np
from scipy.stats import linregress
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.svm import SVC
from sklearn.metrics import classification_report, accuracy_score
import torch
import torch.nn as nn
import opensmile
import joblib

# paths
table_dir = '/Users/songye/Desktop/Dev/REU/CREMA-D/table'
wav_dir = '/Users/songye/Desktop/Dev/REU/CREMA-D/AudioWAV'

smile = opensmile.Smile(
    feature_set=opensmile.FeatureSet.emobase,
    feature_level=opensmile.FeatureLevel.Functionals,
)

list_of_csvs = [csv for csv in os.listdir(table_dir) if csv.endswith(".csv")]
rows = []

first_df = pd.read_csv(os.path.join(table_dir, list_of_csvs[0]))
first_df.columns = first_df.columns.str.strip()
cols_order = [col for col in first_df.columns 
              if col.startswith('AU') and (col.endswith('_r') or col.endswith('_c'))]

for csv in list_of_csvs:
    df = pd.read_csv(os.path.join(table_dir, csv))
    df.columns = df.columns.str.strip()
    au_cols = [col for col in df.columns 
           if col.startswith('AU') and (col.endswith('_r') or col.endswith('_c'))]

    list_means, list_std, list_max, list_min = [], [], [], []
    list_first_quartile, list_medians, list_third_quartile = [], [], []
    list_argmin, list_argmax, list_range = [], [], []
    list_lower_iqr, list_upper_iqr, list_iqr = [], [], []
    list_kurtosis, list_slope, list_intercept = [], [], []
    list_p_value, list_std_err, list_r_squared, list_skew = [], [], [], []

    for col in au_cols:
        list_means.append(df[col].mean())
        list_std.append(df[col].std())
        list_max.append(df[col].max())
        list_min.append(df[col].min())
        list_first_quartile.append(df[col].quantile(0.25))
        list_medians.append(df[col].median())
        list_third_quartile.append(df[col].quantile(0.75))
        list_argmin.append(df[col].idxmin())
        list_argmax.append(df[col].idxmax())
        list_range.append(df[col].max() - df[col].min())
        list_lower_iqr.append(df[col].quantile(0.5) - df[col].quantile(0.25))
        list_upper_iqr.append(df[col].quantile(0.75) - df[col].quantile(0.5))
        list_iqr.append(df[col].quantile(0.75) - df[col].quantile(0.25))
        list_kurtosis.append(df[col].kurt())
        slope, intercept, r_value, p_value, std_err = linregress(range(len(df)), df[col])
        list_slope.append(slope)
        list_intercept.append(intercept)
        list_p_value.append(p_value)
        list_std_err.append(std_err)
        list_r_squared.append(r_value ** 2)
        list_skew.append(df[col].skew())

    audio_csv = os.path.join(wav_dir, csv.replace(".csv", ".wav"))
    audio_features = smile.process_file(audio_csv).values.flatten().tolist()
    emotion = csv.split('_')[2]

    total_list = (list_means + list_std + list_max + list_min +
              list_first_quartile + list_medians + list_third_quartile +
              list_argmin + list_argmax + list_range +
              list_lower_iqr + list_upper_iqr + list_iqr +
              list_kurtosis + list_slope + list_intercept +
              list_p_value + list_std_err + list_r_squared +
              list_skew + audio_features + [emotion])
    rows.append(total_list)

sample_audio = os.path.join(wav_dir, os.listdir(wav_dir)[0])
audio_col_names = list(smile.process_file(sample_audio).columns)
col_names = ([col + '_mean' for col in cols_order] + 
             [col + '_std' for col in cols_order] + 
             [col + '_max' for col in cols_order] +
             [col + '_min' for col in cols_order] +
             [col + '_first_quartile' for col in cols_order] +
             [col + '_median' for col in cols_order] +
             [col + '_third_quartile' for col in cols_order] + 
             [col + '_argmin' for col in cols_order] + 
             [col + '_argmax' for col in cols_order] + 
             [col + '_range' for col in cols_order] +
             [col + '_lower_iqr' for col in cols_order] + 
             [col + '_upper_iqr' for col in cols_order] + 
             [col + '_iqr' for col in cols_order] + 
             [col + '_kurtosis' for col in cols_order] +
             [col + '_slope' for col in cols_order] + 
             [col + '_intercept' for col in cols_order] +
             [col + '_p_value' for col in cols_order] +
             [col + '_std_err' for col in cols_order] +
             [col + '_r_squared' for col in cols_order] + 
             [col + '_skew' for col in cols_order] +
             audio_col_names + ['Emotion'])

feature_matrix = pd.DataFrame(rows, columns=col_names)
feature_matrix = feature_matrix.dropna(axis=1)
feature_matrix["Actor"] = [csv.split('_')[0] for csv in list_of_csvs]

print(f"Feature matrix shape: {feature_matrix.shape}")

# actor-independent split
list_actors = feature_matrix["Actor"].unique()
train_actors = list_actors[:73]
test_actors = list_actors[73:]

train_df = feature_matrix[feature_matrix["Actor"].isin(train_actors)]
test_df = feature_matrix[feature_matrix["Actor"].isin(test_actors)]

X_train = train_df.drop(columns=["Actor", "Emotion"]).values.astype(float)
y_train = train_df["Emotion"].values
X_test = test_df.drop(columns=["Actor", "Emotion"]).values.astype(float)
y_test = test_df["Emotion"].values

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)

# encode labels
le = LabelEncoder()
y_train_enc = le.fit_transform(y_train)
y_test_enc = le.transform(y_test)

# MLP
X_train_t = torch.FloatTensor(X_train_s)
y_train_t = torch.LongTensor(y_train_enc)
X_test_t = torch.FloatTensor(X_test_s)
y_test_t = torch.LongTensor(y_test_enc)

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

model = EmotionMLP(input_size=X_train_s.shape[1], num_classes=len(le.classes_))
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

for epoch in range(100):
    model.train()
    optimizer.zero_grad()
    output = model(X_train_t)
    loss = criterion(output, y_train_t)
    loss.backward()
    optimizer.step()
    if epoch % 10 == 0:
        model.eval()
        with torch.no_grad():
            pred = model(X_test_t).argmax(dim=1)
            acc = (pred == y_test_t).float().mean()
        print(f"Epoch {epoch} | Loss: {loss.item():.4f} | Acc: {acc:.4f}")

model.eval()
with torch.no_grad():
    test_pred = model(X_test_t).argmax(dim=1)
    print(f"\nMLP Test Accuracy: {(test_pred == y_test_t).float().mean():.4f}")
    print(classification_report(y_test_enc, test_pred.numpy(), target_names=le.classes_))


print("\n" + "="*50)
print("RANDOM SPLIT (dependent model)")
print("="*50)

X_all = feature_matrix.drop(columns=["Emotion", "Actor"], errors="ignore").values.astype(float)
y_all = feature_matrix["Emotion"].to_numpy()

X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X_all, y_all, test_size=0.2, random_state=42, stratify=y_all)

le_r = LabelEncoder()
y_train_r_enc = le_r.fit_transform(y_train_r)
y_test_r_enc = le_r.transform(y_test_r)

scaler_r = StandardScaler()
X_train_r_s = scaler_r.fit_transform(X_train_r)
X_test_r_s = scaler_r.transform(X_test_r)

X_train_r_t = torch.FloatTensor(X_train_r_s)
y_train_r_t = torch.LongTensor(y_train_r_enc)
X_test_r_t = torch.FloatTensor(X_test_r_s)
y_test_r_t = torch.LongTensor(y_test_r_enc)

model_r = EmotionMLP(input_size=X_train_r_s.shape[1], num_classes=len(le_r.classes_))
optimizer_r = torch.optim.Adam(model_r.parameters(), lr=0.001)

for epoch in range(100):
    model_r.train()
    optimizer_r.zero_grad()
    output_r = model_r(X_train_r_t)
    loss_r = criterion(output_r, y_train_r_t)
    loss_r.backward()
    optimizer_r.step()
    if epoch % 10 == 0:
        model_r.eval()
        with torch.no_grad():
            pred_r = model_r(X_test_r_t).argmax(dim=1)
            acc_r = (pred_r == y_test_r_t).float().mean()
        print(f"Epoch {epoch} | Loss: {loss_r.item():.4f} | Acc: {acc_r:.4f}")

model_r.eval()
with torch.no_grad():
    test_pred_r = model_r(X_test_r_t).argmax(dim=1)
    print(f"\nMLP Random Split Accuracy: {(test_pred_r == y_test_r_t).float().mean():.4f}")
    print(classification_report(y_test_r_enc, test_pred_r.numpy(), target_names=le_r.classes_))
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import classification_report, accuracy_score, f1_score
from imblearn.over_sampling import SMOTE
import os
import pandas as pd

OUTPUT_DIR = os.getenv("DAISEE_OUTPUT_DIR", "/home/yesongquing/daisee_output")
ARTIFACTS_DIR = os.getenv("DAISEE_ARTIFACTS_DIR", OUTPUT_DIR) # Where we will output our joblib models
os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def load_split(split):
    path = os.path.join(OUTPUT_DIR, f"{split}_features.csv")
    df = pd.read_csv(path, on_bad_lines="warn")

    X = df.drop(columns=["ClipID", "Emotion"]).values.astype(float)
    y = df["Emotion"].values
    return X, y




X_train, y_train = load_split("Train")
X_validation, y_validation = load_split("Validation")
X_test, y_test = load_split("Test")

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_validation_scaled = scaler.transform(X_validation)
X_test_scaled = scaler.transform(X_test)

smote = SMOTE(random_state=42, k_neighbors=5)
X_train_resampled, y_train_resampled = smote.fit_resample(X_train_scaled, y_train)

candidate_Cs = [0.1, 1, 10, 100]
best_C = None
best_val_score = -1
best_model = None

for c in candidate_Cs:
    model = SVC(kernel = 'rbf', C = c, gamma = 'scale')
    model.fit(X_train_resampled, y_train_resampled)

    val_pred = model.predict(X_validation_scaled)
    val_score = f1_score(y_validation, val_pred, average='macro')

    print(f"C={c}: Validation macro F1 = {val_score:.4f}")

    if val_score > best_val_score:
        best_val_score = val_score
        best_C = c
        best_model = model

print(f"\nBest C: {best_C} (Validation macro F1: {best_val_score:.4f})")



y_pred = best_model.predict(X_test_scaled)

print(accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

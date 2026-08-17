import os
import numpy as np
import pandas as pd

OUTPUT_DIR = os.getenv("DAISEE_OUTPUT_DIR", "/home/yesongquing/daisee_output")


def load_clip_sequence(split, clip_id):
    """Read one clip's raw per-frame OpenFace CSV (already produced by
    extract_daisee.py -- not re-running OpenFace here) and return its AU
    columns as a (num_frames, num_au_cols) array, plus the AU column names.
    Unlike extract_features() in extract_daisee.py, this does NOT collapse
    the frame sequence into statistics -- the whole point of an LSTM is to
    let the model see the sequence itself.
    """
    csv_dir = os.path.join(OUTPUT_DIR, split, "csvs")
    clip_folder = os.path.splitext(clip_id)[0]  # "1100011002.avi" -> "1100011002"
    csv_path = os.path.join(csv_dir, clip_folder + ".csv")

    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip()
    au_cols = [col for col in df.columns
               if col.startswith('AU') and (col.endswith('_r') or col.endswith('_c'))]

    if not au_cols:
        raise ValueError("no AU columns in OpenFace output")

    return df[au_cols].values.astype(np.float32), au_cols


def load_split_sequences(split, max_len=None):
    """Load every valid clip in a split as a padded (num_clips, max_len,
    num_au_cols) array, plus its labels. Reuses {split}_features.csv's
    ClipID/Emotion columns as the trusted clip list -- same population
    train_daisee.py / train_daisee_svm.py already trained on -- rather than
    re-deriving it from the labels CSV, so this stays apples-to-apples with
    the MLP/SVM results.
    """
    features_path = os.path.join(OUTPUT_DIR, f"{split}_features.csv")
    clip_labels = pd.read_csv(
        features_path, on_bad_lines="warn", usecols=["ClipID", "Emotion"]
    )

    sequences = []
    labels = []
    au_cols_ref = None

    for clip_id, emotion in zip(clip_labels["ClipID"], clip_labels["Emotion"]):
        try:
            seq, au_cols = load_clip_sequence(split, clip_id)
        except Exception as e:
            print(f"{split}: skipping {clip_id} for sequence loading ({type(e).__name__}: {e})")
            continue

        # Same defensive check as extract_daisee.py's CSV-mismatch fix --
        # every clip needs the same AU columns in the same order, or the
        # feature axis wouldn't mean the same thing from clip to clip.
        if au_cols_ref is None:
            au_cols_ref = au_cols
        elif au_cols != au_cols_ref:
            print(f"{split}: skipping {clip_id} (AU column mismatch)")
            continue

        sequences.append(seq)
        labels.append(emotion)

    if not sequences:
        raise RuntimeError(f"{split}: no usable clips found")

    if max_len is None:
        max_len = max(seq.shape[0] for seq in sequences)

    num_au_cols = len(au_cols_ref)
    X = np.zeros((len(sequences), max_len, num_au_cols), dtype=np.float32)
    for i, seq in enumerate(sequences):
        length = min(seq.shape[0], max_len)
        X[i, :length, :] = seq[:length]  # zero-pad short clips, truncate long ones

    y = np.array(labels)
    print(f"{split}: {len(sequences)} clips loaded, sequence length {max_len}, {num_au_cols} AU columns")
    return X, y, max_len

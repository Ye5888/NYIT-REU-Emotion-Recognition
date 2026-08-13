import os
import subprocess
import pandas as pd
import numpy as np
from scipy.stats import linregress

# Configurable via env var so this can run on any machine with the dataset +
# OpenFace present, not just this one -- same fix applied to predict.py's
# OPENFACE_BIN. Defaults match today's actual VM layout.
DAISEE_ROOT = os.getenv("DAISEE_ROOT", "/home/yesongquing/DAiSEE/DAiSEE")
DATASET_DIR = os.path.join(DAISEE_ROOT, "DataSet")
LABELS_DIR = os.path.join(DAISEE_ROOT, "Labels")
OUTPUT_DIR = os.getenv("DAISEE_OUTPUT_DIR", "/home/yesongquing/daisee_output")
OPENFACE_BIN = os.getenv("OPENFACE_BIN", "/home/yesongquing/OpenFace/build/bin/FeatureExtraction")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# No audio extraction here -- CREMA-D was audio-visual, DAiSEE is video-only
# webcam recordings of students during e-learning. Don't assume the clips
# even carry a usable audio track; verify first with, e.g.:
#   ffprobe -v error -show_entries stream=codec_type -of csv=p=0 <clip>.avi
# If that prints a video-only stream (no `audio` line), there's nothing to
# extract. If it does print audio, listen to a couple of samples before
# trusting it -- webcam audio in an "in the wild" dataset could easily be
# silent or pure room noise, and openSMILE will still happily emit 988
# numbers from that either way.

def run_openface(video_path, csv_output_dir):
    subprocess.run([
        OPENFACE_BIN,
        "-f", video_path,
        "-out_dir", csv_output_dir
    ], capture_output=True)

def extract_features(df):
    df.columns = df.columns.str.strip()
    au_cols = [col for col in df.columns
               if col.startswith('AU') and (col.endswith('_r') or col.endswith('_c'))]

    lists = {stat: [] for stat in ['means','std','max','min','q1','median','q3',
                                    'argmin','argmax','range','lower_iqr','upper_iqr',
                                    'iqr','kurtosis','slope','intercept','p_value',
                                    'std_err','r_squared','skew']}
    for col in au_cols:
        lists['means'].append(df[col].mean())
        lists['std'].append(df[col].std())
        lists['max'].append(df[col].max())
        lists['min'].append(df[col].min())
        lists['q1'].append(df[col].quantile(0.25))
        lists['median'].append(df[col].median())
        lists['q3'].append(df[col].quantile(0.75))
        lists['argmin'].append(df[col].idxmin())
        lists['argmax'].append(df[col].idxmax())
        lists['range'].append(df[col].max() - df[col].min())
        lists['lower_iqr'].append(df[col].quantile(0.5) - df[col].quantile(0.25))
        lists['upper_iqr'].append(df[col].quantile(0.75) - df[col].quantile(0.5))
        lists['iqr'].append(df[col].quantile(0.75) - df[col].quantile(0.25))
        lists['kurtosis'].append(df[col].kurt())
        col_data = df[col].values
        x = np.arange(len(col_data))
        mask = ~np.isnan(col_data)
        if mask.sum() > 1:
            slope, intercept, r_value, p_value, std_err = linregress(x[mask], col_data[mask])
        else:
            slope = intercept = r_value = p_value = std_err = 0
        lists['slope'].append(slope)
        lists['intercept'].append(intercept)
        lists['p_value'].append(p_value)
        lists['std_err'].append(std_err)
        lists['r_squared'].append(r_value ** 2)
        lists['skew'].append(df[col].skew())

    total = []
    for stat in lists:
        total.extend(lists[stat])
    return total, au_cols

# DAiSEE gives four separate 0-3 intensity scores per clip, not one label.
# Collapsing to a single dominant label is a real modeling decision -- it
# discards real information (a clip can be moderately bored AND moderately
# frustrated at once) -- kept here only because /predict and the chatbot
# prompt currently expect a single `emotion: string`, matching the
# CREMA-D-era shape. Whether that's still the right framing given DAiSEE's
# actual structure is an open question for the team, not settled by this
# function.
#
# The four-way tie order below (Boredom > Engagement > Confusion >
# Frustration) is arbitrary, not derived from the data -- previously it was
# an accidental side effect of Python dict insertion order, silently always
# favoring Boredom on a tie. Made explicit here, and every tie is counted
# and reported so you know how often it actually matters, since DAiSEE's
# labels are known to skew heavily toward moderate "Engagement" and ties
# are likely common.
EMOTION_PRIORITY = ['Boredom', 'Engagement', 'Confusion', 'Frustration']

def get_dominant_emotion(row):
    scores = {name: row[name] for name in EMOTION_PRIORITY}
    best = max(scores.values())
    tied = [name for name in EMOTION_PRIORITY if scores[name] == best]
    return tied[0], len(tied) > 1

# process each split
for split in ['Train', 'Validation', 'Test']:
    labels_file = os.path.join(LABELS_DIR, f"{split}Labels.csv")
    labels_df = pd.read_csv(labels_file)
    labels_df.columns = labels_df.columns.str.strip()

    dominant = labels_df.apply(get_dominant_emotion, axis=1, result_type='expand')
    labels_df['Emotion'] = dominant[0]
    labels_df['EmotionTied'] = dominant[1]
    tie_count = int(labels_df['EmotionTied'].sum())
    print(f"{split}: {tie_count}/{len(labels_df)} clips had a tied dominant label")

    labels_dict = dict(zip(labels_df['ClipID'], labels_df['Emotion']))

    rows = []
    cols_order = None
    csv_dir = os.path.join(OUTPUT_DIR, split, "csvs")
    os.makedirs(csv_dir, exist_ok=True)

    split_dir = os.path.join(DATASET_DIR, split)

    for subject in os.listdir(split_dir):
        subject_dir = os.path.join(split_dir, subject)
        if not os.path.isdir(subject_dir):
            continue
        for clip_folder in os.listdir(subject_dir):
            clip_id = clip_folder + ".avi"
            if clip_id not in labels_dict:
                continue

            video_path = os.path.join(subject_dir, clip_folder, clip_id)
            if not os.path.exists(video_path):
                continue

            emotion = labels_dict[clip_id]

            # run openface
            run_openface(video_path, csv_dir)

            csv_name = clip_folder + ".csv"
            csv_path = os.path.join(csv_dir, csv_name)
            if not os.path.exists(csv_path):
                continue

            df = pd.read_csv(csv_path)

            visual_features, au_cols = extract_features(df)

            if cols_order is None:
                cols_order = au_cols

            total = visual_features + [emotion]
            rows.append(total)

    # build column names from first processed file
    if rows and cols_order:
        stat_names = ['mean','std','max','min','q1','median','q3','argmin','argmax',
                      'range','lower_iqr','upper_iqr','iqr','kurtosis','slope',
                      'intercept','p_value','std_err','r_squared','skew']
        col_names = []
        for stat in stat_names:
            col_names.extend([f"{col}_{stat}" for col in cols_order])
        col_names += ['Emotion']

        feature_matrix = pd.DataFrame(rows, columns=col_names)
        feature_matrix = feature_matrix.dropna(axis=0)
        out_path = os.path.join(OUTPUT_DIR, f"{split}_features.csv")
        feature_matrix.to_csv(out_path, index=False)
        print(f"{split}: {len(feature_matrix)} clips saved to {out_path}")

import os
import csv
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
# webcam recordings of students during e-learning. Confirmed empirically:
#   ffprobe -v error -show_entries stream=codec_type -of csv=p=0 <clip>.avi
# prints only `video` for DAiSEE clips -- no audio stream exists at all.

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
    if not au_cols:
        raise ValueError("no AU columns in OpenFace output")

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

    # kurtosis/skewness (and occasionally r_squared, for a constant y) are
    # mathematically undefined for a column with zero variance -- their
    # formulas divide by it. OpenFace emits both continuous (_r) and binary
    # presence (_c) columns per Action Unit, and it's routine for a _c
    # column to never fire (or always fire) across a whole 10-second clip,
    # so at least one constant column per clip turns out to be the common
    # case, not the exception. Previously this NaN only got noticed when
    # the *entire* dataset was assembled and .dropna() silently discarded
    # nearly every row at the very end. Treating "no defined shape for a
    # flat signal" as 0 is a standard, defensible convention -- it's not
    # hiding a data problem, it's the correct value for a degenerate case.
    total = [0.0 if isinstance(v, float) and np.isnan(v) else v for v in total]

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

STAT_NAMES = ['mean','std','max','min','q1','median','q3','argmin','argmax',
              'range','lower_iqr','upper_iqr','iqr','kurtosis','slope',
              'intercept','p_value','std_err','r_squared','skew']

def build_column_names(au_cols):
    col_names = ['ClipID']
    for stat in STAT_NAMES:
        col_names.extend([f"{col}_{stat}" for col in au_cols])
    col_names.append('Emotion')
    return col_names

if __name__ == "__main__":
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

        csv_dir = os.path.join(OUTPUT_DIR, split, "csvs")
        os.makedirs(csv_dir, exist_ok=True)
        split_dir = os.path.join(DATASET_DIR, split)
        out_path = os.path.join(OUTPUT_DIR, f"{split}_features.csv")

        # Resume support: a crash used to lose an entire split's work, because
        # nothing was written to out_path until every clip in the split had
        # finished -- the crash that prompted this rewrite lost hours of work
        # for exactly that reason. Now every clip is appended and flushed
        # immediately, and re-running after a crash picks up from whatever's
        # already in {split}_features.csv instead of starting the split over.
        already_done = set()
        col_names = None
        # au_cols (and therefore the header) is only ever established from the
        # first clip successfully processed in a split. Nothing previously
        # checked that every later clip actually produced the same number of AU
        # columns -- OpenFace can emit a different AU set for an odd clip across
        # a ~9000-clip, multi-restart run, and that row would silently get
        # written with a different field count than the header. That's exactly
        # what caused pandas.errors.ParserError: "Expected 702 fields ... saw
        # 1309" when train_daisee.py later tried to read the file. Tracking the
        # expected feature-vector length lets every subsequent clip be checked
        # before it's written, instead of after the fact.
        expected_feature_len = None
        if os.path.exists(out_path):
            with open(out_path, newline='') as f:
                reader = csv.reader(f)
                header = next(reader, None)
                if header:
                    col_names = header
                    expected_feature_len = len(header) - 2  # minus ClipID, Emotion
                    clip_idx = header.index('ClipID')
                    for row in reader:
                        if row:
                            already_done.add(row[clip_idx])
            print(f"{split}: resuming, {len(already_done)} clips already recorded in {out_path}")

        processed = 0
        skipped = 0

        with open(out_path, 'a', newline='') as out_file:
            writer = csv.writer(out_file)

            for subject in sorted(os.listdir(split_dir)):
                subject_dir = os.path.join(split_dir, subject)
                if not os.path.isdir(subject_dir):
                    continue
                for clip_folder in sorted(os.listdir(subject_dir)):
                    clip_id = clip_folder + ".avi"
                    if clip_id not in labels_dict or clip_id in already_done:
                        continue

                    video_path = os.path.join(subject_dir, clip_folder, clip_id)
                    if not os.path.exists(video_path):
                        continue

                    emotion = labels_dict[clip_id]
                    csv_path = os.path.join(csv_dir, clip_folder + ".csv")

                    # Skip re-running OpenFace if this clip's output already
                    # exists from an earlier (possibly crashed) run -- that's
                    # the slow part, no need to redo it on a resume.
                    if not os.path.exists(csv_path):
                        run_openface(video_path, csv_dir)

                    # A single bad clip (OpenFace produced an empty or malformed
                    # CSV -- no face detected, corrupted frame, etc.) used to
                    # crash the entire multi-hour run via an uncaught
                    # pandas.errors.EmptyDataError. Skip and log instead.
                    try:
                        df = pd.read_csv(csv_path)
                        visual_features, au_cols = extract_features(df)
                        if any(pd.isna(v) for v in visual_features):
                            raise ValueError("NaN in extracted features")
                        # Guard against a clip whose OpenFace output has a
                        # different AU column count than whatever clip
                        # established this split's header -- writing it anyway
                        # would silently corrupt the CSV's column alignment.
                        if expected_feature_len is not None and len(visual_features) != expected_feature_len:
                            raise ValueError(
                                f"feature count mismatch: expected {expected_feature_len}, "
                                f"got {len(visual_features)} -- OpenFace likely produced a "
                                f"different AU column set for this clip"
                            )
                    except Exception as e:
                        skipped += 1
                        print(f"{split}: skipping {clip_id} ({type(e).__name__}: {e})")
                        continue

                    if col_names is None:
                        col_names = build_column_names(au_cols)
                        writer.writerow(col_names)
                        expected_feature_len = len(visual_features)

                    writer.writerow([clip_id] + visual_features + [emotion])
                    out_file.flush()
                    processed += 1

        print(f"{split}: {processed} clips newly processed, {skipped} skipped, saved to {out_path}")

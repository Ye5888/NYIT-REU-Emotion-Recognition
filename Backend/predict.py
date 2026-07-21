import joblib
import pandas as pd
import numpy as np
from scipy.stats import linregress
import opensmile
import subprocess
import os

models_dir = os.path.join(os.path.dirname(__file__), "models")

dependent_model = joblib.load(os.path.join(models_dir, "dependent_model.pkl"))
dependent_scaler = joblib.load(os.path.join(models_dir, "dependent_scaler.pkl"))
independent_model = joblib.load(os.path.join(models_dir, "independent_model.pkl"))
independent_scaler = joblib.load(os.path.join(models_dir, "independent_scaler.pkl"))

smile = opensmile.Smile(
    feature_set=opensmile.FeatureSet.emobase,
    feature_level=opensmile.FeatureLevel.Functionals,
)


def predict_emotion(video_path, audio_path):
    csv_dir = os.path.join(os.path.dirname(__file__), "uploads/CSVs/")
    video_name = os.path.basename(video_path)

    run_openface(video_path, csv_dir)
    csv_name = video_name.replace(".mp4", ".csv")
    csv_path = os.path.join(csv_dir, csv_name)

    df = pd.read_csv(csv_path)

    # Need to make the feature vector now
    df.columns = df.columns.str.strip()
    
    
    au_cols = [col for col in df.columns 
           if col.startswith('AU') and (col.endswith('_r') or col.endswith('_c'))]

    list_means = []                   
    list_std = []
    list_max = []
    list_min = []
    list_first_quartile = []
    list_medians = []
    list_third_quartile = []
    list_argmin = []
    list_argmax = []
    list_range = []
    list_lower_iqr = []
    list_upper_iqr = []
    list_iqr = []
    list_kurtosis = []
    list_slope = []
    list_intercept = []
    list_p_value = []
    list_std_err = []
    list_r_squared = []
    list_skew = []                   

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

    
    audio_name = video_name.replace(".mp4", ".wav")
    audio_csv = os.path.join(audio_path, audio_name)
    audio_features = smile.process_file(audio_csv).values.flatten().tolist()

    # Total list
    total_list = (list_means + list_std + list_max + list_min +
              list_first_quartile + list_medians + list_third_quartile +
              list_argmin + list_argmax + list_range +
              list_lower_iqr + list_upper_iqr + list_iqr +
              list_kurtosis + list_slope + list_intercept +
              list_p_value + list_std_err + list_r_squared +
              list_skew + audio_features)


    feature_vector = np.array(total_list).reshape(1,-1)
    feature_vector = np.nan_to_num(feature_vector)
    feature_vector_scaled = dependent_scaler.transform(feature_vector)
    prediction = dependent_model.predict(feature_vector_scaled)[0]

    return prediction


def run_openface(video_path, csv_output_dir):
    # Get absolute path for Docker volume mount
    abs_video_path = os.path.abspath(video_path)
    abs_csv_dir = os.path.abspath(csv_output_dir)
    
    subprocess.run([
        "docker", "run", "--rm",
        "--platform", "linux/amd64",
        "-v", f"{os.path.dirname(abs_video_path)}:/data/video",
        "-v", f"{abs_csv_dir}:/data/output",
        "algebr/openface:latest",
        "/home/openface-build/build/bin/FeatureExtraction",
        "-f", f"/data/video/{os.path.basename(abs_video_path)}",
        "-out_dir", "/data/output/"
    ])

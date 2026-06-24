#!/bin/bash
for f in /data/mp4/*.mp4; do
    /home/openface-build/build/bin/FeatureExtraction -f "$f" -out_dir /data/output/
done
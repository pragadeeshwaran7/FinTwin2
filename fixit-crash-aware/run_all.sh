#!/usr/bin/env bash
set -e

# 1. fetch data
python data_fetch.py
echo "done data fetch"

# 2. feature engineering
python features.py
echo "done feature engineering"

# 3. labeling
python labeling.py
echo "done labeling"

# 4. train supervised RF
python train_supervised.py
echo "done training supervised model"

# 5. train isolation forest
python anomaly_detector.py
echo "done training isolation forest"

# 6. train LSTM autoencoder (may take time)
python train_autoencoder.py
echo "done training autoencoder"

# 7. generate scores & alerts
python -c "from anomaly_detector import score_continuous; import pandas as pd; df=score_continuous(); import alerting; alerting.generate_alerts(df, threshold=0.6)"

echo "Pipeline finished. Run streamlit app: streamlit run app_streamlit.py"

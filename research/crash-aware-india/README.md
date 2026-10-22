# Fixit — Crash-aware detection & anomaly pipeline

This repo builds a crash-aware pipeline: fetch market + VIX data, engineer features, label crisis windows, train a supervised "crisis fingerprint" model (RandomForest), an LSTM Autoencoder (sequence anomaly detector), an IsolationForest (point anomalies), combine scores into risk_index, compute SHAP explanations, and serve a minimal Streamlit dashboard.

## File list
See project root. Each file is separate and intended to be pasted into your editor.

## Quick setup
1. Create and activate a virtualenv:
   python -m venv venv
   source venv/bin/activate   # Mac/Linux
   venv\Scripts\activate      # Windows

2. Install:
   pip install -r requirements.txt

3. Run the full pipeline (fetch -> features -> label -> train):
   bash run_all.sh

4. Run Streamlit dashboard:
   streamlit run app_streamlit.py

## Notes & parameters
- Default tickers: SPY index ETF + ^VIX. You can add sector ETFs in `config.py`.
- Manual crisis windows are in `labeling.py` — add or adjust dates.
- Models are stored in `models/` (created by scripts).
- Use time-series CV for production retraining — the scripts use a simple train/test split for a quick start.
- SHAP calculation can be slow — limit samples or compute offline.

## Next steps
- Add news sentiment ingestion (GDELT / News API).
- Add additional tickers / features (bonds, credit spreads).
- Replace RandomForest with XGBoost or a small transformer for improved accuracy.

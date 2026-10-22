# Research code from the original branches

Preserved as-is for reference (virtualenvs, node_modules and secrets removed). The working app
in `../ml` re-implements these ideas as live services.

| Folder | Branch | Contents |
|---|---|---|
| `crash-aware-india/` | `fixit-indian-stock` (also `fixit-stock`, `QLSTM`) | NIFTY/India VIX crash-aware pipeline: data fetch, features, labelling, RF + IsolationForest + LSTM autoencoder, SHAP alerts, Streamlit app |
| `qlstm/` | `QLSTM` | LSTM/GRU/attention and PennyLane quantum-LSTM forecasting, FastAPI serving |
| `qaoa-portfolio/` | `qaoa` | TwinLSTM + PennyLane QAOA portfolio allocation, backtest, Streamlit app |
| `forecasting-baselines/` | `trial-1` | LSTM, GRU, TCN, RandomForest baselines and an early QAOA optimiser |
| `realtime-model-serving/` | `realtime-dashboard` | Dockerised LSTM/GRU/QLSTM/QGRU model services, Alpha Vantage pipeline, Flask dashboard |
| `legacy-webapp/model-wrappers/` | `webapp` | Original Python wrappers for the model cards (their `.pkl` artifacts were never committed) |

import torch
import yaml
import numpy as np
import pandas as pd
from data import get_data
from preprocessing import add_technical_indicators, select_features, fit_scaler, transform_features
from sequences import create_sequences
from model import AdvancedLSTM

# Load config
with open("config.yaml") as f:
    config = yaml.safe_load(f)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def predict_next(tickers, start, end):
    predictions = {}

    # Pick correct model path
    if config["model"].get("use_quantum", False):
        model_path = "qlstm_model.pth"
    else:
        model_path = "lstm_model.pth"

    for t, df in get_data(tickers, start, end).items():
        df = add_technical_indicators(df)
        df = select_features(df)
        scaler = fit_scaler(df)
        scaled = transform_features(df, scaler)
        X, _ = create_sequences(scaled, config["training"]["window_size"])
        X_tensor = torch.tensor(X, dtype=torch.float32).to(device)

        model = AdvancedLSTM(
            input_dim=X_tensor.shape[2],
            hidden_dim=config["model"]["hidden_dim"],
            num_layers=config["model"]["num_layers"],
            dropout=config["model"]["dropout"],
            use_quantum=config["model"].get("use_quantum", False)
        ).to(device)
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.eval()

        with torch.no_grad():
            preds = model(X_tensor).cpu().numpy()

        pred_series = pd.Series(preds.flatten(), index=df.index[config["training"]["window_size"]:])
        predictions[t] = pred_series

    return predictions

if __name__ == "__main__":
    tickers = ["AAPL", "MSFT"]
    start = "2025-01-01"
    end = "2025-09-27"

    preds = predict_next(tickers, start, end)
    for t, series in preds.items():
        print(f"\nPredictions for {t}:\n", series.tail(10))

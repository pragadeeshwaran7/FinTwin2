import yaml
import numpy as np
import pandas as pd
import torch
from data import get_data
from preprocessing import add_technical_indicators, select_features, fit_scaler, transform_features
from sequences import create_sequences
from model import LSTMModel  # PyTorch model

# Load config
with open("config.yaml") as f:
    config = yaml.safe_load(f)

def predict_next(model_path, tickers, start, end, device='cpu'):
    # Load trained model
    device = torch.device(device)
    sample_input_dim = None
    
    # Fetch & preprocess data to determine input_dim
    data_dict = get_data(tickers, start, end)
    for t, df in data_dict.items():
        df = add_technical_indicators(df)
        df = select_features(df)
        sample_input_dim = df.shape[1]
        break  # just need one sample to get input_dim

    model = LSTMModel(input_dim=sample_input_dim).to(device)
    model.load_state_dict(torch.load("lstm_model.pth", map_location=device))
    model.eval()  # set to evaluation mode

    predictions = {}
    
    for t, df in data_dict.items():
        df = add_technical_indicators(df)
        df = select_features(df)
        scaler = fit_scaler(df)
        scaled = transform_features(df, scaler)
        
        X, _ = create_sequences(scaled, config["training"]["window_size"])
        X_tensor = torch.tensor(X, dtype=torch.float32).to(device)
        
        with torch.no_grad():
            preds = model(X_tensor).cpu().numpy()
        
        # Align predictions with timestamps
        pred_series = pd.Series(preds.flatten(), index=df.index[config["training"]["window_size"]:])
        predictions[t] = pred_series
    
    return predictions

if __name__ == "__main__":
    tickers = ["AAPL", "MSFT"]
    start = "2025-01-01"
    end = "2025-09-27"
    preds = predict_next("lstm_model.pth", tickers, start, end)
    
    for t, series in preds.items():
        print(f"\nPredictions for {t}:\n", series.tail(10))

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
import yaml
import numpy as np
from data import get_data
from preprocessing import add_technical_indicators, select_features, fit_scaler, transform_features
from sequences import create_sequences
from model import AdvancedLSTM, GRUNet, AttentionGRU, AttentionLSTM

# Load config
with open("config.yaml") as f:
    config = yaml.safe_load(f)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")



def train_model(tickers, start, end, model_save_path=None):
    all_X, all_y = [], []

    data_dict = get_data(tickers, start, end)
    for t, df in data_dict.items():
        df = add_technical_indicators(df)
        df = select_features(df)
        scaler = fit_scaler(df)
        scaled = transform_features(df, scaler)
        X, y = create_sequences(scaled, config["training"]["window_size"])
        all_X.append(X)
        all_y.append(y)

    X = np.concatenate(all_X, axis=0)
    y = np.concatenate(all_y, axis=0)

    split_idx = int(len(X) * (1 - config["training"]["test_ratio"]))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    X_train = torch.tensor(X_train, dtype=torch.float32).to(device)
    y_train = torch.tensor(y_train, dtype=torch.float32).to(device)
    X_test = torch.tensor(X_test, dtype=torch.float32).to(device)
    y_test = torch.tensor(y_test, dtype=torch.float32).to(device)

    
    model_type = config["model"]["type"]  # "LSTM", "GRU", "AttentionGRU", "AttentionLSTM"

    if model_type == "LSTM":
        model = AdvancedLSTM(
            input_dim=X_train.shape[2],
            hidden_dim=config["model"]["hidden_dim"],
            num_layers=config["model"]["num_layers"],
            dropout=config["model"]["dropout"],
            use_quantum=config["model"].get("use_quantum", False)
        ).to(device)

    elif model_type == "GRU":
        model = GRUNet(
            input_dim=X_train.shape[2],
            hidden_dim=config["model"]["hidden_dim"],
            num_layers=config["model"]["num_layers"],
            dropout=config["model"]["dropout"]
        ).to(device)

    elif model_type == "AttentionGRU":
        model = AttentionGRU(
            input_dim=X_train.shape[2],
            hidden_dim=config["model"]["hidden_dim"],
            num_layers=config["model"]["num_layers"],
            dropout=config["model"]["dropout"]
        ).to(device)

    elif model_type == "AttentionLSTM":
        model = AttentionLSTM(
            input_dim=X_train.shape[2],
            hidden_dim=config["model"]["hidden_dim"],
            num_layers=config["model"]["num_layers"],
            dropout=config["model"]["dropout"]
        ).to(device)

    else:
        raise ValueError(f"Unknown model type: {model_type}")

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=config["training"]["lr"])

    for epoch in range(config["training"]["epochs"]):
        model.train()
        optimizer.zero_grad()
        outputs = model(X_train)
        loss = criterion(outputs.squeeze(), y_train)
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_loss = criterion(model(X_test).squeeze(), y_test)

        print(f"Epoch {epoch+1}/{config['training']['epochs']} - "
              f"Train Loss: {loss.item():.6f} - Val Loss: {val_loss.item():.6f}")

    # Dynamic model save path
    suffix = "_qlstm" if config["model"].get("use_quantum", False) else ""
    model_save_path = f"{model_type.lower()}{suffix}_model.pth"



    torch.save(model.state_dict(), model_save_path)
    print("Training complete. Model saved to", model_save_path)
    return model

if __name__ == "__main__":
    tickers = ["AAPL", "MSFT"]
    start = "2025-01-01"
    end = "2025-09-27"
    
    train_model(tickers, start, end)
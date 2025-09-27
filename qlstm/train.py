import os
import yaml
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset, random_split
from data import get_data
from preprocessing import add_technical_indicators, select_features, fit_scaler, transform_features
from sequences import create_sequences
from pathlib import Path

# Load config
with open("config.yaml") as f:
    config = yaml.safe_load(f)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# ---------------------
# LSTM Model Definition
# ---------------------
class LSTMModel(nn.Module):
    def __init__(self, input_dim, hidden_dim=64, num_layers=2, output_dim=1, dropout=0.2):
        super(LSTMModel, self).__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True, dropout=dropout)
        self.fc = nn.Linear(hidden_dim, output_dim)
        
    def forward(self, x):
        out, _ = self.lstm(x)
        out = out[:, -1, :]  # Take last time step
        out = self.fc(out)
        return out

# ---------------------
# Training Function
# ---------------------
def train_model(tickers, start, end, model_save_path="lstm_model.pth"):
    all_X, all_y = [], []

    # Fetch & preprocess data
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

    # Convert to PyTorch tensors
    X_tensor = torch.tensor(X, dtype=torch.float32).to(device)
    y_tensor = torch.tensor(y, dtype=torch.float32).to(device)

    # Dataset & split
    dataset = TensorDataset(X_tensor, y_tensor)
    test_size = int(config["training"]["test_ratio"] * len(dataset))
    train_size = len(dataset) - test_size
    train_dataset, test_dataset = random_split(dataset, [train_size, test_size])

    train_loader = DataLoader(train_dataset, batch_size=config["training"]["batch_size"], shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=config["training"]["batch_size"])

    # Model, Loss, Optimizer
    model = LSTMModel(input_dim=X.shape[2]).to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=config["training"]["lr"])

    # Training Loop
    best_val_loss = float('inf')
    patience_counter = 0

    for epoch in range(config["training"]["epochs"]):
        model.train()
        train_losses = []

        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs.squeeze(), batch_y)
            loss.backward()
            optimizer.step()
            train_losses.append(loss.item())

        # Validation
        model.eval()
        val_losses = []
        with torch.no_grad():
            for batch_X, batch_y in test_loader:
                outputs = model(batch_X)
                val_loss = criterion(outputs.squeeze(), batch_y)
                val_losses.append(val_loss.item())

        avg_train_loss = np.mean(train_losses)
        avg_val_loss = np.mean(val_losses)
        print(f"Epoch {epoch+1}/{config['training']['epochs']}: Train Loss={avg_train_loss:.6f}, Val Loss={avg_val_loss:.6f}")

        # Early stopping
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), model_save_path)
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= 5:
                print("Early stopping triggered.")
                break

    print("Training complete. Model saved to", model_save_path)
    return model

if __name__ == "__main__":
    tickers = ["AAPL", "MSFT"]
    start = "2023-01-01"
    end = "2025-01-01"
    train_model(tickers, start, end)

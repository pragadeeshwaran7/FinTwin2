import torch
from torch.utils.data import TensorDataset, DataLoader
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error

from src.lstm import TwinLSTM
from src.gru import TwinGRU
from src.tcn import TCN 
from src.data import fetch_assets, engineer_features, create_windows

def directional_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    # y: (N, n_assets)
    return np.mean(np.sign(y_true) == np.sign(y_pred))

def train_pipeline(tickers, window_size=60, batch_size=32, epochs=30, lr=1e-4, device='cpu'):
    # 1) fetch
    df = fetch_assets(tickers, period='10y', interval='1d')
    feat = engineer_features(df, tickers)
    X, Y, scaler = create_windows(feat, tickers, window_size=window_size)
    N, W, F = X.shape
    n_assets = len(tickers)

    # split
    split = int(0.8 * N)
    X_train, X_val = X[:split], X[split:]
    Y_train, Y_val = Y[:split], Y[split:]

    train_ds = TensorDataset(torch.from_numpy(X_train), torch.from_numpy(Y_train))
    val_ds = TensorDataset(torch.from_numpy(X_val), torch.from_numpy(Y_val))
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    # model
    model = TCN(input_size=F, num_channels=[128, 128], dropout=0.2, output_size=n_assets)
    model.to(device)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = torch.nn.MSELoss()

    best_val_loss = float('inf')
    for ep in range(1, epochs+1):
        model.train()
        train_losses = []
        for xb, yb in train_loader:
            xb = xb.to(device)
            yb = yb.to(device)
            pred = model(xb)
            loss = criterion(pred, yb)
            opt.zero_grad()
            loss.backward()
            opt.step()
            train_losses.append(loss.item())
        # val
        model.eval()
        val_losses = []
        y_true_all = []
        y_pred_all = []
        with torch.no_grad():
            for xb, yb in val_loader:
                xb = xb.to(device)
                yb = yb.to(device)
                pred = model(xb)
                val_losses.append(criterion(pred, yb).item())
                y_true_all.append(yb.cpu().numpy())
                y_pred_all.append(pred.cpu().numpy())
        y_true_all = np.vstack(y_true_all)
        y_pred_all = np.vstack(y_pred_all)
        val_mse = np.mean(val_losses)
        val_mae = mean_absolute_error(y_true_all, y_pred_all)
        val_rmse = np.sqrt(mean_squared_error(y_true_all, y_pred_all))
        dir_acc = directional_accuracy(y_true_all, y_pred_all)

        print(f"Epoch {ep:03d} TrainLoss {np.mean(train_losses):.6f} ValMSE {val_mse:.6f} MAE {val_mae:.6f} RMSE {val_rmse:.6f} DirAcc {dir_acc:.4f}")

        if val_mse < best_val_loss:
            best_val_loss = val_mse
            torch.save(model.state_dict(), "best_model.pth")
    return model, scaler, feat, X_val, Y_val

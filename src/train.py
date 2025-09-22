import torch
from torch.utils.data import TensorDataset, DataLoader
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error

from src.model import TwinLSTM
from src.data import fetch_assets, engineer_features, create_windows
from src.qaoa_optimizer import optimize_allocations

def directional_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    # y: (N, n_assets)
    return np.mean(np.sign(y_true) == np.sign(y_pred))

def train_pipeline(tickers, window_size=60, batch_size=32, epochs=30, lr=1e-4, device='cpu', 
                   use_qaoa=True, budget_units=10, qaoa_p=2, qaoa_steps=200, qaoa_lr=0.05):
    """
    Training pipeline with optional QAOA optimization.
    
    Args:
        tickers: List of stock tickers
        window_size: LSTM input window size
        batch_size: Training batch size
        epochs: Number of training epochs
        lr: Learning rate for LSTM training
        device: PyTorch device
        use_qaoa: Whether to apply QAOA optimization after training
        budget_units: Total allocation units for QAOA
        qaoa_p: QAOA circuit depth
        qaoa_steps: QAOA optimization steps
        qaoa_lr: QAOA learning rate
    """
    # 1) fetch
    df = fetch_assets(tickers, period='365d', interval='1d')
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
    model = TwinLSTM(input_size=F, hidden_size=128, num_layers=2, dropout=0.2, output_size=n_assets)
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
    
    # QAOA Optimization Phase
    if use_qaoa:
        print("\n=== Running QAOA Portfolio Optimization ===")
        model.eval()
        with torch.no_grad():
            # Use the last validation batch for predictions
            X_sample = torch.from_numpy(X_val[-1:]).to(device)  # Take last sample
            predicted_returns = model(X_sample).cpu().numpy().flatten()
        
        print(f"Predicted returns: {predicted_returns}")
        
        # Run QAOA optimization
        allocations = optimize_allocations(
            predicted_returns.tolist(),
            budget_units,
            p=qaoa_p,
            steps=qaoa_steps,
            lr=qaoa_lr
        )
        
        print(f"QAOA Optimal Allocations: {dict(zip(tickers, allocations))}")
        print(f"Total allocation units used: {sum(allocations)}/{budget_units}")
        
        # Calculate expected portfolio return
        expected_return = np.dot(predicted_returns, allocations) / budget_units
        print(f"Expected portfolio return: {expected_return:.6f}")
        
        return model, scaler, feat, X_val, Y_val, allocations
    
    return model, scaler, feat, X_val, Y_val

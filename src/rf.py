import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from src.data import fetch_assets, engineer_features, create_rf_dataset

def directional_accuracy(y_true, y_pred):
    return np.mean(np.sign(y_true) == np.sign(y_pred))

def train_pipeline(tickers, horizon=1, n_estimators=200, max_depth=None):
    df = fetch_assets(tickers, period='180d', interval='1d')
    feat = engineer_features(df, tickers)
    X, Y, feat_names, scaler = create_rf_dataset(feat, tickers, horizon=horizon)

    split = int(0.8*len(X))
    X_train, X_val = X[:split], X[split:]
    Y_train, Y_val = Y[:split], Y[split:]

    model = RandomForestRegressor(n_estimators=n_estimators, max_depth=max_depth, n_jobs=-1)
    model.fit(X_train, Y_train)

    y_pred = model.predict(X_val)
    mse = mean_squared_error(Y_val, y_pred)
    mae = mean_absolute_error(Y_val, y_pred)
    rmse = np.sqrt(mse)
    dir_acc = directional_accuracy(Y_val, y_pred)

    print(f"Val MSE {mse:.6f} MAE {mae:.6f} RMSE {rmse:.6f} DirAcc {dir_acc:.4f}")
    return model, scaler, feat, X_val, Y_val, feat_names

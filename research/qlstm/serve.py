# fintwin_module/serve.py
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import torch
from typing import List, Optional
from preprocessing import add_technical_indicators, select_features, fit_scaler, transform_features
from utils import load_model_from_ckpt
import pickle

app = FastAPI(title="FinTwin LSTM Service")

# Config / paths (tweak)
CKPT_PATH = 'checkpoints/model.pt'
SCALER_X_PATH = 'scaler_X.pkl'
SCALER_Y_PATH = 'scaler_y.pkl'
INPUT_SIZE = 28  # set to your trained model input size; keep in sync
DEVICE = 'cpu'   # change to 'cuda' in production with GPU

# Load model & scalers at startup (hot reload endpoint provided)
model = None
scaler_X = None
scaler_y = None
feature_cols = None

@app.on_event("startup")
def startup_event():
    global model, scaler_X, scaler_y, feature_cols
    try:
        model = load_model_from_ckpt(CKPT_PATH, input_size=INPUT_SIZE, device=DEVICE)
    except Exception as e:
        print(f"Warning: failed to load model: {e}")
        model = None
    try:
        scaler_X, scaler_y = load_scalers(SCALER_X_PATH, SCALER_Y_PATH)
    except Exception as e:
        print(f"Warning: failed to load scalers: {e}")
        scaler_X = None
        scaler_y = None

class PredictRequest(BaseModel):
    # Either send CSV bytes via uploadFile OR send JSON table as list of dicts (rows)
    # We expect exactly last `window` rows (e.g., 60)
    rows: Optional[List[dict]] = None
    # forecast horizon:
    horizon: Optional[int] = 1

def df_from_rows(rows):
    df = pd.DataFrame(rows)
    # ensure col order and types
    for c in ['Open','High','Low','Close','Volume']:
        if c not in df.columns:
            raise ValueError(f"Missing required column: {c}")
    return df

def prepare_input_from_df(df: pd.DataFrame, scaler_X, feature_list=None, window=60):
    df = df.copy().reset_index(drop=True)
    if len(df) < window:
        raise ValueError(f"Need at least {window} rows, got {len(df)}")
    # keep only last `window` rows
    df = df.iloc[-window:, :].reset_index(drop=True)
    df = compute_basic_indicators(df)
    feat_df, features = select_features(df, feature_list)
    arr = feat_df.values.astype(np.float32)  # shape [window, n_features]
    # scale
    if scaler_X:
        arr_flat = scaler_X.transform(arr)
    else:
        arr_flat = arr
    return arr_flat, features

@app.post("/predict")
async def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    # Build df
    if req.rows is None:
        raise HTTPException(status_code=400, detail="Provide `rows` (list of row dicts with Open,High,Low,Close,Volume).")
    try:
        df = df_from_rows(req.rows)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        arr_flat, features = prepare_input_from_df(df, scaler_X, window=60)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"preparation error: {e}")
    # model expects batch: [1, window, n_features]
    xb = torch.tensor(arr_flat[np.newaxis, :, :], dtype=torch.float32).to(DEVICE)
    with torch.no_grad():
        out = model(xb).cpu().numpy().squeeze()
    if scaler_y is not None:
        out_val = scaler_y.inverse_transform(out.reshape(-1,1)).squeeze().item()
    else:
        out_val = float(out)
    return {"prediction": float(out_val), "features_used": features}

@app.post("/forecast")
async def forecast(req: PredictRequest):
    """
    Iterative forecasting for horizon > 1.
    WARNING: iterative forecasting requires recomputing all derived features after each predicted day.
    Here we implement a simple placeholder: for each predicted day we copy the last row's features and replace Close.
    Replace the `update_features_with_prediction` operation with your deterministic recompute logic.
    """
    horizon = req.horizon or 1
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    if req.rows is None:
        raise HTTPException(status_code=400, detail="Provide `rows`")

    try:
        df = df_from_rows(req.rows)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if len(df) < 60:
        raise HTTPException(status_code=400, detail="Need at least 60 rows")

    preds = []
    working_df = df.copy().reset_index(drop=True)
    for step in range(horizon):
        arr_flat, features = prepare_input_from_df(working_df, scaler_X, window=60)
        xb = torch.tensor(arr_flat[np.newaxis, :, :], dtype=torch.float32).to(DEVICE)
        with torch.no_grad():
            out = model(xb).cpu().numpy().squeeze()
        if scaler_y is not None:
            pred_price = float(scaler_y.inverse_transform(out.reshape(-1,1)).squeeze())
        else:
            pred_price = float(out)
        preds.append(pred_price)

        # Naive update for iterative forecasting:
        # create next raw-row using last raw row but replace Close with predicted price.
        # TODO: Replace this with deterministic recomputation for all indicators (SMA, EMA, RSI, MACD)
        last_row = working_df.iloc[-1:].copy()
        last_row.iloc[0, last_row.columns.get_loc('Open')] = pred_price  # naive: set Open=pred
        last_row.iloc[0, last_row.columns.get_loc('High')] = pred_price
        last_row.iloc[0, last_row.columns.get_loc('Low')] = pred_price
        last_row.iloc[0, last_row.columns.get_loc('Close')] = pred_price
        last_row.iloc[0, last_row.columns.get_loc('Volume')] = last_row['Volume'].values[0]
        working_df = pd.concat([working_df, last_row], ignore_index=True)

        # keep only last 300 rows to avoid growth; for preparation take last 60
        if len(working_df) > 300:
            working_df = working_df.iloc[-300:].reset_index(drop=True)

    return {"forecast": preds, "features_used": features}

@app.get("/health")
def health():
    return {"status":"ok", "model_loaded": model is not None}

@app.post("/reload")
def reload_model():
    global model, scaler_X, scaler_y
    try:
        model = load_model_from_ckpt(CKPT_PATH, input_size=INPUT_SIZE, device=DEVICE)
        scaler_X, scaler_y = load_scalers(SCALER_X_PATH, SCALER_Y_PATH)
        return {"reloaded": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("serve:app", host="0.0.0.0", port=8000, reload=False)

# src/app_streamlit.py
import streamlit as st
import pandas as pd
import numpy as np
from src.train import train_pipeline
from src.qaoa_optimizer import returns_to_qubo, solve_qaoa

st.title("FinTwin — LSTM Forecast + QAOA Prescriptive (Demo)")

tickers_input = st.text_input("Tickers (comma separated)", "AAPL,MSFT,GOOG")
if st.button("Train & Recommend"):
    tickers = [t.strip().upper() for t in tickers_input.split(",")]
    with st.spinner("Training LSTM (this may take some time)..."):
        model, scaler, feat, X_val, Y_val = train_pipeline(tickers, window_size=30, epochs=10)
    st.success("Model trained (saved best_model.pth).")
    # predict on last window
    import torch
    model.eval()
    x_last = X_val[-1:]
    pred = model(torch.from_numpy(x_last)).detach().numpy().ravel()
    st.write("Predicted next-step returns:", {t: float(pred[i]) for i,t in enumerate(tickers)})
    qp = returns_to_qubo(pred, budget_units=10)
    st.write("Solving QAOA...")
    try:
        res = solve_qaoa(qp)
        st.write("QAOA result:", res)
    except Exception as e:
        st.error(f"QAOA failed: {e}")

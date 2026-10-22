import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
from predict import predict_next

st.set_page_config(layout="wide", page_title="FinTwin — LSTM Predictions")

st.title("FinTwin — Stock Price Predictions")

tickers = st.text_input("Enter tickers (comma separated)", "AAPL,MSFT")
start = st.date_input("Start Date", pd.to_datetime("2023-01-01"))
end = st.date_input("End Date", pd.to_datetime("2025-09-27"))

if st.button("Generate Predictions"):
    tickers_list = [t.strip().upper() for t in tickers.split(",")]
    preds = predict_next("lstm_model.pth", tickers_list, str(start), str(end))
    
    for t, series in preds.items():
        st.subheader(f"{t} Predictions")
        st.line_chart(series)
        
        # Show last 10 predicted prices
        st.write(series.tail(10))

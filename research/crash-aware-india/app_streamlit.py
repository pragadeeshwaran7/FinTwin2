# app_streamlit.py
import streamlit as st
import pandas as pd
from anomaly_detector import score_continuous
from explainability import compute_shap_topk
from pathlib import Path
import matplotlib.pyplot as plt

st.set_page_config(layout="wide", page_title="Fixit — Crash-aware risk")

st.title("Fixit — Crash-aware risk dashboard")

st.markdown("""
This dashboard shows the combined risk index computed from:
- Supervised RF (crisis-likeness probability)
- IsolationForest anomaly score

Use the controls to inspect dates and explanations.
""")

@st.cache_data
def get_risk_df():
    return score_continuous()

df = get_risk_df()

st.subheader("Risk index (test period)")
risk_plot = df["risk_index"].plot(figsize=(10, 3))
st.pyplot(risk_plot.figure)

st.subheader("Top risk days")
st.table(df.sort_values("risk_index", ascending=False).head(10))

st.subheader("Inspect date")
date = st.date_input("Pick a date to inspect", value=df.index[-1].date())
date_str = pd.to_datetime(date).strftime("%Y-%m-%d")
if date_str in df.index.astype(str):
    row = df.loc[date_str]
    st.write(row.to_dict())
    try:
        top = compute_shap_topk(date_str)
        st.write("Top SHAP feature impacts:")
        for feat, impact in top:
            st.write(f"- **{feat}**: {impact:.4f}")
    except Exception as e:
        st.write("SHAP explanation could not be computed:", e)
else:
    st.write("Date not in test period; pick another date.")

st.write("Note: For demo only. Use production retraining and streaming for real-time monitoring.")

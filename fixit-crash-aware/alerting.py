# alerting.py
import pandas as pd
from pathlib import Path
from anomaly_detector import score_continuous
from explainability import compute_shap_topk
from utils import write_json
from datetime import datetime
import json

ALERTS_DIR = Path("alerts")
ALERTS_DIR.mkdir(exist_ok=True)

def generate_alerts(risk_df, threshold=0.6):
    alerts = []
    for d, row in risk_df.iterrows():
        if row["risk_index"] >= threshold:
            # get top reasons via SHAP
            try:
                top_reasons = compute_shap_topk(d.strftime("%Y-%m-%d"))
                top_reasons_fmt = [{"feature": f, "impact": float(v)} for f, v in top_reasons]
            except Exception as e:
                top_reasons_fmt = []
            alert = {
                "date": d.strftime("%Y-%m-%d"),
                "risk_index": float(row["risk_index"]),
                "sup_proba": float(row["sup_proba"]),
                "iso_score": float(row["iso_score"]),
                "top_reasons": top_reasons_fmt,
                "suggested_action": suggest_action(row)
            }
            alerts.append(alert)
    # save
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    out_path = ALERTS_DIR / f"alerts_{ts}.json"
    write_json(alerts, out_path)
    print("Saved", out_path)
    return alerts

def suggest_action(row):
    # simple templated suggestions — expand with rules
    s = row["sup_proba"]
    iso = row["iso_score"]
    if s > 0.8 or iso > 0.9:
        return "High risk: consider hedging (buy protection), reduce leverage, increase cash allocation."
    elif s > 0.6 or iso > 0.7:
        return "Elevated risk: rebalance to defensive sectors, increase cash buffer."
    else:
        return "Monitor."

if __name__ == "__main__":
    out = score_continuous()
    alerts = generate_alerts(out, threshold=0.6)
    print("Generated", len(alerts), "alerts")

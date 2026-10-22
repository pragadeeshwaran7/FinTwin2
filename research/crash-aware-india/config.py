# config.py
from pathlib import Path

DATA_DIR = Path("data/India")
MODELS_DIR = Path("models/Indian")
MODELS_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# Tickers
INDEX_TICKER = "^NSEI"
VIX_TICKER = "^INDIAVIX"
ADDITIONAL_TICKERS = ["BANKBEES.NS", "RELIANCE.NS"]  # optional sector/bond ETFs

# fetch window
START_DATE = "2004-01-01"
END_DATE = None  # None => up to today

# Feature parameters
ROLL_WINDOW = 20  # days

# Autoencoder params
AE_SEQ_LEN = 30  # sequence length for LSTM AE
AE_FEATURES = None  # populate dynamically from features file

# Training params
RFC_PARAMS = {"n_estimators": 300, "max_depth": 6, "random_state": 42}
ISO_PARAMS = {"n_estimators": 200, "contamination": 0.01, "random_state": 42}
AE_PARAMS = {"latent_dim": 16, "epochs": 40, "batch_size": 64}

# Misc
RANDOM_STATE = 42

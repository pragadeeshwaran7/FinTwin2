# FinTwin

---

## Phase 1 Development:

**Market Data**: with yFinance

---

## Models
### 1. LSTM:
 - 2 Layers, 128 Units, dropout 0.2, Adam lr = 1e-4

### 2. QAOA based Optimizer:

---

## Project Structure:

```
intwin/
├─ requirements.txt
├─ README.md
├─ src/
│  ├─ __init__.py
│  ├─ data.py              # fetch & prepare yfinance windows
│  ├─ model.py             # PyTorch LSTM model + utils
│  ├─ train.py             # training loop, metrics
│  ├─ qaoa_optimizer.py    # convert returns -> QUBO/Hamiltonian -> QAOA
│  ├─ backtest.py          # apply allocations, compute returns
│  └─ app_streamlit.py     # minimal Streamlit UI / charts (skeleton)
└─ experiments/
   └─ run_example.sh
```

---

## requirements:

```text
yfinance
pandas
numpy
scikit-learn
matplotlib
torch
tqdm
qiskit      
streamlit
```
---

## data.py:

### 1. fetch_assets()

### arguments:
- period = 180d
- interval = 1d

### function
- Fetch multi-asset OHLCV data from yFinance

### 2. engineer_features()

### financial stock features extracted:

- **close**: The stock’s closing price for each day (or time period).
- **ret**: The daily return, i.e., the percentage change from one closing price to the next.
                         Return ​= (P - ​P')/P'
                         [P - Current Day CP, P' - Previous Day CP]
- **sma_10**: Average closing price of the stock over the last 10 trading days. Smooths out noise.
- **ema_10**: It gives more weight to recent prices, so it reacts faster to changes (trend reversal, momentum shifts etc.,).
- **vol_10**: Standard deviation of returns to evaluate risk levels [Higher Volatility = Larger Fluctuations = Riskier Stock].

### 3. create_windows()

### function
- Create sliding windows for multivariate LSTM input (window size = 60).
- X shape: (N, window_size, num_features)
- y shape: (N, num_assets)  -> predict next-step returns for each asset​

- Parameters taken for input: *ret*, *vol_10*, *close*.

- Normalise Data [z = (x - m)/sd]
- y -> multi-output forecasting

---

## model.py: LSTM

- **input_size**: input
- **hidden_size**: 128
- **num_layers**: 2
- **dropout**: 0.2
- **output_size**: None

---

## train.py:

### parameters:
- **window_size**: 60
- **batch_size**: 32
- **epochs**: 30
- **lr**: 1e-4

### train pipeline:

 **data.py** [fetch_assets() -> engineer_features() -> create_windows()] **--->** split (0.8, 0.2) **--->** model train + eval

---

## qaoa_optimizer.py

Build a simple quadratic program:
- Variables x_{i,u} binary: whether allocate unit u to asset i (we will collapse to one variable per asset with integer bounds for simplicity)
- For simplicity, produce integer variable per asset: 0..budget_units.
- Objective: maximize sum_i predicted_return_i * allocation_i  -> we convert to minimization by negation.
- Constraint: sum allocation_i <= budget_units (budget of discrete units)
- This function returns a QP object.

---

## backtest.py

Simple backtest: allocations are integer units per asset.
- **prices**: DataFrame of close prices indexed by date with columns tickers
- **allocations**: array of units per asset
We'll compute daily portfolio value starting from the day after predictions start.

---

## Notes, caveats & next steps

- **QAOA encoding** — I implemented a simple discrete-unit QUBO-style optimization. For a continuous-weight portfolio (real weights), you must either: (a) discretize weights into many small units (increases qubit count), or (b) use variational QAOA-inspired hybrid routines that output continuous proxies, or (c) use classical solvers for continuous relaxations and compare to QAOA on discretized versions. We can pick a formulation you prefer and I'll expand it.

- **Qiskit versions** — Qiskit/Qiskit Optimization APIs shift across versions. If you hit import errors, tell me the exact qiskit version installed and I’ll adapt the code.

- **Data frequency** — The pipeline uses daily data by default. For intraday (1m) you'll need more careful rate limiting and larger windows; memory consumption increases.

- **Forensics (FixIt)** — we left this out as you said. When ready, we can add an Autoencoder/IsolationForest/QSVM pipeline that watches transaction logs and flags or suggests corrections.

- **Testing & experiments** — I kept hyperparameters conservative. You’ll want to run hyperparameter sweeps (lr, hidden_size, window length, dropout, LSTM layers).

- **Backtesting & slippage** — current backtest ignores transaction costs, slippage, and shorting constraints — add them for realism.

---

## Command

To **train** the model, run the following command: 
```text
python -c "from src.train import train_pipeline; train_pipeline(['AAPL','MSFT','GOOG'], window_size=30, epochs=50)"
```














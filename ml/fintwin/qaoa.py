"""QAOA portfolio selection, evolved from research/qaoa-portfolio.

The research version (src/pl_qaoa.py) built a PennyLane Hamiltonian with a
penalty term and read per-qubit <Z> expectations as allocations. This version
uses the constraint-preserving Quantum Alternating Operator Ansatz for
"pick exactly K of N assets":

* initial state: the Dicke state |D(N,K)> (uniform over all K-asset portfolios);
* cost: the mean-variance objective  -mu.x + lambda * x'Sigma x;
* mixer: an XY ring mixer, which swaps asset membership between neighbours and
  never leaves the feasible subspace, so no penalty term is needed.

It runs on an exact numpy statevector simulator, so no quantum SDK is required.
Because N is small (<= 12 qubits), the classical optimum is also found by brute
force to report how close QAOA got.
"""
import numpy as np
from scipy.optimize import minimize

MAX_ASSETS = 12
RISK_FREE = 0.065  # Indian 10y G-sec, approx.


def _bit_matrix(n):
    idx = np.arange(2 ** n)
    # Column q holds bit q of each basis-state index.
    return ((idx[:, None] >> np.arange(n)) & 1).astype(float)


def _costs(bits, mu, cov, risk_aversion):
    return -(bits @ mu) + risk_aversion * np.einsum("bi,ij,bj->b", bits, cov, bits)


def _xy_pairs(n):
    """For each ring edge (i, i+1), the basis states where exactly one of the two bits is set,
    with their partner state (the two bits swapped)."""
    idx = np.arange(2 ** n)
    pairs = []
    edges = [(i, (i + 1) % n) for i in range(n)] if n > 2 else [(0, 1)]
    for i, j in edges:
        differ = ((idx >> i) & 1) != ((idx >> j) & 1)
        src = idx[differ]
        pairs.append((src, src ^ ((1 << i) | (1 << j))))
    return pairs


def _apply_xy_mixer(state, beta, pairs):
    c, s = np.cos(beta), -1j * np.sin(beta)
    for src, dst in pairs:
        new = state.copy()
        new[src] = c * state[src] + s * state[dst]
        state = new
    return state


def _qaoa_state(params, cost_norm, init, pairs, p):
    gammas, betas = params[:p], params[p:]
    state = init.copy()
    for layer in range(p):
        state = state * np.exp(-1j * gammas[layer] * cost_norm)
        state = _apply_xy_mixer(state, betas[layer], pairs)
    return state


def _portfolio_stats(weights, mu, cov):
    ret = float(weights @ mu)
    vol = float(np.sqrt(max(weights @ cov @ weights, 0.0)))
    return {"expected_return": ret, "volatility": vol,
            "sharpe": (ret - RISK_FREE) / vol if vol > 0 else None}


def run(payload):
    assets = payload["assets"]
    n = len(assets)
    if n < 2:
        raise ValueError("Select at least 2 assets")
    if n > MAX_ASSETS:
        raise ValueError(f"QAOA simulation supports at most {MAX_ASSETS} assets")
    k = int(payload.get("k") or max(1, n // 2))
    k = max(1, min(n - 1, k)) if n > 1 else 1
    budget = float(payload.get("budget", 100000))
    risk_aversion = float(payload.get("risk_aversion", 0.5))
    p = int(max(1, min(4, payload.get("layers", 2))))
    rng = np.random.default_rng(int(payload.get("seed", 7)))

    length = min(len(a["closes"]) for a in assets)
    if length < 60:
        raise ValueError("Need at least 60 days of prices for every asset")
    prices = np.array([a["closes"][-length:] for a in assets], dtype=float)
    rets = np.diff(np.log(prices), axis=1)
    mu = rets.mean(axis=1) * 252
    cov = np.cov(rets) * 252

    bits = _bit_matrix(n)
    feasible = bits.sum(axis=1) == k
    costs = _costs(bits, mu, cov, risk_aversion)
    c_min, c_max = costs[feasible].min(), costs[feasible].max()
    cost_norm = np.where(feasible, (costs - c_min) / (c_max - c_min + 1e-12), 0.0)
    init = np.where(feasible, 1.0, 0.0).astype(complex)
    init /= np.linalg.norm(init)  # Dicke state |D(n,k)>
    pairs = _xy_pairs(n)

    # Layer-by-layer "INTERP" warm start (Zhou et al., 2020): optimise depth 1 from random starts,
    # then initialise depth q+1 by interpolating the best depth-q angles. Deeper circuits then
    # improve monotonically instead of getting lost in a larger parameter space.
    restarts = int(payload.get("restarts", 6))

    def interp(v):
        q = len(v)
        return np.array([((i) / q) * (v[i - 1] if i > 0 else 0) + ((q - i) / q) * (v[i] if i < q else 0) for i in range(q + 1)])

    best = None
    for depth in range(1, p + 1):
        def objective(params, d=depth):
            state = _qaoa_state(params, cost_norm, init, pairs, d)
            return float(np.real(np.vdot(state, cost_norm * state)))
        starts = [np.concatenate([rng.uniform(0, np.pi, depth), rng.uniform(0, np.pi / 2, depth)]) for _ in range(restarts if depth == 1 else 2)]
        if best is not None:
            g, b = best.x[: depth - 1], best.x[depth - 1:]
            starts.insert(0, np.concatenate([interp(g), interp(b)]))
        level_best = None
        for x0 in starts:
            res = minimize(objective, x0, method="COBYLA", options={"maxiter": 400})
            if level_best is None or res.fun < level_best.fun:
                level_best = res
        best = level_best

    probs = np.abs(_qaoa_state(best.x, cost_norm, init, pairs, p)) ** 2
    top = np.argsort(probs)[::-1][:32]
    # Measure the circuit like hardware would: sample `shots` bitstrings and keep the best one seen.
    n_shots = int(payload.get("shots", 512))
    sampled = rng.choice(len(probs), size=n_shots, p=probs / probs.sum())
    feasible_samples = [int(i) for i in np.unique(sampled) if feasible[i]]
    chosen = min(feasible_samples, key=lambda i: costs[i]) if feasible_samples else int(np.argmax(np.where(feasible, probs, -1)))
    optimum = int(np.argmin(np.where(feasible, costs, np.inf)))
    uniform_prob = 1.0 / feasible.sum()

    feas_costs = costs[feasible]
    worst_feasible = feas_costs.max()
    span = worst_feasible - costs[optimum]
    approx_ratio = float((worst_feasible - costs[chosen]) / span) if span > 0 else 1.0

    selected = [i for i in range(n) if bits[chosen, i] == 1]
    vols = np.sqrt(np.diag(cov))
    inv_vol = np.array([1 / vols[i] if vols[i] > 0 else 0 for i in selected])
    w_sel = inv_vol / inv_vol.sum() if inv_vol.sum() > 0 else np.full(len(selected), 1 / len(selected))
    weights = np.zeros(n)
    weights[selected] = w_sel

    allocation = []
    for i, a in enumerate(assets):
        price = float(prices[i, -1])
        amount = budget * weights[i]
        allocation.append({
            "ticker": a["ticker"], "name": a.get("name", a["ticker"]),
            "selected": bool(weights[i] > 0), "weight": float(weights[i]),
            "amount": float(amount), "price": price,
            "shares": int(amount // price) if price > 0 else 0,
            "expected_return": float(mu[i]), "volatility": float(vols[i]),
        })

    top_states = [{
        "bitstring": "".join(str(int(b)) for b in bits[i]),
        "assets": [assets[j]["ticker"] for j in range(n) if bits[i, j] == 1],
        "probability": float(probs[i]), "feasible": bool(feasible[i]), "cost": float(costs[i]),
    } for i in top[:8]]

    equal_w = np.full(n, 1 / n)
    return {
        "solver": "QAOA, XY-mixer ansatz (numpy statevector simulator)",
        "qubits": n, "layers": p, "k": k, "budget": budget, "risk_aversion": risk_aversion,
        "optimizer": {"method": "COBYLA + INTERP warm start", "restarts": restarts, "expectation": float(best.fun),
                      "gammas": best.x[:p].tolist(), "betas": best.x[p:].tolist()},
        "allocation": allocation,
        "found_optimum": chosen == optimum,
        "optimum_assets": [assets[j]["ticker"] for j in range(n) if bits[optimum, j] == 1],
        "optimum_probability": float(probs[optimum]),
        "uniform_probability": float(uniform_prob),
        "feasible_portfolios": int(feasible.sum()),
        "feasible_probability": float(probs[feasible].sum()),
        "approximation_ratio": approx_ratio,
        "shots": n_shots,
        "distinct_portfolios_sampled": len(feasible_samples),
        # Chance that the same number of uniformly random guesses would hit the optimum, for comparison.
        "random_guess_find_probability": float(1 - (1 - uniform_prob) ** n_shots),
        "qaoa_find_probability": float(1 - (1 - probs[optimum]) ** n_shots),
        "top_states": top_states,
        "portfolio": _portfolio_stats(weights, mu, cov),
        "equal_weight": _portfolio_stats(equal_w, mu, cov),
        "lookback_days": int(length),
    }

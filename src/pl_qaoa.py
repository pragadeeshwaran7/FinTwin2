# src/pl_qaoa.py

import pennylane as qml
import numpy as np

def build_hamiltonian(predicted_returns, budget_units):
    """Constructs cost + constraint Hamiltonian for QAOA."""
    n = len(predicted_returns)

    # Cost Hamiltonian: minimize -sum(r_i * x_i)
    cost_coeffs = [-r for r in predicted_returns]
    cost_obs = [qml.PauliZ(i) for i in range(n)]
    H_cost = qml.Hamiltonian(cost_coeffs, cost_obs)

    # Constraint: (sum x_i - budget_units)^2
    # Expand: sum_i x_i + 2 sum_{i<j} x_i x_j - 2 budget_units sum_i x_i + budget_units^2
    lin_coeffs = [1 for _ in range(n)]
    pair_coeffs = [2 for _ in range(n*(n-1)//2)]
    cross_coeffs = [-2 * budget_units for _ in range(n)]
    const_term = budget_units**2

    # Observables
    lin_obs = [qml.PauliZ(i) for i in range(n)]
    pair_obs = []
    for i in range(n):
        for j in range(i+1, n):
            pair_obs.append(qml.PauliZ(i) @ qml.PauliZ(j))
    id_obs = [qml.Identity(0)]

    coeffs = lin_coeffs + pair_coeffs + cross_coeffs + [const_term]
    obs = lin_obs + pair_obs + lin_obs + id_obs

    H_constraint = qml.Hamiltonian(coeffs, obs)

    return H_cost + H_constraint

def qaoa_circuit(n_wires, H, p):
    """Creates a QAOA circuit qnode for given Hamiltonian."""
    dev = qml.device("default.qubit", wires=n_wires)

    @qml.qnode(dev)
    def circuit(gammas, betas):
        # Initial uniform superposition
        for w in range(n_wires):
            qml.Hadamard(wires=w)

        # Alternating operators
        for layer in range(p):
            # Cost evolution
            qml.templates.ApproxTimeEvolution(H, gammas[layer], 1)
            # Mixer layer via RX rotation on each qubit
            for w in range(n_wires):
                qml.RX(betas[layer], wires=w)

        # Return expectation values for each wire
        return [qml.expval(qml.PauliZ(w)) for w in range(n_wires)]

    return circuit

def optimize_allocation(predicted_returns, budget_units, p=1, steps=100, lr=0.1):
    """
    Runs classical optimization of QAOA parameters via PennyLane.

    Args:
        predicted_returns (list[float]): Forecasted returns per asset.
        budget_units (int): Total allocation units.
        p (int): QAOA depth.
        steps (int): Optimization steps.
        lr (float): Learning rate for optimizer.

    Returns:
        np.ndarray: Discrete allocation per asset.
    """
    n = len(predicted_returns)
    H = build_hamiltonian(predicted_returns, budget_units)
    circuit = qaoa_circuit(n, H, p)

    # Initialize parameters
    gammas = np.random.uniform(0, np.pi, size=(p,))
    betas  = np.random.uniform(0, np.pi/2, size=(p,))
    opt = qml.AdamOptimizer(lr)

    # Classical optimization loop
    for _ in range(steps):
        gammas, betas = opt.step(lambda g, b: np.sum(circuit(g, b)), gammas, betas)

    # Get expectation values and convert to allocations
    exp_vals = np.array(circuit(gammas, betas))
    # Map ⟨Z⟩ ∈ [−1,1] to x ∈ {0,1}: x = (1−⟨Z⟩)/2 then scale by budget_units
    alloc = np.round((1 - exp_vals) / 2 * budget_units).astype(int)
    return alloc

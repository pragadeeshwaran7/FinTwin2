import numpy as np

# Qiskit imports
from qiskit import Aer
from qiskit.utils import QuantumInstance
from qiskit.algorithms import QAOA
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit_optimization.converters import QuadraticProgramToIsing
from qiskit.algorithms.optimizers import COBYLA

def returns_to_qubo(pred_returns: np.ndarray, budget_units:int=10, unit_costs=None):
    """
    Build a simple quadratic program:
    - Variables x_{i,u} binary: whether allocate unit u to asset i (we will collapse to one variable per asset with integer bounds for simplicity)
    For simplicity, produce integer variable per asset: 0..budget_units.
    Objective: maximize sum_i predicted_return_i * allocation_i  -> we convert to minimization by negation.
    Constraint: sum allocation_i <= budget_units (budget of discrete units)
    This function returns a QP object.
    """
    n = len(pred_returns)
    qp = QuadraticProgram()
    # integer variable per asset
    for i in range(n):
        qp.integer_var(lowerbound=0, upperbound=budget_units, name=f"x{i}")
    # objective: maximize sum r_i * x_i -> minimize -sum r_i * x_i
    linear = {f"x{i}": -float(pred_returns[i]) for i in range(n)}
    qp.minimize(linear=linear)
    # constraint: sum x_i <= budget_units
    qp.linear_constraint(linear={f"x{i}": 1 for i in range(n)}, sense='LE', rhs=budget_units, name='budget')
    return qp

def solve_qaoa(qp: QuadraticProgram, shots=1024, reps=2, backend_name='aer_simulator_statevector'):
    """
    Convert to Ising, run QAOA via Qiskit's MinimumEigenOptimizer
    """
    # convert to Ising
    qi = QuantumInstance(Aer.get_backend('aer_simulator_statevector'))
    qaoa = QAOA(optimizer=COBYLA(maxiter=100), reps=reps, quantum_instance=qi)
    try:
        converter = QuadraticProgramToIsing()
        qubit_op, offset = converter.convert(qp)
        meo = MinimumEigenOptimizer(min_eigen_solver=qaoa)
        result = meo.solve(qp)
        return result
    except Exception as e:
        # fallback: use classical solver (COBYLA) using Qiskit's built-in classical optimizer
        from qiskit_optimization.algorithms import CplexOptimizer, MinimumEigenOptimizer
        # if qiskit_optimization classical optimizers are available, use default:
        sol = qp.to_lp_string()  # not ideal; but just raise
        raise RuntimeError("QAOA run failed: " + str(e))

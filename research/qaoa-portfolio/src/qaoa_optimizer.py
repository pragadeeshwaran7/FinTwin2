from src.pl_qaoa import optimize_allocation

def optimize_allocations(predicted_returns, budget_units, **kwargs):
    """
    PennyLane-based QAOA optimizer wrapper.

    Args:
        predicted_returns (list[float]): Forecasted returns per asset.
        budget_units (int): Total available discrete units.
        **kwargs: p, steps, lr passed to PennyLane optimizer.

    Returns:
        List[int]: Discrete allocation per asset.
    """
    return optimize_allocation(predicted_returns, budget_units, **kwargs)

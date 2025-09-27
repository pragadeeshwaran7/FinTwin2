import numpy as np
import pandas as pd

def create_sequences(data: np.ndarray, window_size: int):
    """
    Convert 2D array (num_samples x num_features) into
    3D sequences for LSTM: (num_sequences, window_size, num_features)
    """
    X, y = [], []
    for i in range(len(data) - window_size):
        X.append(data[i:i+window_size])
        y.append(data[i+window_size, 3])  # predict 'Close' as target (index 3)
    X = np.array(X)
    y = np.array(y)
    return X, y

def split_train_test(X: np.ndarray, y: np.ndarray, test_ratio: float = 0.2, shuffle=False, seed=42):
    n = len(X)
    test_size = int(n * test_ratio)
    if shuffle:
        np.random.seed(seed)
        indices = np.random.permutation(n)
        X, y = X[indices], y[indices]
    X_train, X_test = X[:-test_size], X[-test_size:]
    y_train, y_test = y[:-test_size], y[-test_size:]
    return X_train, X_test, y_train, y_test

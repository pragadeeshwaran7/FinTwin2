import pandas as pd
from sklearn.preprocessing import MinMaxScaler

class FeatureProcessor:
    def __init__(self):
        self.scaler = MinMaxScaler()
        self._fitted = False

    def fit(self, df: pd.DataFrame):
        if df is None or len(df) == 0:
            return
        self.scaler.fit(df)
        self._fitted = True

    def transform(self, df: pd.DataFrame):
        if df is None or len(df) == 0:
            return df
        if not self._fitted:
            self.fit(df)
        return self.scaler.transform(df)

# PyTorch model for time series forecasting using LSTM

import torch
import torch.nn as nn

class TwinLSTM(nn.Module):
    def __init__(self, input_size:int, hidden_size:int=128, num_layers:int=2, dropout:float=0.2, output_size:int=None):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers=num_layers,
                            batch_first=True, dropout=dropout)
        self.dropout = nn.Dropout(dropout)
        self.head = nn.Linear(hidden_size, output_size if output_size is not None else 1)

    def forward(self, x):
        # x: (batch, seq_len, input_size)
        out, (h, c) = self.lstm(x)  # out: (batch, seq_len, hidden)
        last = out[:, -1, :]
        last = self.dropout(last)
        return self.head(last)  # (batch, output_size)

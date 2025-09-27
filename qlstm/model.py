import torch
import torch.nn as nn
import yaml

# Load config
with open("config.yaml") as f:
    config = yaml.safe_load(f)

class LSTMModel(nn.Module):
    def __init__(self, input_dim, use_quantum=False):
        super(LSTMModel, self).__init__()
        hidden_dim = config["model"]["hidden_dim"]
        num_layers = config["model"]["num_layers"]
        dropout = config["model"]["dropout"]

        self.use_quantum = use_quantum
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        if self.use_quantum:
            self.lstm_cells = nn.ModuleList([QLSTMCell(input_dim if i==0 else hidden_dim, hidden_dim) 
                                            for i in range(num_layers)])
        else:
            self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
            )
        
        
        self.fc = nn.Linear(hidden_dim, 1)  # predict next 'Close' price

    def forward(self, x):
        # x shape: (batch, seq_len, input_dim)
        lstm_out, _ = self.lstm(x)  
        # Take the last time step's output
        out = lstm_out[:, -1, :]  
        out = self.fc(out)
        return out

# Example usage:
# model = LSTMModel(input_dim=10)  # if you have 10 features
# print(model)

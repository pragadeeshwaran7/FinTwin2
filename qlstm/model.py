import torch
import torch.nn as nn
from qmodel import QLSTMCell

class AdvancedLSTM(nn.Module):
    def __init__(self, input_dim, hidden_dim, num_layers=1, dropout=0.2, use_quantum=False):
        super().__init__()
        self.use_quantum = use_quantum
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        if self.use_quantum:
            self.lstm_cells = nn.ModuleList([QLSTMCell(input_dim if i == 0 else hidden_dim, hidden_dim)
                                            for i in range(num_layers)])
        else:
            self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers,
                                batch_first=True, dropout=dropout)

        self.fc = nn.Linear(hidden_dim, 1)

    def forward(self, x):
        if self.use_quantum:
            h, c = None, None
            for cell in self.lstm_cells:
                x_seq = []
                for t in range(x.size(1)):
                    out, (h, c) = cell(x[:, t, :], (h, c))
                    x_seq.append(out)
                x = torch.cat(x_seq, dim=1)
        else:
            x, _ = self.lstm(x)

        out = self.fc(x[:, -1, :])
        return out

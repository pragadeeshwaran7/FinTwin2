import torch
import torch.nn as nn
from qmodel import QLSTMCell

class AdvancedLSTM(nn.Module):
    def __init__(self, input_dim, hidden_dim, num_layers=1, dropout=0.2, use_quantum=False, output_dim=1):
        super().__init__()
        self.use_quantum = use_quantum
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.output_dim = output_dim

        if self.use_quantum:
            self.lstm_cells = nn.ModuleList(
                [QLSTMCell(input_dim if i == 0 else hidden_dim, hidden_dim) for i in range(num_layers)]
            )
        else:
            self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers,
                                batch_first=True, dropout=dropout)

        self.fc = nn.Linear(hidden_dim, self.output_dim)

    def forward(self, x, hc=None):
        batch_size, seq_len, _ = x.size()
        device = x.device

        if self.use_quantum:
            # Initialize hidden/cell
            if hc is None or hc[0] is None or hc[1] is None:
                h_prev = torch.zeros(batch_size, self.hidden_dim, device=device)
                c_prev = torch.zeros(batch_size, self.hidden_dim, device=device)
            else:
                h_prev, c_prev = hc

            # Step through sequence
            all_outputs = []
            for t in range(seq_len):
                x_t = x[:, t, :]  # [batch, input_dim]
                for cell in self.lstm_cells:
                    x_t, (h_prev, c_prev) = cell(x_t, (h_prev, c_prev))
                all_outputs.append(h_prev.unsqueeze(1))  # add seq dim

            x_seq = torch.cat(all_outputs, dim=1)  # [batch, seq_len, hidden_dim]
            out = self.fc(x_seq[:, -1, :])         # predict from last timestep
            return out

        else:
            x_seq, _ = self.lstm(x)
            out = self.fc(x_seq[:, -1, :])
            return out

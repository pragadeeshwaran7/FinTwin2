import pennylane as qml
from pennylane import numpy as np
import torch
import torch.nn as nn

class QLSTMCell(nn.Module):
    def __init__(self, input_dim, hidden_dim, n_qubits=None):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.n_qubits = n_qubits or hidden_dim  # one qubit per hidden unit
        self.dev = qml.device("default.qubit", wires=self.n_qubits)

        # Define quantum circuit weights as torch parameters
        weight_shapes = {"weights": (self.n_qubits, 3)}
        self.qlayer = qml.qnn.TorchLayer(self.quantum_circuit, weight_shapes)

    def quantum_circuit(self, inputs, weights):
        # Encode classical input into qubits
        for i in range(self.n_qubits):
            qml.RX(inputs[i % len(inputs)], wires=i)
        # Trainable rotations
        for i in range(self.n_qubits):
            qml.Rot(*weights[i], wires=i)
        return [qml.expval(qml.PauliZ(i)) for i in range(self.n_qubits)]

    def forward(self, x, hc):
        h_prev, c_prev = hc if hc is not None else (torch.zeros(x.size(0), self.hidden_dim, device=x.device),
                                                    torch.zeros(x.size(0), self.hidden_dim, device=x.device))
        # Flatten input + previous hidden
        x_combined = torch.cat([x, h_prev], dim=1)

        # Quantum layer output
        q_out = torch.stack([self.qlayer(xc) for xc in x_combined], dim=0).T  # batch_size x hidden_dim

        h = torch.tanh(q_out)
        c = h  # Simple LSTM-like behavior; can improve with proper gates
        return h.unsqueeze(1), (h, c)

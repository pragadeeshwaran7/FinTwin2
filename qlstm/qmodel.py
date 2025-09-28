import torch
import torch.nn as nn
import pennylane as qml

class QLSTMCell(nn.Module):
    def __init__(self, input_dim, hidden_dim, n_qubits=None):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.n_qubits = min(n_qubits or max(input_dim + hidden_dim, hidden_dim), 8)
        self.dev = qml.device("default.qubit", wires=self.n_qubits)

        # Linear layers
        self.input_proj = nn.Linear(input_dim + hidden_dim, self.n_qubits)
        self.output_proj = nn.Linear(self.n_qubits, hidden_dim)

        # QNode + TorchLayer
        weight_shapes = {"weights": (self.n_qubits, 3)}
        qnode = qml.QNode(self.quantum_circuit, self.dev)
        self.qlayer = qml.qnn.TorchLayer(qnode, weight_shapes)

    def quantum_circuit(self, inputs, weights):
        for i in range(self.n_qubits):
            qml.RX(inputs[i], wires=i)
        for i in range(self.n_qubits):
            qml.Rot(*weights[i], wires=i)
        return [qml.expval(qml.PauliZ(i)) for i in range(self.n_qubits)]

    def forward(self, x, hc=None):
        batch_size = x.size(0)
        device = x.device

        # Initialize hidden/cell states
        if hc is None or hc[0] is None or hc[1] is None:
            h_prev = torch.zeros(batch_size, self.hidden_dim, device=device)
            c_prev = torch.zeros(batch_size, self.hidden_dim, device=device)
        else:
            h_prev, c_prev = hc  # [batch, hidden_dim]

        # Combine input + previous hidden
        x_combined = torch.cat([x, h_prev], dim=1)  # [batch, input+hidden]
        x_quantum = self.input_proj(x_combined)

        # Quantum layer (per sample)
        q_outs = []
        for i in range(batch_size):
            q_out = self.qlayer(x_quantum[i])
            # TorchLayer already returns tensor, just move to device & float
            q_outs.append(q_out.to(device).float())

        q_out_batch = torch.stack(q_outs, dim=0)  # [batch, hidden_dim]
        h = torch.tanh(self.output_proj(q_out_batch))
        c = h  # simplified LSTM behavior

        return h, (h, c)  # RETURN 2D h

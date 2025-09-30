# serve.py
import torch
from fastapi import FastAPI
from pydantic import BaseModel

class Req(BaseModel):
    features: list[float]

import torch.nn as nn

class LSTMModel(nn.Module):
    def __init__(self, input_dim, hidden_dim, n_layers, output_dim):
        super(LSTMModel, self).__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, n_layers, batch_first=True)
        self.fc = nn.Linear(hidden_dim, output_dim)

    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out

app = FastAPI()
model = LSTMModel(input_dim=14, hidden_dim=64, n_layers=2, output_dim=1)
state = torch.load("lstm_model.pth", map_location="cpu")
model.load_state_dict(state, strict=False)
model.eval()

@app.post("/predict")
async def predict(req: Req):
    x = torch.tensor(req.features, dtype=torch.float32)
    # Ensure shape [batch, seq_len, input_dim]; we treat features as one-timestep sequence
    if x.dim() == 1:
        x = x.unsqueeze(0).unsqueeze(0)
    elif x.dim() == 2:
        x = x.unsqueeze(0)
    with torch.no_grad():
        y = model(x).item()
    return {"prediction": float(y)}

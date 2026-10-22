# serve.py
import torch
from fastapi import FastAPI
from pydantic import BaseModel

class Req(BaseModel):
    features: list[float]

import torch.nn as nn
from torch.quantization import quantize_dynamic

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
model = LSTMModel(input_dim=3, hidden_dim=64, n_layers=1, output_dim=1)
model = quantize_dynamic(model, {nn.LSTM}, dtype=torch.qint8)
model.load_state_dict(torch.load("lstm_qlstm_model.pth", map_location="cpu"))
model.eval()

@app.post("/predict")
async def predict(req: Req):
    x = torch.tensor(req.features).unsqueeze(0)
    with torch.no_grad():
        y = model(x).item()
    return {"prediction": y}

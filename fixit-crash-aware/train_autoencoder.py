# train_autoencoder_pytorch.py

import os
import numpy as np
import pandas as pd
from pathlib import Path
import joblib
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import StandardScaler
from config import AE_SEQ_LEN, AE_PARAMS, MODELS_DIR
from utils import load_csv, ensure_dir

# Force CPU (to match your TF CPU setup)
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
device = torch.device("cpu")

ensure_dir(MODELS_DIR)
MODEL_AE_PATH = Path(MODELS_DIR) / "lstm_autoencoder.pt"
SCALER_AE_PATH = Path(MODELS_DIR) / "scaler_ae.pkl"

# -------------------
# LSTM Autoencoder
# -------------------
class LSTMAutoencoder(nn.Module):
    def __init__(self, seq_len, n_features, latent_dim=16):
        super().__init__()
        self.seq_len = seq_len
        self.n_features = n_features
        self.latent_dim = latent_dim
        
        # Encoder
        self.encoder_lstm1 = nn.LSTM(n_features, 64, batch_first=True)
        self.encoder_lstm2 = nn.LSTM(64, 32, batch_first=True)
        self.fc_enc = nn.Linear(32, latent_dim)
        
        # Decoder
        self.fc_dec = nn.Linear(latent_dim, 32)
        self.decoder_lstm1 = nn.LSTM(32, 32, batch_first=True)
        self.decoder_lstm2 = nn.LSTM(32, 64, batch_first=True)
        self.output_layer = nn.Linear(64, n_features)
    
    def forward(self, x):
        # Encoder
        x, _ = self.encoder_lstm1(x)
        x, (h_n, _) = self.encoder_lstm2(x)
        latent = torch.relu(self.fc_enc(h_n[-1]))
        
        # Decoder
        x = torch.relu(self.fc_dec(latent))
        x = x.unsqueeze(1).repeat(1, self.seq_len, 1)  # repeat across sequence length
        x, _ = self.decoder_lstm1(x)
        x, _ = self.decoder_lstm2(x)
        out = self.output_layer(x)
        return out

# -------------------
# Sequence creation
# -------------------
def create_sequences(X, seq_len=AE_SEQ_LEN):
    sequences = []
    for i in range(len(X) - seq_len + 1):
        seq = X[i:i+seq_len]
        sequences.append(seq)
    return np.array(sequences, dtype=np.float32)

# -------------------
# Training
# -------------------
def train_ae():
    print("📂 Loading data...")
    df = load_csv(Path("data") / "features_labeled.csv")

    print("🔍 Filtering non-crisis (normal) periods...")
    normal = df[df["label"] == 0]

    print("🧹 Selecting features and dropping NaNs...")
    features = ['ret_1','ret_5','vol_20','vol_5','mom_20','vol_ratio','vix','vix_chg','skew_20','kurt_20','vol_spike']
    normal = normal.dropna()[features]

    print(f"📊 Shape of normal dataset after cleaning: {normal.shape}")

    print("⚖️ Scaling features...")
    scaler = StandardScaler()
    Xs = scaler.fit_transform(normal.values)

    print("📐 Creating training sequences...")
    seqs = create_sequences(Xs, seq_len=AE_SEQ_LEN)
    print("✅ AE training sequences shape:", seqs.shape)
    if len(seqs) == 0:
        raise RuntimeError("No training sequences created! Check AE_SEQ_LEN vs dataset length.")

    dataset = TensorDataset(torch.from_numpy(seqs), torch.from_numpy(seqs))
    dataloader = DataLoader(dataset, batch_size=AE_PARAMS.get("batch_size",64), shuffle=True)

    print("🏗️ Building LSTM Autoencoder model...")
    model = LSTMAutoencoder(AE_SEQ_LEN, seqs.shape[2], latent_dim=AE_PARAMS.get("latent_dim",16)).to(device)
    print(model)

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    epochs = AE_PARAMS.get("epochs", 40)
    patience = 5
    best_loss = np.inf
    counter = 0

    print("🚀 Starting training...")
    for epoch in range(epochs):
        model.train()
        epoch_loss = 0
        for batch_x, _ in dataloader:
            batch_x = batch_x.to(device)
            optimizer.zero_grad()
            output = model(batch_x)
            loss = criterion(output, batch_x)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * batch_x.size(0)
        epoch_loss /= len(dataset)
        print(f"Epoch {epoch+1}/{epochs}, Loss: {epoch_loss:.6f}")

        # Early stopping
        if epoch_loss < best_loss:
            best_loss = epoch_loss
            counter = 0
            torch.save(model.state_dict(), MODEL_AE_PATH)
            print(f"💾 Saved best model at epoch {epoch+1}")
        else:
            counter += 1
            if counter >= patience:
                print("⏹️ Early stopping triggered")
                break

    print("💾 Saving scaler...")
    joblib.dump(scaler, SCALER_AE_PATH)
    print("✅ Training complete!")
    print("📍 Best model saved at:", MODEL_AE_PATH)

    return model, scaler

if __name__ == "__main__":
    train_ae()

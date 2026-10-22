# fintwin_module/utils.py
import torch
import os
from model import AdvancedLSTM

def load_model_from_ckpt(ckpt_path, input_dim, device='cpu', hidden_dim=128, num_layers=3, dropout=0.2, use_quantum = True):
    model = AdvancedLSTM(input_dim=input_dim, hidden_dim=hidden_dim, num_layers=num_layers, dropout=dropout, use_quantum=use_quantum)
    state = torch.load(ckpt_path, map_location=device)
    if 'model_state' in state:
        model.load_state_dict(state['model_state'])
    else:
        model.load_state_dict(state)
    model.to(device)
    model.eval()
    return model

def export_torchscript(model, example_input, save_path='model_ts.pt', device='cpu'):
    model.to(device)
    model.eval()
    traced = torch.jit.trace(model, example_input.to(device))
    torch.jit.save(traced, save_path)
    return save_path

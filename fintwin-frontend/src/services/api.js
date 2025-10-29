import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// Generic call to model (dynamic)
export async function callModel(modelName, payload) {
  const url = `${BASE}/api/models/${modelName}`;
  const res = await axios.post(url, payload);
  return res.data;
}

// Get live stock quote
export async function getStock(symbol) {
  const url = `${BASE}/api/data/stock/${encodeURIComponent(symbol)}`;
  const res = await axios.get(url);
  return res.data;
}

// Orchestrator call (optional) - uncomment if you add orchestrator route
export async function orchestrator(payload) {
  const url = `${BASE}/api/orchestrator/query`;
  const res = await axios.post(url, payload);
  return res.data;
}
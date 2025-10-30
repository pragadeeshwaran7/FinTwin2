import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ModelCard from "./ModelCard";
import Chatbot from "./Chatbot";
import { callModel } from "../services/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Dashboard will fetch available models dynamically from the backend

const Dashboard = () => {
  const [price, setPrice] = useState(null);
  const [history, setHistory] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [stockSymbol, setStockSymbol] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [modelsList, setModelsList] = useState([]);
  const [liveHistory, setLiveHistory] = useState([]);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
            const response = await axios.get('http://localhost:5001/api/stocks');
        setStocks(response.data);
        if (response.data.length > 0) {
          setStockSymbol(response.data[0]);
        }
      } catch (error) {
        console.error("Error fetching stocks:", error);
      }
    };
    fetchStocks();
    // fetch model definitions
    const fetchModels = async () => {
      try {
        const res = await axios.get((import.meta.env.VITE_API_BASE || 'http://localhost:5001') + '/api/models/list');
        if (res.data && res.data.models) {
          setModelsList(res.data.models);
          if (res.data.models.length > 0) setSelectedModel(res.data.models[0].key);
        }
      } catch (err) {
        console.error('Error fetching model list', err);
      }
    };
    fetchModels();
  }, []);

  const fetchPrice = async () => {
    if (!stockSymbol) return;
    try {
      const response = await axios.get(`http://localhost:5001/api/finance/price/${stockSymbol}`);
      const newPrice = response.data.price;
      setPrice(newPrice);
      setLiveHistory(prevHistory => {
        const newHistory = [...prevHistory, { price: newPrice, timestamp: new Date() }];
        return newHistory.slice(-20); // Keep only the last 20 data points
      });
    } catch (error) {
      console.error("Error fetching price:", error);
    }
  };

  const fetchHistory = async () => {
    if (!stockSymbol) return;
    try {
      // Request the full historical dataset (1y) from the backend
        const response = await axios.get(`http://localhost:5001/api/finance/historical-data/${stockSymbol}`);
      // Backend returns objects with a `date` and `close` field. Map to the chart shape { price, timestamp }
      const mapped = response.data.map(item => ({
        price: item.close,
        // ensure timestamp is a parsable ISO string for recharts
        timestamp: new Date(item.date).toISOString(),
      }));
      setHistory(mapped);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  useEffect(() => {
    if (stockSymbol) {
      setLiveHistory([]);
      fetchPrice();
      fetchHistory();
      const poll = setInterval(fetchPrice, 10000);
      return () => clearInterval(poll);
    }
  }, [stockSymbol]);

  const onCallModel = async (modelName, payload) => {
    const r = await callModel(modelName, payload);
    return r;
  };

  return (
    <div>
      <div className="header">
        <div className="brand">FinTwin — Dashboard</div>
        <div className="row">
          <input
            className="input"
            list="stocks-list"
            value={stockSymbol}
            onChange={(e) => setStockSymbol(e.target.value)}
            placeholder="Enter or select stock"
          />
          <datalist id="stocks-list">
            {stocks.map(stock => (
              <option key={stock} value={stock}>
                {stock}
              </option>
            ))}
          </datalist>
          <select className="input" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
            {modelsList.map(m => (
              <option key={m.key} value={m.key}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h2>Live Price for {stockSymbol}</h2>
            <div style={{ fontSize: "2em" }}>
              {price !== null ? price : "Loading..."}
            </div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={liveHistory}>
                  <XAxis dataKey="timestamp" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h2>History for {stockSymbol}</h2>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis dataKey="timestamp" tickFormatter={(time) => new Date(time).toLocaleDateString()} />
                  <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card model-list">
            <h3>Models</h3>
            {modelsList.length === 0 ? (
              <div className="small">No models available (failed to fetch /api/models/list)</div>
            ) : (
              modelsList.map(m => (
                <div key={m.key} style={{marginBottom:12}}>
                  <ModelCard name={m.key} inputTemplate={m.inputTemplate} onCall={onCallModel} />
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <Chatbot />
          <div style={{height:16}} />
          <div className="card">
            <h3>Quick Orchestrator</h3>
            <div className="small">Run a combined call to multiple models (example)</div>
            <div style={{marginTop:10}}>
              <button className="btn" onClick={async ()=>{
                // Example: call two models and show alert (you can change this to nicer UI)
                const a = await onCallModel("model1",{feature:[3,6,9]});
                const b = await onCallModel("model2",{feature:[2,4,8]});
                alert("Model1:\n"+JSON.stringify(a)+ "\n\nModel2:\n"+JSON.stringify(b));
              }}>Run Composite</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
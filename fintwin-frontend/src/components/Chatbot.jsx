import React, { useState } from "react";
import { orchestrator } from "../services/api";

export default function Chatbot() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  const send = async () => {
    if(!text.trim()) return;
    const userMsg = { role:"user", text };
    setMessages(prev => [...prev, userMsg]);
    setText("");
    try {
      // Basic orchestrator payload: { user_id, intent, payload }
      const payload = { user_id: "user_1", intent: "forensic", payload: { query: text } };
      const res = await orchestrator(payload);
      setMessages(prev => [...prev, { role:"assistant", text: JSON.stringify(res) }]);
    } catch (err) {
      setMessages(prev => [...prev, { role:"assistant", text: "Error: " + err.message }]);
    }
  };

  return (
    <div className="card">
      <h3>Chat</h3>
      <div style={{height:240, overflowY:"auto",marginTop:8, padding:8, background:"rgba(0,0,0,0.05)", borderRadius:8}}>
        {messages.length===0 && <div className="small">Ask FinTwin a question (calls orchestrator)</div>}
        {messages.map((m,i)=>(
          <div key={i} style={{marginBottom:8}}>
            <div style={{fontSize:12,color:m.role==="user" ? "#9be7ff" : "#b8f1e4"}}>{m.role}</div>
            <div style={{whiteSpace:"pre-wrap"}}>{m.text}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex", gap:8, marginTop:10}}>
        <input className="input" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Ask something like: Why did my spending spike?" />
        <button className="btn" onClick={send}>Send</button>
      </div>
    </div>
  );
}
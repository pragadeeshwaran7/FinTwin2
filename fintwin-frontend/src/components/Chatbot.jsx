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
      const payload = { payload: { query: text } };
      const res = await orchestrator(payload);
      // Extract message from response and add to chat
      const assistantText = res.data?.message || "I couldn't generate a response. Please try again.";
      setMessages(prev => [...prev, { role:"assistant", text: assistantText }]);
    } catch (err) {
      // Show user-friendly error
      const errorMsg = err.response?.data?.message || err.message || "Something went wrong. Please try again.";
      setMessages(prev => [...prev, { role:"assistant", text: "Error: " + errorMsg }]);
    }
  };

  return (
    <div className="card">
      <h3>Chat</h3>
      <div style={{height:240, overflowY:"auto",marginTop:8, padding:8, background:"rgba(0,0,0,0.05)", borderRadius:8}}>
        {messages.length===0 && (
          <div className="small" style={{textAlign:"center",color:"#666"}}>
            Welcome! How can I help you today?
          </div>
        )}
        {messages.map((m,i)=>(
          <div key={i} style={{
            marginBottom: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: m.role === "user" ? "flex-end" : "flex-start"
          }}>
            <div style={{
              maxWidth: "80%",
              padding: "8px 12px",
              borderRadius: 12,
              background: m.role === "user" ? "#1976d2" : "#2e7d32",
              color: "#fff"
            }}>
              {m.text}
            </div>
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
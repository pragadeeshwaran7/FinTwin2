import React, { useState } from "react";

/**
 Props:
  - name: model name (string, e.g., "model1")
  - inputTemplate: object template for payload
  - onCall: async function(payload) => result
*/
export default function ModelCard({ name, inputTemplate = {}, onCall }) {
  const [payload, setPayload] = useState(JSON.stringify(inputTemplate, null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const parsed = JSON.parse(payload);
      const r = await onCall(name, parsed);
      setResult(r);
    } catch (err) {
      setResult({ error: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><strong>{name}</strong><div className="small">Call the model and inspect the output</div></div>
        <button className="btn" onClick={run} disabled={loading}>{loading ? "Running..." : "Run"}</button>
      </div>

      <div style={{marginTop:12}}>
        <div className="small">Payload (edit JSON)</div>
        <textarea className="input" rows={6} style={{width:"100%",marginTop:6,fontFamily:"monospace"}} value={payload} onChange={(e)=>setPayload(e.target.value)} />
      </div>

      <div style={{marginTop:10}}>
        <div className="small">Result</div>
        <div className="result-box" style={{minHeight:60}}>
          {result ? <pre style={{margin:0}}>{JSON.stringify(result, null, 2)}</pre> : <span className="small">No result yet</span>}
        </div>
      </div>
    </div>
  );
}
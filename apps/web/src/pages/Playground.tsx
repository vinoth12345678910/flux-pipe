import { FormEvent, useState } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { ErrorBox } from "../components/ui";

export default function Playground() {
  const pipes = useAsync(() => api.pipelines().then((r) => r.data));
  const [key, setKey] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [payload, setPayload] = useState('{\n  "event": "user.signed_up",\n  "userId": "123"\n}');
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setResult(null);
    try {
      const { data } = await api.ingest(key.trim(), { pipelineId: pipelineId || pipes.data?.[0]?.id, payload: JSON.parse(payload) });
      setResult(JSON.stringify(data, null, 2));
    } catch (e: any) { setErr(e instanceof SyntaxError ? "Payload must be valid JSON" : e.message); }
  };

  return (
    <>
      <div className="page-head"><h2>Send Test Event</h2></div>
      <form className="card" onSubmit={send}>
        <label>API key (from the API Keys page)<input required type="password" placeholder="fp_live_…" value={key} onChange={(e) => setKey(e.target.value)} /></label>
        <label>Pipeline
          <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>
            {pipes.data?.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Payload (JSON)<textarea rows={8} value={payload} onChange={(e) => setPayload(e.target.value)} /></label>
        <ErrorBox message={err} />
        <button>Send → POST /v1/ingest</button>
        {result && <pre>{result}</pre>}
      </form>
    </>
  );
}

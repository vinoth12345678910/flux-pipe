import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { Empty, ErrorBox, Modal } from "../components/ui";

const TYPES = ["webhook", "http", "s3", "kafka"];

export default function PipelineDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const pipe = useAsync(async () => {
    // GET /v1/pipelines/:id 404s for paused pipelines, so read from the list instead
    const { data } = await api.pipelines();
    const found = data.find((x) => x.id === id);
    if (!found) throw new Error("Pipeline not found");
    return found;
  }, [id]);
  const dests = useAsync(() => api.destinations(id).then((r) => r.data), [id]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", type: "webhook", url: "", secret: "", extra: "" });
  const [err, setErr] = useState<string | null>(null);
  const [pageErr, setPageErr] = useState<string | null>(null);

  const addDest = async (e: FormEvent) => {
    e.preventDefault();
    try {
      let config: Record<string, unknown> = {};
      if (f.extra.trim()) config = JSON.parse(f.extra);
      if (f.url) config.url = f.url;
      if (f.secret) config.secret = f.secret;
      await api.createDestination({ name: f.name, type: f.type, pipelineId: id, config });
      setOpen(false); setF({ name: "", type: "webhook", url: "", secret: "", extra: "" }); setErr(null); dests.reload();
    } catch (e: any) { setErr(e instanceof SyntaxError ? "Extra config must be valid JSON" : e.message); }
  };

  const act = async (fn: () => Promise<unknown>, after: () => void) => {
    try { await fn(); setPageErr(null); after(); } catch (e: any) { setPageErr(e.message); }
  };

  const p = pipe.data;
  return (
    <>
      <div className="page-head">
        <h2>{p?.name ?? "Pipeline"}</h2>
        {p && (
          <div className="row">
            <button className="ghost" onClick={() => act(() => api.updatePipeline(id, { isActive: !p.isActive }), pipe.reload)}>{p.isActive ? "Pause" : "Activate"}</button>
            <button className="danger" onClick={() => confirm("Delete this pipeline?") && act(() => api.deletePipeline(id), () => nav("/pipelines"))}>Delete</button>
          </div>
        )}
      </div>
      <ErrorBox message={pipe.error || pageErr} />
      {p && (
        <div className="card">
          <p className="muted">{p.description || "No description"}</p>
          <small>Pipeline ID (use as <code>pipelineId</code> when ingesting):</small>
          <div><code className="copy" onClick={() => navigator.clipboard?.writeText(p.id)} title="Click to copy">{p.id}</code></div>
        </div>
      )}
      <div className="page-head"><h3>Destinations</h3><button onClick={() => setOpen(true)}>+ Add destination</button></div>
      {dests.data?.length === 0 && <Empty>No destinations. Events will have nowhere to be delivered.</Empty>}
      <div className="grid">
        {dests.data?.map((d) => (
          <div className="card" key={d.id}>
            <h3>{d.name}</h3>
            <p className="muted">{d.type} · {d.config?.url ?? "—"}</p>
            <div className="row">
              <small>{d.isActive ? "● Active" : "○ Paused"}</small>
              <button className="ghost" onClick={() => act(() => api.updateDestination(d.id, { isActive: !d.isActive }), dests.reload)}>{d.isActive ? "Pause" : "Resume"}</button>
              <button className="danger" onClick={() => confirm("Delete destination?") && act(() => api.deleteDestination(d.id), dests.reload)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {open && (
        <Modal title="Add destination" onClose={() => setOpen(false)}>
          <form onSubmit={addDest}>
            <label>Name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label>Type<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label>URL<input type="url" placeholder="https://example.com/webhook" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></label>
            <label>Signing secret (optional, stored encrypted)<input type="password" value={f.secret} onChange={(e) => setF({ ...f, secret: e.target.value })} /></label>
            <label>Extra config (JSON, optional)<textarea rows={3} value={f.extra} onChange={(e) => setF({ ...f, extra: e.target.value })} /></label>
            <ErrorBox message={err} />
            <button>Add</button>
          </form>
        </Modal>
      )}
    </>
  );
}

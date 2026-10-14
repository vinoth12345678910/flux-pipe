import { useState } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { Empty, ErrorBox, Modal, StatusBadge, fmt } from "../components/ui";

const STATUSES = ["", "pending", "processing", "delivered", "partial_failure", "failed"];

export default function Events() {
  const [status, setStatus] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const pipes = useAsync(() => api.pipelines().then((r) => r.data));
  const list = useAsync(() => api.events({ page, limit: 20, status, pipelineId }), [page, status, pipelineId]);
  const rows = list.data?.data;
  const meta = list.data?.meta;

  return (
    <>
      <div className="page-head">
        <h2>Events</h2>
        <div className="row">
          <select value={pipelineId} onChange={(e) => { setPipelineId(e.target.value); setPage(1); }}>
            <option value="">All pipelines</option>
            {pipes.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace("_", " ") : "All statuses"}</option>)}
          </select>
          <button className="ghost" onClick={list.reload}>↻</button>
        </div>
      </div>
      <ErrorBox message={list.error} />
      {rows?.length === 0 && <Empty>No events match.</Empty>}
      {!!rows?.length && (
        <div className="card">
          <table>
            <thead><tr><th>ID</th><th>Status</th><th>Received</th><th>Delivered</th></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="clickable" onClick={() => setSelected(e.id)}>
                  <td><code>{e.id.slice(0, 8)}</code></td><td><StatusBadge status={e.status} /></td><td>{fmt(e.receivedAt)}</td><td>{fmt(e.deliveredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pager">
            <button className="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <small>Page {meta?.page} of {meta?.totalPages || 1} · {meta?.total} events</small>
            <button className="ghost" disabled={!meta || page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>
      )}
      {selected && <EventModal id={selected} onClose={() => setSelected(null)} onChanged={list.reload} />}
    </>
  );
}

function EventModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const ev = useAsync(() => api.event(id).then((r) => r.data), [id]);
  const [msg, setMsg] = useState<string | null>(null);
  const e = ev.data;
  const canReplay = e && (e.status === "failed" || e.status === "partial_failure");

  const replay = async () => {
    try { await api.replay(id); setMsg("Replay queued."); ev.reload(); onChanged(); } catch (x: any) { setMsg(x.message); }
  };

  return (
    <Modal title={`Event ${id.slice(0, 8)}`} onClose={onClose}>
      <ErrorBox message={ev.error} />
      {e && (
        <>
          <div className="row"><StatusBadge status={e.status} /><small>Received {fmt(e.receivedAt)}</small>{canReplay && <button onClick={replay}>Replay</button>}</div>
          {msg && <p className="muted">{msg}</p>}
          <h4>Payload</h4>
          <pre>{JSON.stringify(e.payload, null, 2)}</pre>
          <h4>Delivery attempts</h4>
          {e.deliveryAttempts.length === 0 ? <p className="muted">None yet.</p> : (
            <table>
              <thead><tr><th>#</th><th>Destination</th><th>Status</th><th>HTTP</th><th>ms</th><th>Error</th></tr></thead>
              <tbody>{e.deliveryAttempts.map((a) => (
                <tr key={a.id}><td>{a.attemptNumber}</td><td>{a.destination?.name ?? "—"}</td><td><StatusBadge status={a.status} /></td><td>{a.responseCode ?? "—"}</td><td>{a.latencyMs ?? "—"}</td><td>{a.errorMessage ?? ""}</td></tr>
              ))}</tbody>
            </table>
          )}
          {e.eventLogs.length > 0 && (<><h4>Log</h4><pre>{e.eventLogs.map((l) => `${fmt(l.createdAt)} [${l.level}] ${l.message}`).join("\n")}</pre></>)}
        </>
      )}
    </Modal>
  );
}

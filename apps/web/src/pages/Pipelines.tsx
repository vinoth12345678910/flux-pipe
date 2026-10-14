import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { Empty, ErrorBox, Modal, fmt } from "../components/ui";

export default function Pipelines() {
  const { data, error, loading, reload } = useAsync(() => api.pipelines().then((r) => r.data));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createPipeline({ name, description: description || undefined });
      setOpen(false); setName(""); setDescription(""); setErr(null); reload();
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <>
      <div className="page-head"><h2>Pipelines</h2><button onClick={() => setOpen(true)}>+ New pipeline</button></div>
      <ErrorBox message={error} />
      {loading && !data && <p className="muted">Loading…</p>}
      {data?.length === 0 && <Empty>No pipelines yet.</Empty>}
      <div className="grid">
        {data?.map((p) => (
          <Link to={`/pipelines/${p.id}`} className="card link-card" key={p.id}>
            <h3>{p.name}</h3>
            <p className="muted">{p.description || "No description"}</p>
            <small>{p.isActive ? "● Active" : "○ Inactive"} · {fmt(p.createdAt)}</small>
          </Link>
        ))}
      </div>
      {open && (
        <Modal title="New pipeline" onClose={() => setOpen(false)}>
          <form onSubmit={create}>
            <label>Name<input required autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} /></label>
            <ErrorBox message={err} />
            <button>Create</button>
          </form>
        </Modal>
      )}
    </>
  );
}

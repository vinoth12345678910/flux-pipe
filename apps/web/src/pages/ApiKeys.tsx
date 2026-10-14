import { FormEvent, useState } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { Empty, ErrorBox, Modal, fmt } from "../components/ui";

export default function ApiKeys() {
  const { data, error, reload } = useAsync(() => api.apiKeys().then((r) => r.data));
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.createApiKey(name);
      setNewKey(data.key); setName(""); setErr(null); reload();
    } catch (e: any) { setErr(e.message); }
  };
  const revoke = async (id: string) => {
    if (!confirm("Revoke this key? Clients using it will stop working.")) return;
    try { await api.revokeApiKey(id); reload(); } catch (e: any) { setErr(e.message); }
  };

  return (
    <>
      <div className="page-head"><h2>API Keys</h2></div>
      <form className="card row" onSubmit={create}>
        <input required placeholder="Key name, e.g. Production" value={name} onChange={(e) => setName(e.target.value)} />
        <button>Generate key</button>
      </form>
      <ErrorBox message={error || err} />
      {data?.length === 0 && <Empty>No active keys.</Empty>}
      {!!data?.length && (
        <div className="card"><table>
          <thead><tr><th>Name</th><th>Prefix</th><th>Created</th><th>Last used</th><th /></tr></thead>
          <tbody>{data.map((k) => (
            <tr key={k.id}><td>{k.name}</td><td><code>{k.prefix}…</code></td><td>{fmt(k.createdAt)}</td><td>{fmt(k.lastUsedAt)}</td><td><button className="danger" onClick={() => revoke(k.id)}>Revoke</button></td></tr>
          ))}</tbody>
        </table></div>
      )}
      {newKey && (
        <Modal title="Your new API key" onClose={() => setNewKey(null)}>
          <p className="muted">Copy it now — it won't be shown again.</p>
          <pre className="copy" onClick={() => navigator.clipboard?.writeText(newKey)}>{newKey}</pre>
          <button onClick={() => { navigator.clipboard?.writeText(newKey); }}>Copy</button>
        </Modal>
      )}
    </>
  );
}

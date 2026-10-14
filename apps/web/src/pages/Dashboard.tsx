import { Link } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { ErrorBox, StatusBadge, fmt } from "../components/ui";

export default function Dashboard() {
  const usage = useAsync(() => api.usage().then((r) => r.data));
  const recent = useAsync(() => api.events({ limit: 8 }).then((r) => r.data));
  const u = usage.data;
  const stats: [string, string | number][] = u ? [
    ["Events today", u.eventsToday],
    ["Events this month", u.eventsThisMonth],
    ["Total events", u.totalEvents],
    ["Delivery success", `${u.deliverySuccessRate}%`],
    ["Pipelines", u.pipelineCount],
    ["Destinations", u.destinationCount],
  ] : [];

  return (
    <>
      <div className="page-head"><h2>Dashboard</h2><button className="ghost" onClick={() => { usage.reload(); recent.reload(); }}>↻ Refresh</button></div>
      <ErrorBox message={usage.error} />
      <div className="stats">{stats.map(([k, v]) => <div className="card stat" key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>
      <div className="card">
        <div className="page-head"><h3>Recent events</h3><Link to="/events">View all →</Link></div>
        {recent.data?.length === 0 && <p className="muted">No events yet. Create a pipeline and an API key, then <Link to="/playground">send a test event</Link>.</p>}
        <table><tbody>
          {recent.data?.map((e) => (
            <tr key={e.id}><td><code>{e.id.slice(0, 8)}</code></td><td><StatusBadge status={e.status} /></td><td>{fmt(e.receivedAt)}</td></tr>
          ))}
        </tbody></table>
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { api, session } from "./api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pipelines from "./pages/Pipelines";
import PipelineDetail from "./pages/PipelineDetail";
import Events from "./pages/Events";
import ApiKeys from "./pages/ApiKeys";
import Playground from "./pages/Playground";

function Layout() {
  const nav = useNavigate();
  const user = session.user;
  useEffect(() => {
    const h = () => nav("/login");
    window.addEventListener("fp-logout", h);
    return () => window.removeEventListener("fp-logout", h);
  }, [nav]);

  if (!session.isAuthed) return <Navigate to="/login" replace />;

  const logout = async () => {
    try { await api.logout(); } catch { /* token may already be expired */ }
    session.clear();
    nav("/login");
  };

  return (
    <div className="shell">
      <aside>
        <div className="brand">⚡ FluxPipe</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/pipelines">Pipelines</NavLink>
          <NavLink to="/events">Events</NavLink>
          <NavLink to="/api-keys">API Keys</NavLink>
          <NavLink to="/playground">Send Test Event</NavLink>
        </nav>
        <div className="user">
          <div>{user?.name}</div>
          <small>{user?.email} · {user?.role}</small>
          <button className="ghost" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main><Outlet /></main>
    </div>
  );
}

export default function App() {
  const [, force] = useState(0);
  return (
    <Routes>
      <Route path="/login" element={<Login onAuth={() => force((n) => n + 1)} />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="pipelines" element={<Pipelines />} />
        <Route path="pipelines/:id" element={<PipelineDetail />} />
        <Route path="events" element={<Events />} />
        <Route path="api-keys" element={<ApiKeys />} />
        <Route path="playground" element={<Playground />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

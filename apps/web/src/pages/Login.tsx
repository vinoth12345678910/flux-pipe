import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, session } from "../api";
import { ErrorBox } from "../components/ui";

export default function Login({ onAuth }: { onAuth: () => void }) {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ email: "", password: "", name: "", orgName: "", orgSlug: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { data } = mode === "login" ? await api.login(f.email, f.password) : await api.register(f);
      session.save(data.user, data.accessToken, data.refreshToken);
      onAuth();
      nav("/");
    } catch (e: any) {
      setErr(e.details ? `${e.message}: ${JSON.stringify(e.details)}` : e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <h1>⚡ FluxPipe</h1>
        <p className="muted">{mode === "login" ? "Sign in to your workspace" : "Create your organization"}</p>
        {mode === "register" && (
          <>
            <label>Your name<input required value={f.name} onChange={set("name")} /></label>
            <label>Organization name<input required value={f.orgName} onChange={set("orgName")} /></label>
            <label>Organization slug<input required pattern="[a-z0-9-]{3,63}" title="3+ lowercase letters, digits or dashes" value={f.orgSlug} onChange={set("orgSlug")} /></label>
          </>
        )}
        <label>Email<input required type="email" value={f.email} onChange={set("email")} /></label>
        <label>Password<input required type="password" minLength={mode === "register" ? 8 : 1} value={f.password} onChange={set("password")} /></label>
        <ErrorBox message={err} />
        <button disabled={busy}>{busy ? "…" : mode === "login" ? "Sign in" : "Create account"}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(null); }}>
          {mode === "login" ? "No account? Register" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

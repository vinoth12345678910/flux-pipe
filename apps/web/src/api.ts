export interface User { id: string; email: string; name: string; role: "admin" | "operator" | "viewer"; orgId: string }
export interface Meta { page: number; limit: number; total: number; totalPages: number }
export interface Pipeline { id: string; name: string; description?: string | null; isActive: boolean; config: any; createdAt: string }
export interface Destination { id: string; name: string; type: string; pipelineId: string; config: any; isActive: boolean }
export interface EventRow { id: string; pipelineId: string; status: string; payload: any; receivedAt: string; processedAt?: string | null; deliveredAt?: string | null }
export interface Attempt { id: string; attemptNumber: number; status: string; responseCode?: number | null; latencyMs?: number | null; errorMessage?: string | null; attemptedAt: string; destination?: { id: string; name: string; type: string } }
export interface EventDetail extends EventRow { deliveryAttempts: Attempt[]; eventLogs: { id: string; level: string; message: string; createdAt: string }[] }
export interface ApiKey { id: string; prefix: string; name: string; createdAt: string; lastUsedAt?: string | null }
export interface Usage { eventsToday: number; eventsThisMonth: number; totalEvents: number; deliverySuccessRate: number; pipelineCount: number; destinationCount: number }

const store = {
  get access() { return localStorage.getItem("fp_access"); },
  get refresh() { return localStorage.getItem("fp_refresh"); },
  set(a: string, r: string) { localStorage.setItem("fp_access", a); localStorage.setItem("fp_refresh", r); },
  clear() { localStorage.removeItem("fp_access"); localStorage.removeItem("fp_refresh"); localStorage.removeItem("fp_user"); },
};

export const session = {
  get user(): User | null { try { return JSON.parse(localStorage.getItem("fp_user") || "null"); } catch { return null; } },
  save(user: User, a: string, r: string) { store.set(a, r); localStorage.setItem("fp_user", JSON.stringify(user)); },
  clear: store.clear,
  get isAuthed() { return !!store.access; },
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (!store.refresh) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch("/v1/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: store.refresh }) });
      if (!res.ok) return false;
      const { data } = await res.json();
      store.set(data.accessToken, data.refreshToken);
      return true;
    } catch { return false; } finally { setTimeout(() => (refreshing = null), 0); }
  })();
  return refreshing;
}

export async function request<T = any>(method: string, path: string, body?: unknown, opts: { token?: string; retry?: boolean } = {}): Promise<{ data: T; meta?: Meta }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = opts.token ?? store.access;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 401 && !opts.token && opts.retry !== false && !path.startsWith("/v1/auth/")) {
    if (await tryRefresh()) return request(method, path, body, { retry: false });
    store.clear();
    window.dispatchEvent(new Event("fp-logout"));
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const e = json.error ?? {};
    throw new ApiError(res.status, e.code ?? "ERROR", e.message ?? `Request failed (${res.status})`, e.details);
  }
  return { data: json.data as T, meta: json.meta };
}

const qs = (o: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== undefined && v !== "" && p.set(k, String(v)));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  login: (email: string, password: string) => request<{ accessToken: string; refreshToken: string; user: User }>("POST", "/v1/auth/login", { email, password }),
  register: (b: { email: string; password: string; name: string; orgName: string; orgSlug: string }) => request<{ accessToken: string; refreshToken: string; user: User }>("POST", "/v1/auth/register", b),
  logout: () => request("POST", "/v1/auth/logout"),
  usage: () => request<Usage>("GET", "/v1/usage"),
  pipelines: (page = 1) => request<Pipeline[]>("GET", `/v1/pipelines${qs({ page, limit: 100 })}`),
  pipeline: (id: string) => request<Pipeline>("GET", `/v1/pipelines/${id}`),
  createPipeline: (b: unknown) => request<Pipeline>("POST", "/v1/pipelines", b),
  updatePipeline: (id: string, b: unknown) => request<Pipeline>("PUT", `/v1/pipelines/${id}`, b),
  deletePipeline: (id: string) => request("DELETE", `/v1/pipelines/${id}`),
  destinations: (pipelineId: string) => request<Destination[]>("GET", `/v1/destinations/pipeline/${pipelineId}`),
  createDestination: (b: unknown) => request<Destination>("POST", "/v1/destinations", b),
  updateDestination: (id: string, b: unknown) => request<Destination>("PUT", `/v1/destinations/${id}`, b),
  deleteDestination: (id: string) => request("DELETE", `/v1/destinations/${id}`),
  events: (f: { page?: number; limit?: number; status?: string; pipelineId?: string }) => request<EventRow[]>("GET", `/v1/events${qs(f)}`),
  event: (id: string) => request<EventDetail>("GET", `/v1/events/${id}`),
  replay: (id: string) => request("POST", `/v1/deliveries/${id}/replay`),
  apiKeys: () => request<ApiKey[]>("GET", "/v1/api-keys"),
  createApiKey: (name: string) => request<{ key: string; prefix: string; name: string }>("POST", "/v1/api-keys", { name }),
  revokeApiKey: (id: string) => request("DELETE", `/v1/api-keys/${id}`),
  ingest: (key: string, body: unknown) => request<{ eventId: string; status: string }>("POST", "/v1/ingest", body, { token: key }),
};

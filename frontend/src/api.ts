import type {
  ActiveCall, AdminUser, AuditRecord, AuthResponse, CallPage, CallRecord, Evaluation,
  Presence, QualitySummary, ReportSummary, ServiceStatus, SipConfig,
} from "./types";

const TOKEN_KEY = "telecom-qa-token";

export const session = {
  get token() {
    return sessionStorage.getItem(TOKEN_KEY);
  },
  set token(value: string | null) {
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
  },
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (session.token) headers.set("Authorization", `Bearer ${session.token}`);
  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Error de comunicacion" }));
    throw new Error(body.detail ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  sipConfig: () => request<SipConfig>("/api/extensions/me/sip-config"),
  calls: () => request<CallRecord[]>("/api/calls?limit=50"),
  callPage: (params: { search?: string; disposition?: string; date?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? 10));
    query.set("offset", String(params.offset ?? 0));
    if (params.search) query.set("search", params.search);
    if (params.disposition) query.set("disposition", params.disposition);
    if (params.date) {
      query.set("date_from", `${params.date}T00:00:00-05:00`);
      query.set("date_to", `${params.date}T23:59:59-05:00`);
    }
    return request<CallPage>(`/api/calls/page?${query}`);
  },
  audit: () => request<AuditRecord[]>("/api/audit?limit=100"),
  quality: () => request<Record<string, number | string>>("/api/metrics/quality"),
  qualitySummary: () => request<QualitySummary>("/api/metrics/quality-summary"),
  services: () => request<ServiceStatus>("/api/services/status"),
  activeCalls: () => request<ActiveCall[]>("/api/monitoring/active-calls"),
  evaluations: () => request<Evaluation[]>("/api/evaluations"),
  createEvaluation: (callId: number, score: number, notes: string) => request<Evaluation>("/api/evaluations", {
    method: "POST",
    body: JSON.stringify({ call_id: callId, score, notes }),
  }),
  reportSummary: () => request<ReportSummary>("/api/reports/summary"),
  reportPdf: async () => {
    const response = await fetch("/api/reports/summary.pdf", {
      headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
    });
    if (!response.ok) throw new Error("No se pudo generar el reporte PDF");
    return response.blob();
  },
  users: () => request<AdminUser[]>("/api/users"),
  updateUserStatus: (username: string, active: boolean) => request<AdminUser>(`/api/users/${encodeURIComponent(username)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  }),
  currentPresence: () => request<Presence>("/api/presence"),
  presence: (doNotDisturb: boolean) => request<Presence>("/api/presence", {
    method: "POST",
    body: JSON.stringify({ do_not_disturb: doNotDisturb }),
  }),
  callEvent: (event: string, destination: string, media: "audio" | "video", sessionId: string, target?: string) =>
    request<{ accepted: boolean }>("/api/calls/events", {
      method: "POST",
      body: JSON.stringify({ event, destination, media, session_id: sessionId, target }),
    }),
  callQuality: (sessionId: string, values: {
    packets_received: number; packets_lost: number; jitter_ms: number | null;
    rtt_ms: number | null; bitrate_kbps: number | null;
  }) => request<{ accepted: boolean; mos: number }>("/api/calls/quality", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, ...values }),
  }),
  recording: async (uniqueid: string) => {
    const response = await fetch(`/api/recordings/${encodeURIComponent(uniqueid)}`, {
      headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
    });
    if (!response.ok) throw new Error("Grabacion no disponible");
    return response.blob();
  },
};

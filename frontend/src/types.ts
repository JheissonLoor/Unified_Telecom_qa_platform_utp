export type Role = "AgenteCallCenter" | "Supervisor" | "AdministradorQA";

export interface User {
  username: string;
  display_name: string;
  role: Role;
  active: boolean;
  extension: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface SipConfig {
  extension: string;
  authorization_username: string;
  password: string;
  websocket_url: string;
  sip_domain: string;
  ice_servers: RTCIceServer[];
}

export interface CallRecord {
  id: number;
  calldate: string;
  src: string | null;
  dst: string | null;
  duration: number;
  billsec: number;
  disposition: string | null;
  uniqueid: string;
  direction: "incoming" | "outgoing" | "internal";
  media: "audio" | "video";
  mos: number | null;
  recording_available: boolean;
}

export interface CallPage {
  items: CallRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditRecord {
  id: number;
  occurred_at: string;
  actor: string;
  action: string;
  outcome: string;
  correlation_id: string;
  details: Record<string, unknown>;
}

export interface ServiceStatus {
  api: "ok" | "error";
  database: "ok" | "error";
  pbx: "ok" | "error";
  recording: "ok" | "error";
  ivr: "ok" | "error";
  network: "ok" | "degraded";
}

export interface ActiveCall {
  session_id: string;
  actor: string;
  source_extension: string;
  destination: string;
  media: string;
  state: string;
  started_at: string;
  held: boolean;
  mos: number | null;
}

export interface Evaluation {
  id: number;
  call_id: number;
  evaluator: string;
  score: number;
  notes: string;
  created_at: string;
}

export interface ReportSummary {
  total_calls: number;
  answered_calls: number;
  failed_calls: number;
  answer_rate: number;
  average_duration_seconds: number;
  average_mos: number | null;
}

export interface AdminUser extends User {
  midpoint_oid: string | null;
}

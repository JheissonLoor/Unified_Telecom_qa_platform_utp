import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Activity, AudioLines, Ban, BarChart3, CalendarDays, Camera, CheckCircle2,
  ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, Download,
  History, Home, KeyRound, ListFilter, LockKeyhole, LogOut, Menu,
  Mic, MonitorUp, Pause, Phone, PhoneCall, PhoneForwarded, PhoneIncoming,
  PhoneOff, PhoneOutgoing, PlayCircle, RefreshCw, Search, ShieldCheck,
  Speaker, Star, Users, UserRound, Video, X,
} from "lucide-react";
import type { Session } from "sip.js";
import { api } from "../api";
import {
  SipClient, type IncomingCall, type RegistrationState,
} from "../sip";
import type {
  ActiveCall, AdminUser, AuditRecord, CallPage, CallRecord, Evaluation,
  ReportSummary, ServiceStatus, User,
} from "../types";

interface Props { user: User; onLogout: () => void; }
type View = "home" | "calls" | "history" | "quality" | "audit" | "monitoring" | "evaluations" | "reports" | "users";

const EMPTY_PAGE: CallPage = { items: [], total: 0, limit: 5, offset: 0 };
const EMPTY_SERVICES: ServiceStatus = {
  api: "ok", database: "error", pbx: "error", recording: "error", ivr: "error", network: "degraded",
};

function duration(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function callType(call: CallRecord) {
  if (call.direction === "incoming") return "Entrante";
  if (call.direction === "outgoing") return "Saliente";
  return "Interna";
}

export function Dashboard({ user, onLogout }: Props) {
  const [view, setView] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [registration, setRegistration] = useState<RegistrationState>("offline");
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [callState, setCallState] = useState("IDLE");
  const [destination, setDestination] = useState("");
  const [callsPage, setCallsPage] = useState<CallPage>(EMPTY_PAGE);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [quality, setQuality] = useState<Record<string, number | string | null>>({});
  const [services, setServices] = useState<ServiceStatus>(EMPTY_SERVICES);
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState("Listo para conectar");
  const [media, setMedia] = useState<"audio" | "video">("audio");
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [held, setHeld] = useState(false);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [dialpadOpen, setDialpadOpen] = useState(false);
  const [filters, setFilters] = useState({ search: "", disposition: "", date: "" });
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingTitle, setRecordingTitle] = useState("");
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const sip = useRef<SipClient>();
  const recordingUrlRef = useRef<string | null>(null);

  const calls = callsPage.items;
  const canSupervise = user.role === "Supervisor" || user.role === "AdministradorQA";
  const canAdminister = user.role === "AdministradorQA";

  async function refreshCalls(offset = callsPage.offset) {
    try {
      setCallsPage(await api.callPage({ ...filters, limit: 5, offset }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el historial");
    }
  }

  async function refreshServices() {
    try { setServices(await api.services()); } catch { setServices(EMPTY_SERVICES); }
  }

  useEffect(() => {
    sip.current = new SipClient({
      onRegistration: setRegistration,
      onIncoming: setIncoming,
      onSession: (session) => {
        setActiveSession(session);
        setCallState(session?.state ?? "IDLE");
        if (session) window.setTimeout(() => {
          const state = sip.current?.attachMedia(localVideo.current, remoteVideo.current);
          if (state) {
            setMicrophoneEnabled(state.audio);
            setCameraEnabled(state.video);
          }
        }, 450);
        else {
          setMicrophoneEnabled(false);
          setCameraEnabled(false);
          setHeld(false);
        }
      },
      onError: setMessage,
    });
    Promise.all([
      api.callPage({ limit: 5, offset: 0 }).then(setCallsPage),
      api.services().then(setServices),
    ]).catch(() => setMessage("Algunos datos operativos no estan disponibles"));
    const serviceTimer = window.setInterval(() => void refreshServices(), 30000);
    return () => {
      window.clearInterval(serviceTimer);
      sip.current?.disconnect().catch(() => undefined);
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    };
  }, []);

  async function connectSip() {
    try {
      await sip.current?.connect(await api.sipConfig());
      setMessage("Extension registrada en Asterisk");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Fallo SIP"); }
  }

  async function startCall(withVideo: boolean, target = destination) {
    if (!/^\d{3,16}$/.test(target)) { setMessage("Ingresa una extension valida"); return; }
    try {
      const kind = withVideo ? "video" : "audio";
      setDestination(target);
      setMedia(kind);
      const call = await sip.current?.call(target, withVideo);
      if (call) await api.callEvent("started", target, kind, call.id);
      setMessage(`Llamando a ${target}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo llamar"); }
  }

  async function acceptIncoming() {
    if (!incoming) return;
    try {
      const pending = incoming;
      const session = await sip.current?.acceptIncoming();
      setDestination(pending.from);
      setMedia(pending.withVideo ? "video" : "audio");
      if (session) await api.callEvent("answered", pending.from, pending.withVideo ? "video" : "audio", session.id);
      setMessage(`Llamada de ${pending.from} contestada`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo contestar"); }
  }

  async function rejectIncoming() {
    await sip.current?.rejectIncoming();
    setIncoming(null);
    setMessage("Llamada rechazada");
  }

  async function hangup() {
    const session = activeSession;
    if (!session) return;
    try {
      const snapshot = await sip.current?.qualitySnapshot();
      if (snapshot) await api.callQuality(session.id, snapshot).catch(() => undefined);
      await sip.current?.hangup();
      if (destination) await api.callEvent("ended", destination, media, session.id).catch(() => undefined);
      setMessage("Llamada finalizada");
      await refreshCalls(0);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo finalizar"); }
  }

  function toggleMedia(kind: "audio" | "video") {
    const enabled = kind === "audio" ? !microphoneEnabled : !cameraEnabled;
    if (!sip.current?.setMediaEnabled(kind, enabled)) {
      setMessage(kind === "video" ? "Permite la camara y vuelve a llamar" : "Microfono no disponible");
      return;
    }
    if (kind === "audio") setMicrophoneEnabled(enabled); else setCameraEnabled(enabled);
    setMessage(`${kind === "audio" ? "Microfono" : "Camara"} ${enabled ? "activado" : "desactivado"}`);
  }

  function toggleSpeaker() {
    const enabled = !speakerEnabled;
    if (sip.current?.setRemoteAudioEnabled(remoteVideo.current, enabled)) {
      setSpeakerEnabled(enabled);
      setMessage(`Altavoz ${enabled ? "activado" : "silenciado"}`);
    }
  }

  async function toggleHold() {
    try {
      const next = !held;
      await sip.current?.setHold(next);
      setHeld(next);
      if (activeSession) await api.callEvent(next ? "held" : "resumed", destination, media, activeSession.id);
      setMessage(next ? "Llamada retenida" : "Llamada reanudada");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo retener"); }
  }

  async function transferCall(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{3,16}$/.test(transferTarget) || !activeSession) return;
    try {
      await sip.current?.transfer(transferTarget);
      await api.callEvent("transferred", destination, media, activeSession.id, transferTarget);
      setMessage(`Transferencia enviada a ${transferTarget}`);
      setTransferOpen(false);
      setTransferTarget("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo transferir"); }
  }

  async function sendDtmf(tone: string) {
    try {
      await sip.current?.sendDtmf(tone);
      setMessage(`DTMF ${tone} enviado`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo enviar DTMF"); }
  }

  async function joinConference() {
    try {
      if (activeSession) {
        await sip.current?.transfer("700");
        await api.callEvent("conference", destination, media, activeSession.id, "700");
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        await sip.current?.hangup();
      }
      await startCall(false, "700");
      setMessage("Conectando a conferencia 700");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo abrir la conferencia"); }
  }

  async function toggleDnd() {
    const next = !doNotDisturb;
    sip.current?.setDoNotDisturb(next);
    try {
      await api.presence(next);
      setDoNotDisturb(next);
      setMessage(next ? "No Molestar activado" : "Disponible para llamadas");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo cambiar presencia"); }
  }

  async function playRecording(call: CallRecord) {
    try {
      const blob = await api.recording(call.uniqueid);
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
      const url = URL.createObjectURL(blob);
      recordingUrlRef.current = url;
      setRecordingUrl(url);
      setRecordingTitle(`${call.src ?? "-"} a ${call.dst ?? "-"}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Grabacion no disponible"); }
  }

  async function openView(next: View) {
    if ((next === "monitoring" || next === "evaluations" || next === "reports" || next === "quality") && !canSupervise) return;
    if ((next === "users" || next === "audit") && !canAdminister) return;
    setView(next);
    try {
      if (next === "history") await refreshCalls(0);
      if (next === "audit") setAudits(await api.audit());
      if (next === "quality") setQuality(await api.quality());
      if (next === "monitoring") setActiveCalls(await api.activeCalls());
      if (next === "evaluations") setEvaluations(await api.evaluations());
      if (next === "reports") setReport(await api.reportSummary());
      if (next === "users") setUsers(await api.users());
    } catch (error) { setMessage(error instanceof Error ? error.message : "Vista no disponible"); }
  }

  async function submitEvaluation(callId: number, score: number, notes: string) {
    const created = await api.createEvaluation(callId, score, notes);
    setEvaluations((values) => [created, ...values]);
    setMessage("Evaluacion QA registrada");
  }

  async function updateUserStatus(username: string, active: boolean) {
    const updated = await api.updateUserStatus(username, active);
    setUsers((values) => values.map((value) => value.username === username ? updated : value));
    setMessage(`Usuario ${username} ${active ? "activado" : "desactivado"}`);
  }

  const nav = [
    ["home", "Inicio", Home], ["calls", "Llamadas", Phone], ["history", "Historial", History],
    ["quality", "Calidad", BarChart3], ["audit", "Auditoria", ClipboardCheck],
  ] as const;
  const governanceNav = [
    ["monitoring", "Monitoreo en vivo", MonitorUp, canSupervise],
    ["evaluations", "Evaluaciones", Star, canSupervise],
    ["reports", "Reportes", BarChart3, canSupervise],
    ["users", "Gestion de usuarios", Users, canAdminister],
  ] as const;
  const qualityGlobal = typeof quality.average_mos === "number" ? quality.average_mos >= 3.6 : services.network === "ok";

  return (
    <div className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      <header className="topbar">
        <button className="topbar-menu" onClick={() => setSidebarOpen((value) => !value)} aria-label="Alternar menu"><Menu /></button>
        <div className="product"><AudioLines /><strong>Unified Telecom QA</strong></div>
        <div className="role-label">{user.role === "AgenteCallCenter" ? "Agente Call Center" : user.role}</div>
        <ServiceStrip values={services} />
        <div className="global-quality"><span>Calidad Global</span><strong className={qualityGlobal ? "good" : "warn"}>{qualityGlobal ? "OPTIMA" : "REVISAR"}</strong></div>
        <div className="identity"><UserRound /><div><strong>{user.display_name}</strong><small>{user.role}</small><span><i /> En linea</span></div><button onClick={onLogout} aria-label="Cerrar sesion"><LogOut size={18} /></button></div>
      </header>

      <aside className="sidebar">
        <nav className="primary-nav">{nav.map(([id, label, Icon]) => {
          const locked = (id === "quality" && !canSupervise) || (id === "audit" && !canAdminister);
          return <button key={id} className={view === id ? "active" : ""} disabled={locked} onClick={() => void openView(id)}><Icon /> <span>{label}</span>{locked ? <LockKeyhole className="nav-lock" /> : null}</button>;
        })}</nav>
        <div className="governance-nav"><small>Vistas supervisor / QA</small>{governanceNav.map(([id, label, Icon, allowed]) => <button key={id} className={view === id ? "active" : ""} disabled={!allowed} onClick={() => void openView(id)}><Icon /><span>{label}</span>{!allowed ? <LockKeyhole className="nav-lock" /> : null}</button>)}</div>
        <button className="help-link" onClick={() => setMessage("Consulta docs/demo-guide.md para la demostracion guiada")}><CircleHelp /><span>Ayuda</span></button>
      </aside>

      <main className="workspace">
        {(view === "home" || view === "calls") ? <>
          <div className="operation-grid">
            <div className="operation-main">
              <section className="station-bar">
                <div><small>Estacion</small><strong>{user.extension ? `AGT${user.extension}` : "Sin extension"}</strong></div>
                <span className={`availability ${registration === "registered" && !doNotDisturb ? "available" : "unavailable"}`}><i />{doNotDisturb ? "No molestar" : registration === "registered" ? "Disponible" : registration}</span>
                {user.extension && registration !== "registered" ? <button className="connect-sip" onClick={() => void connectSip()} disabled={registration === "connecting"}>{registration === "connecting" ? "Conectando..." : "Conectar SIP"}</button> : null}
                <button className={`dnd ${doNotDisturb ? "active" : ""}`} onClick={() => void toggleDnd()}><Ban />{doNotDisturb ? "Activar llamadas" : "No Molestar"}</button>
              </section>
              <section className="call-console">
                <div className="dialer">
                  <h2>Marcar / Destino</h2>
                  <label className="destination-field"><span className="sr-only">Extension o destino</span><input aria-label="Extension" placeholder="Extension o numero de destino" value={destination} onChange={(event) => setDestination(event.target.value)} /><KeyRound /></label>
                  <label className="line-select">Linea de salida<select aria-label="Linea de salida"><option>Linea 1 (SIP)</option><option>Conferencia 700</option><option>IVR 701</option></select></label>
                  <div className="call-actions"><button className="primary-call" onClick={() => void startCall(false)} disabled={registration !== "registered" || !!activeSession}><Phone />Llamada de Voz</button><button onClick={() => void startCall(true)} disabled={registration !== "registered" || !!activeSession}><Video />Llamada de Video</button></div>
                  <p className="call-message">{message}</p>
                </div>
                <div className="call-state"><h3>Estado de Llamada</h3><strong>{held ? "ON HOLD" : callState}</strong><span>{activeSession ? `Con ${destination}` : "Sin llamada activa"}</span><hr /><small>Ultimo estado:</small><b>{registration === "registered" ? "Disponible" : registration}</b></div>
                <VideoPanel title="Mi video (Local)" videoRef={localVideo} local active={cameraEnabled} />
                <VideoPanel title="Video remoto" videoRef={remoteVideo} active={!!activeSession} />
                <div className="call-controls">
                  <ControlButton label="Microfono" active={microphoneEnabled} disabled={!activeSession} icon={Mic} onClick={() => toggleMedia("audio")} />
                  <ControlButton label="Camara" active={cameraEnabled} disabled={!activeSession} icon={Camera} onClick={() => toggleMedia("video")} />
                  <ControlButton label="Altavoz" active={speakerEnabled} disabled={!activeSession} icon={Speaker} onClick={toggleSpeaker} />
                  <ControlButton label={held ? "Reanudar" : "Retener"} active={held} disabled={!activeSession} icon={Pause} onClick={() => void toggleHold()} />
                  <ControlButton label="Transferir" disabled={!activeSession} icon={PhoneForwarded} onClick={() => setTransferOpen(true)} />
                  <ControlButton label="Teclado" active={dialpadOpen} disabled={!activeSession} icon={KeyRound} onClick={() => setDialpadOpen((value) => !value)} />
                  <ControlButton label="Conferencia" disabled={registration !== "registered"} icon={Users} onClick={() => void joinConference()} />
                  <button className="hangup" disabled={!activeSession} onClick={() => void hangup()}><PhoneOff />Finalizar</button>
                  {dialpadOpen ? <Dialpad onTone={(tone) => void sendDtmf(tone)} /> : null}
                </div>
              </section>
            </div>
            <ActivityRail calls={calls} onRefresh={() => void refreshCalls(0)} />
          </div>
          <CallsTable page={callsPage} filters={filters} setFilters={setFilters} onSearch={() => void refreshCalls(0)} onPage={(offset) => void refreshCalls(offset)} onRecording={(call) => void playRecording(call)} />
        </> : null}
        {view === "history" ? <CallsTable page={callsPage} filters={filters} setFilters={setFilters} onSearch={() => void refreshCalls(0)} onPage={(offset) => void refreshCalls(offset)} onRecording={(call) => void playRecording(call)} /> : null}
        {view === "quality" ? <QualityPanel values={quality} /> : null}
        {view === "audit" ? <AuditTable values={audits} /> : null}
        {view === "monitoring" ? <MonitoringPanel values={activeCalls} onRefresh={async () => setActiveCalls(await api.activeCalls())} /> : null}
        {view === "evaluations" ? <EvaluationsPanel values={evaluations} calls={calls} onSubmit={submitEvaluation} /> : null}
        {view === "reports" ? <ReportsPanel value={report} /> : null}
        {view === "users" ? <UsersPanel values={users} onToggle={updateUserStatus} /> : null}
      </main>

      {incoming ? <IncomingModal call={incoming} onAccept={() => void acceptIncoming()} onReject={() => void rejectIncoming()} /> : null}
      {transferOpen ? <Modal title="Transferir llamada" onClose={() => setTransferOpen(false)}><form className="modal-form" onSubmit={transferCall}><label>Extension destino<input autoFocus value={transferTarget} onChange={(event) => setTransferTarget(event.target.value)} placeholder="Ej. 2002" /></label><button type="submit" disabled={!/^\d{3,16}$/.test(transferTarget)}>Transferir</button></form></Modal> : null}
      {recordingUrl ? <Modal title={`Grabacion ${recordingTitle}`} onClose={() => { URL.revokeObjectURL(recordingUrl); recordingUrlRef.current = null; setRecordingUrl(null); }}><audio controls autoPlay src={recordingUrl} className="recording-player" /></Modal> : null}
    </div>
  );
}

function ServiceStrip({ values }: { values: ServiceStatus }) {
  const items = [["PBX", values.pbx], ["Grabacion", values.recording], ["IVR", values.ivr], ["Red", values.network]] as const;
  return <div className="service-strip"><small>Estado de Servicios</small>{items.map(([label, state]) => <span key={label} className={state === "ok" ? "ok" : "fail"}><i />{label}<b>{state === "ok" ? "OK" : "FALLO"}</b></span>)}</div>;
}

function VideoPanel({ title, videoRef, local = false, active }: { title: string; videoRef: React.RefObject<HTMLVideoElement>; local?: boolean; active: boolean }) {
  return <div className={`video-panel ${local ? "local" : ""} ${active ? "active" : ""}`}><h3>{title}</h3><div><video ref={videoRef} autoPlay muted={local} playsInline />{!active ? <span>{local ? <UserRound /> : <Video />}<small>{local ? "Camara inactiva" : "Sin video remoto"}</small></span> : null}</div><footer>{local ? <><Camera /> Camara <b>{active ? "On" : "Off"}</b></> : <>{active ? "Flujo negociado" : "Esperando llamada"}</>}</footer></div>;
}

function ControlButton({ label, active = false, disabled = false, icon: Icon, onClick }: { label: string; active?: boolean; disabled?: boolean; icon: typeof Mic; onClick: () => void }) {
  return <button className={`control ${active ? "on" : "off"}`} disabled={disabled} onClick={onClick}><Icon /><span>{label}<small>{active ? "On" : "Off"}</small></span></button>;
}

function Dialpad({ onTone }: { onTone: (tone: string) => void }) {
  return <div className="dialpad" aria-label="Teclado DTMF">{["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((tone) => <button key={tone} onClick={() => onTone(tone)}>{tone}</button>)}</div>;
}

function ActivityRail({ calls, onRefresh }: { calls: CallRecord[]; onRefresh: () => void }) {
  return <aside className="activity-rail"><header><h2>Actividad Reciente</h2><button onClick={onRefresh}>Ver todo</button></header>{calls.length ? calls.slice(0, 5).map((call) => <div className="activity-item" key={call.id}><span className={`activity-icon ${call.direction}`}>{call.direction === "incoming" ? <PhoneIncoming /> : <PhoneOutgoing />}</span><div><strong>Llamada {callType(call)}</strong><small>{call.direction === "incoming" ? call.src : call.dst}</small><small>{duration(call.billsec)}</small></div><time>{new Date(call.calldate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>) : <p className="activity-empty">No hay actividad reciente.</p>}<button className="activity-refresh" onClick={onRefresh}><RefreshCw />Actualizar</button></aside>;
}

function CallsTable({ page, filters, setFilters, onSearch, onPage, onRecording }: {
  page: CallPage; filters: { search: string; disposition: string; date: string };
  setFilters: React.Dispatch<React.SetStateAction<{ search: string; disposition: string; date: string }>>;
  onSearch: () => void; onPage: (offset: number) => void; onRecording: (call: CallRecord) => void;
}) {
  const first = page.total ? page.offset + 1 : 0;
  const last = Math.min(page.offset + page.limit, page.total);
  return <section className="table-panel calls-table"><div className="section-heading"><h2>Llamadas recientes</h2><div className="table-filters"><label><span className="sr-only">Buscar llamadas</span><input placeholder="Buscar..." value={filters.search} onChange={(event) => setFilters((value) => ({ ...value, search: event.target.value }))} /><Search /></label><select aria-label="Filtrar estado" value={filters.disposition} onChange={(event) => setFilters((value) => ({ ...value, disposition: event.target.value }))}><option value="">Todos</option><option>ANSWERED</option><option>NO ANSWER</option><option>FAILED</option><option>BUSY</option></select><label className="date-filter"><CalendarDays /><input aria-label="Filtrar fecha" type="date" value={filters.date} onChange={(event) => setFilters((value) => ({ ...value, date: event.target.value }))} /></label><button onClick={onSearch}><ListFilter />Filtrar</button></div></div><div className="table-scroll"><table><thead><tr><th>Fecha y Hora</th><th>Destino</th><th>Tipo</th><th>Duracion</th><th>Estado</th><th>Calidad</th><th>Grabacion</th></tr></thead><tbody>{page.items.length ? page.items.map((call) => <tr key={call.id}><td>{new Date(call.calldate).toLocaleString()}</td><td>{call.direction === "incoming" ? call.src : call.dst}</td><td><span className={`call-direction ${call.direction}`}>{call.direction === "incoming" ? <PhoneIncoming /> : <PhoneOutgoing />}{callType(call)}{call.media === "video" ? " / Video" : ""}</span></td><td>{duration(call.billsec)}</td><td><span className={`disposition ${call.disposition === "ANSWERED" ? "ok" : "warn"}`}>{call.disposition === "ANSWERED" ? <CheckCircle2 /> : <Activity />}{call.disposition ?? "UNKNOWN"}</span></td><td><span className={`mos ${call.mos && call.mos >= 3.6 ? "ok" : "warn"}`}><i />{call.mos ? `MOS ${call.mos.toFixed(1)}` : "Sin metrica"}</span></td><td>{call.recording_available ? <button className="play-recording" onClick={() => onRecording(call)}><PlayCircle />Escuchar</button> : <span className="not-available">No disponible</span>}</td></tr>) : <tr><td colSpan={7} className="empty">No hay CDR para los filtros seleccionados.</td></tr>}</tbody></table></div><footer><span>Mostrando {first} a {last} de {page.total} llamadas</span><div><button disabled={page.offset === 0} onClick={() => onPage(Math.max(0, page.offset - page.limit))}><ChevronLeft /></button><strong>{Math.floor(page.offset / page.limit) + 1}</strong><button disabled={page.offset + page.limit >= page.total} onClick={() => onPage(page.offset + page.limit)}><ChevronRight /></button></div></footer></section>;
}

function QualityPanel({ values }: { values: Record<string, number | string | null> }) {
  return <section className="governance-panel"><PanelHeader title="Metricas de calidad" subtitle="Indicadores ISO/IEC 25010 y calidad de llamadas" icon={BarChart3} /><div className="metric-grid">{Object.entries(values).map(([key, value]) => <article key={key}><small>{key.replaceAll("_", " ")}</small><strong>{value ?? "Sin datos"}</strong></article>)}</div></section>;
}

function AuditTable({ values }: { values: AuditRecord[] }) {
  return <section className="table-panel full"><PanelHeader title="Auditoria" subtitle="Trazabilidad de accesos y operaciones" icon={ShieldCheck} /><div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Actor</th><th>Accion</th><th>Resultado</th><th>Correlacion</th></tr></thead><tbody>{values.map((item) => <tr key={item.id}><td>{new Date(item.occurred_at).toLocaleString()}</td><td>{item.actor}</td><td>{item.action}</td><td>{item.outcome}</td><td className="mono">{item.correlation_id}</td></tr>)}</tbody></table></div></section>;
}

function MonitoringPanel({ values, onRefresh }: { values: ActiveCall[]; onRefresh: () => Promise<void> }) {
  return <section className="table-panel full"><PanelHeader title="Monitoreo en vivo" subtitle="Sesiones WebRTC activas reportadas por los agentes" icon={MonitorUp} action={<button onClick={() => void onRefresh()}><RefreshCw />Actualizar</button>} /><div className="table-scroll"><table><thead><tr><th>Agente</th><th>Origen</th><th>Destino</th><th>Medio</th><th>Estado</th><th>Inicio</th><th>MOS</th></tr></thead><tbody>{values.length ? values.map((item) => <tr key={item.session_id}><td>{item.actor}</td><td>{item.source_extension}</td><td>{item.destination}</td><td>{item.media}</td><td>{item.held ? "RETENIDA" : item.state}</td><td>{new Date(item.started_at).toLocaleString()}</td><td>{item.mos?.toFixed(2) ?? "Pendiente"}</td></tr>) : <tr><td colSpan={7} className="empty">No hay llamadas activas.</td></tr>}</tbody></table></div></section>;
}

function EvaluationsPanel({ values, calls, onSubmit }: { values: Evaluation[]; calls: CallRecord[]; onSubmit: (callId: number, score: number, notes: string) => Promise<void> }) {
  const [callId, setCallId] = useState(calls[0]?.id ?? 0);
  const [score, setScore] = useState(80);
  const [notes, setNotes] = useState("");
  return <section className="governance-panel"><PanelHeader title="Evaluaciones QA" subtitle="Calificacion documentada de llamadas" icon={Star} /><form className="evaluation-form" onSubmit={(event) => { event.preventDefault(); void onSubmit(callId, score, notes); setNotes(""); }}><label>Llamada<select value={callId} onChange={(event) => setCallId(Number(event.target.value))}>{calls.map((call) => <option key={call.id} value={call.id}>#{call.id} {call.src} a {call.dst}</option>)}</select></label><label>Puntaje<input type="number" min="1" max="100" value={score} onChange={(event) => setScore(Number(event.target.value))} /></label><label className="evaluation-notes">Observaciones<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label><button disabled={!callId}>Registrar evaluacion</button></form><div className="evaluation-list">{values.map((value) => <article key={value.id}><strong>{value.score}/100</strong><div><b>Llamada #{value.call_id}</b><p>{value.notes || "Sin observaciones"}</p><small>{value.evaluator} · {new Date(value.created_at).toLocaleString()}</small></div></article>)}</div></section>;
}

function ReportsPanel({ value }: { value: ReportSummary | null }) {
  if (!value) return <section className="governance-panel"><p className="empty">Reporte no disponible.</p></section>;
  const metrics = [["Llamadas totales", value.total_calls], ["Contestadas", value.answered_calls], ["Fallidas", value.failed_calls], ["Tasa de respuesta", `${value.answer_rate}%`], ["Duracion media", duration(Math.round(value.average_duration_seconds))], ["MOS promedio", value.average_mos?.toFixed(2) ?? "Sin datos"]] as const;
  return <section className="governance-panel"><PanelHeader title="Reportes operativos" subtitle="Resumen de desempeño y calidad" icon={BarChart3} action={<button onClick={() => window.print()}><Download />Exportar PDF</button>} /><div className="metric-grid report-grid">{metrics.map(([label, metric]) => <article key={label}><small>{label}</small><strong>{metric}</strong></article>)}</div></section>;
}

function UsersPanel({ values, onToggle }: { values: AdminUser[]; onToggle: (username: string, active: boolean) => Promise<void> }) {
  return <section className="table-panel full"><PanelHeader title="Gestion de usuarios" subtitle="Identidades sincronizadas con midPoint" icon={Users} /><div className="table-scroll"><table><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Extension</th><th>midPoint OID</th><th>Estado</th></tr></thead><tbody>{values.map((value) => <tr key={value.username}><td>{value.username}</td><td>{value.display_name}</td><td>{value.role}</td><td>{value.extension ?? "-"}</td><td className="mono">{value.midpoint_oid ?? "Local"}</td><td><button className={`status-toggle ${value.active ? "active" : ""}`} onClick={() => void onToggle(value.username, !value.active)}>{value.active ? "Activo" : "Inactivo"}</button></td></tr>)}</tbody></table></div></section>;
}

function PanelHeader({ title, subtitle, icon: Icon, action }: { title: string; subtitle: string; icon: typeof BarChart3; action?: React.ReactNode }) {
  return <div className="panel-header"><div><Icon /><span><h2>{title}</h2><p>{subtitle}</p></span></div>{action}</div>;
}

function IncomingModal({ call, onAccept, onReject }: { call: IncomingCall; onAccept: () => void; onReject: () => void }) {
  return <div className="modal-backdrop"><section className="incoming-modal" role="dialog" aria-modal="true"><PhoneIncoming /><small>Llamada {call.withVideo ? "de video" : "de voz"}</small><h2>{call.displayName}</h2><strong>{call.from}</strong><div><button className="reject" onClick={onReject}><PhoneOff />Rechazar</button><button className="accept" onClick={onAccept}><PhoneCall />Contestar</button></div></section></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true"><header><h2>{title}</h2><button onClick={onClose} aria-label="Cerrar"><X /></button></header>{children}</section></div>;
}

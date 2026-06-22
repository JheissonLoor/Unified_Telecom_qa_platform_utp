import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";

const mocks = vi.hoisted(() => {
  type SessionValue = { id: string; state: string };
  type Callbacks = {
    onRegistration: (state: "offline" | "connecting" | "registered" | "error") => void;
    onSession: (session: SessionValue | null) => void;
    onIncoming: (call: unknown) => void;
    onError: (message: string) => void;
  };
  const state: { callbacks?: Callbacks } = {};
  return {
    state,
    callPage: vi.fn(), services: vi.fn(), sipConfig: vi.fn(), audit: vi.fn(), quality: vi.fn(),
    activeCalls: vi.fn(), evaluations: vi.fn(), reportSummary: vi.fn(), reportPdf: vi.fn(), users: vi.fn(),
    currentPresence: vi.fn(), qualitySummary: vi.fn(),
    createEvaluation: vi.fn(), updateUserStatus: vi.fn(), presence: vi.fn(), callEvent: vi.fn(),
    callQuality: vi.fn(), recording: vi.fn(), connect: vi.fn(), call: vi.fn(), acceptIncoming: vi.fn(),
    rejectIncoming: vi.fn(), hangup: vi.fn(), attachMedia: vi.fn(), setMediaEnabled: vi.fn(),
    setRemoteAudioEnabled: vi.fn(), setDoNotDisturb: vi.fn(), setHold: vi.fn(), transfer: vi.fn(),
    sendDtmf: vi.fn(), qualitySnapshot: vi.fn(), disconnect: vi.fn(),
  };
});

vi.mock("../api", () => ({
  session: { token: "dashboard-test-token" },
  api: {
    callPage: mocks.callPage, services: mocks.services, sipConfig: mocks.sipConfig,
    audit: mocks.audit, quality: mocks.quality, activeCalls: mocks.activeCalls,
    evaluations: mocks.evaluations, reportSummary: mocks.reportSummary, reportPdf: mocks.reportPdf, users: mocks.users,
    currentPresence: mocks.currentPresence, qualitySummary: mocks.qualitySummary,
    createEvaluation: mocks.createEvaluation, updateUserStatus: mocks.updateUserStatus,
    presence: mocks.presence, callEvent: mocks.callEvent, callQuality: mocks.callQuality,
    recording: mocks.recording,
  },
}));

vi.mock("../realtime", () => ({
  RealtimeClient: class {
    constructor(_token: string, _onEvent: unknown, onStatus: (connected: boolean) => void) {
      onStatus(true);
    }
    connect() {}
    disconnect() {}
  },
}));

vi.mock("../sip", () => ({
  SipClient: class {
    constructor(callbacks: typeof mocks.state.callbacks) { mocks.state.callbacks = callbacks; }
    connect = mocks.connect;
    call = mocks.call;
    acceptIncoming = mocks.acceptIncoming;
    rejectIncoming = mocks.rejectIncoming;
    hangup = mocks.hangup;
    attachMedia = mocks.attachMedia;
    setMediaEnabled = mocks.setMediaEnabled;
    setRemoteAudioEnabled = mocks.setRemoteAudioEnabled;
    setDoNotDisturb = mocks.setDoNotDisturb;
    setHold = mocks.setHold;
    transfer = mocks.transfer;
    sendDtmf = mocks.sendDtmf;
    qualitySnapshot = mocks.qualitySnapshot;
    disconnect = mocks.disconnect;
  },
}));

const agent = {
  username: "agente1", display_name: "Agente Uno", role: "AgenteCallCenter" as const,
  active: true, extension: "2001",
};

const callRecord = {
  id: 1, calldate: "2026-06-19T23:12:12Z", src: "2001", dst: "2002",
  duration: 65, billsec: 60, disposition: "ANSWERED", uniqueid: "cdr-1",
  direction: "outgoing" as const, media: "audio" as const, mos: 4.2, recording_available: false,
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callPage.mockResolvedValue({ items: [callRecord], total: 1, limit: 5, offset: 0 });
    mocks.services.mockResolvedValue({ api: "ok", database: "ok", pbx: "ok", recording: "ok", ivr: "ok", network: "ok" });
    mocks.sipConfig.mockResolvedValue({ extension: "2001" });
    mocks.audit.mockResolvedValue([]);
    mocks.quality.mockResolvedValue({ quality_gate: "OPTIMAL", average_mos: 4.1 });
    mocks.qualitySummary.mockResolvedValue({ quality_gate: "OPTIMAL", average_mos: 4.1, measured_calls: 3 });
    mocks.currentPresence.mockResolvedValue({ do_not_disturb: false, updated_at: null });
    mocks.activeCalls.mockResolvedValue([]);
    mocks.evaluations.mockResolvedValue([]);
    mocks.reportSummary.mockResolvedValue({ total_calls: 1, answered_calls: 1, failed_calls: 0, answer_rate: 100, average_duration_seconds: 60, average_mos: 4.2 });
    mocks.reportPdf.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
    mocks.users.mockResolvedValue([{ ...agent, midpoint_oid: null }]);
    mocks.presence.mockImplementation(async (doNotDisturb: boolean) => ({ do_not_disturb: doNotDisturb, updated_at: null }));
    mocks.callEvent.mockResolvedValue({ accepted: true });
    mocks.callQuality.mockResolvedValue({ accepted: true, mos: 4.2 });
    mocks.connect.mockImplementation(async () => mocks.state.callbacks?.onRegistration("registered"));
    mocks.call.mockImplementation(async () => {
      const session = { id: "session-1", state: "Established" };
      mocks.state.callbacks?.onSession(session);
      return session;
    });
    mocks.hangup.mockImplementation(async () => mocks.state.callbacks?.onSession(null));
    mocks.attachMedia.mockReturnValue({ audio: true, video: true });
    mocks.setMediaEnabled.mockReturnValue(true);
    mocks.setRemoteAudioEnabled.mockReturnValue(true);
    mocks.setHold.mockResolvedValue(undefined);
    mocks.sendDtmf.mockResolvedValue(undefined);
    mocks.qualitySnapshot.mockResolvedValue({ packets_received: 100, packets_lost: 0, jitter_ms: 2, rtt_ms: 20, bitrate_kbps: 80 });
    mocks.disconnect.mockResolvedValue(undefined);
    mocks.acceptIncoming.mockResolvedValue({ id: "incoming-1", state: "Established" });
    mocks.rejectIncoming.mockResolvedValue(undefined);
    mocks.transfer.mockResolvedValue(undefined);
    mocks.recording.mockResolvedValue(new Blob(["wav"], { type: "audio/wav" }));
    mocks.createEvaluation.mockResolvedValue({ id: 2, call_id: 1, evaluator: "adminqa", score: 90, notes: "Correcta", created_at: "2026-06-20T12:00:00Z" });
    mocks.updateUserStatus.mockResolvedValue({ ...agent, active: false, midpoint_oid: null });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:recording");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  it("registra SIP y opera voz, retencion, DTMF y video", async () => {
    const onLogout = vi.fn();
    const { unmount } = render(<Dashboard user={agent} onLogout={onLogout} />);
    expect(await screen.findByText("Llamadas recientes")).toBeVisible();
    expect(screen.getByRole("button", { name: "Calidad" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Conectar SIP" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Conectar SIP" })).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Extension"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Llamada de Voz" }));
    expect(await screen.findByText("Ingresa una extension valida")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Extension"), { target: { value: "2002" } });
    fireEvent.click(screen.getByRole("button", { name: "Llamada de Voz" }));
    expect(await screen.findByText("Established", { exact: true })).toBeVisible();
    expect(mocks.call).toHaveBeenCalledWith("2002", false);

    fireEvent.click(screen.getByRole("button", { name: /Retener/ }));
    expect(mocks.setHold).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: /Teclado/ }));
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(mocks.sendDtmf).toHaveBeenCalledWith("5");

    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    expect(await screen.findByText("Llamada finalizada")).toBeVisible();
    expect(mocks.callQuality).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Llamada de Video" }));
    await waitFor(() => expect(mocks.call).toHaveBeenLastCalledWith("2002", true));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesion" }));
    expect(onLogout).toHaveBeenCalled();
    unmount();
    expect(mocks.disconnect).toHaveBeenCalled();
  });

  it("carga vistas de gobierno para AdministradorQA", async () => {
    render(<Dashboard user={{ ...agent, username: "adminqa", display_name: "QA", role: "AdministradorQA", extension: null }} onLogout={vi.fn()} />);
    await screen.findByText("Llamadas recientes");

    fireEvent.click(screen.getByRole("button", { name: "Calidad" }));
    expect(await screen.findByText("OPTIMAL")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Auditoria" }));
    expect(await screen.findByText("Trazabilidad de accesos y operaciones")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Monitoreo en vivo" }));
    expect(await screen.findByText("No hay llamadas activas.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Reportes" }));
    expect(await screen.findByText("100%")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF" }));
    await waitFor(() => expect(mocks.reportPdf).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Gestion de usuarios" }));
    expect(await screen.findByText("Identidades sincronizadas con midPoint")).toBeVisible();
  });

  it("muestra errores de registro y llamada", async () => {
    mocks.sipConfig.mockRejectedValueOnce(new Error("SIP no disponible"));
    render(<Dashboard user={agent} onLogout={vi.fn()} />);
    await screen.findByText("Llamadas recientes");
    fireEvent.click(screen.getByRole("button", { name: "Conectar SIP" }));
    expect(await screen.findByText("SIP no disponible")).toBeVisible();

    mocks.state.callbacks?.onRegistration("registered");
    mocks.call.mockRejectedValueOnce(new Error("Destino ocupado"));
    fireEvent.change(screen.getByLabelText("Extension"), { target: { value: "2002" } });
    fireEvent.click(screen.getByRole("button", { name: "Llamada de Voz" }));
    expect(await screen.findByText("Destino ocupado")).toBeVisible();
  });

  it("contesta y rechaza llamadas entrantes manualmente", async () => {
    render(<Dashboard user={agent} onLogout={vi.fn()} />);
    await screen.findByText("Llamadas recientes");

    mocks.state.callbacks?.onIncoming({ from: "1002", displayName: "Telefono 1002", withVideo: true });
    expect(await screen.findByText("Telefono 1002")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Contestar/ }));
    await waitFor(() => expect(mocks.acceptIncoming).toHaveBeenCalled());
    expect(mocks.callEvent).toHaveBeenCalledWith("answered", "1002", "video", "incoming-1");

    mocks.state.callbacks?.onIncoming({ from: "1003", displayName: "Telefono 1003", withVideo: false });
    fireEvent.click(await screen.findByRole("button", { name: /Rechazar/ }));
    expect(mocks.rejectIncoming).toHaveBeenCalled();
    expect(await screen.findByText("Llamada rechazada")).toBeVisible();
  });

  it("opera presencia, medios, transferencia y conferencia", async () => {
    render(<Dashboard user={agent} onLogout={vi.fn()} />);
    await screen.findByText("Llamadas recientes");
    fireEvent.click(screen.getByRole("button", { name: "Alternar menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Ayuda" }));
    expect(screen.getByText("Centro de ayuda")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Inicio" }));

    fireEvent.click(screen.getByRole("button", { name: /No Molestar/ }));
    await waitFor(() => expect(mocks.presence).toHaveBeenCalledWith(true));
    expect(screen.getByText("No molestar")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Activar llamadas/ }));
    await waitFor(() => expect(mocks.presence).toHaveBeenCalledWith(false));

    mocks.state.callbacks?.onRegistration("registered");
    fireEvent.change(screen.getByLabelText("Extension"), { target: { value: "2002" } });
    fireEvent.click(screen.getByRole("button", { name: "Llamada de Voz" }));
    await screen.findByText("Established", { exact: true });
    await new Promise((resolve) => setTimeout(resolve, 500));

    fireEvent.click(screen.getByRole("button", { name: /Microfono/ }));
    fireEvent.click(screen.getByRole("button", { name: /Camara/ }));
    fireEvent.click(screen.getByRole("button", { name: /Altavoz/ }));
    expect(mocks.setMediaEnabled).toHaveBeenCalledTimes(2);
    expect(mocks.setRemoteAudioEnabled).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Transferir/ }));
    fireEvent.change(screen.getByPlaceholderText("Ej. 2002"), { target: { value: "2003" } });
    fireEvent.click(screen.getByRole("button", { name: /^Transferir$/ }));
    await waitFor(() => expect(mocks.transfer).toHaveBeenCalledWith("2003"));
    expect(mocks.callEvent).toHaveBeenCalledWith("transferred", "2002", "audio", "session-1", "2003");

    fireEvent.click(screen.getByRole("button", { name: /Conferencia/ }));
    await waitFor(() => expect(mocks.transfer).toHaveBeenCalledWith("700"));
    await waitFor(() => expect(mocks.call).toHaveBeenLastCalledWith("700", false), { timeout: 1500 });
  });

  it("opera lineas especiales y conserva la presencia cargada", async () => {
    mocks.currentPresence.mockResolvedValueOnce({ do_not_disturb: true, updated_at: "2026-06-21T10:00:00Z" });
    render(<Dashboard user={agent} onLogout={vi.fn()} />);
    expect(await screen.findByDisplayValue("No molestar")).toBeVisible();
    expect(mocks.setDoNotDisturb).toHaveBeenCalledWith(true);
    mocks.state.callbacks?.onRegistration("registered");

    fireEvent.change(screen.getByLabelText("Linea de salida"), { target: { value: "ivr" } });
    fireEvent.click(screen.getByRole("button", { name: "Llamada de Voz" }));
    await waitFor(() => expect(mocks.call).toHaveBeenCalledWith("701", false));
    mocks.state.callbacks?.onSession(null);

    fireEvent.change(screen.getByLabelText("Linea de salida"), { target: { value: "conference-video" } });
    fireEvent.click(screen.getByRole("button", { name: "Llamada de Video" }));
    await waitFor(() => expect(mocks.call).toHaveBeenCalledWith("702", true));
  });

  it("filtra, pagina y reproduce una grabacion", async () => {
    mocks.callPage.mockResolvedValue({ items: [
      { ...callRecord, recording_available: true },
      { ...callRecord, id: 2, direction: "incoming", media: "video", disposition: "FAILED", mos: null, recording_available: false },
      { ...callRecord, id: 3, direction: "internal", disposition: "BUSY", mos: 2.8, recording_available: false },
    ], total: 8, limit: 5, offset: 0 });
    const { unmount } = render(<Dashboard user={agent} onLogout={vi.fn()} />);
    await screen.findByText("Llamadas recientes");
    fireEvent.change(screen.getByPlaceholderText("Buscar..."), { target: { value: "2002" } });
    fireEvent.change(screen.getByLabelText("Filtrar estado"), { target: { value: "ANSWERED" } });
    fireEvent.change(screen.getByLabelText("Filtrar fecha"), { target: { value: "2026-06-20" } });
    fireEvent.click(screen.getByRole("button", { name: /Filtrar/ }));
    await waitFor(() => expect(mocks.callPage).toHaveBeenCalledWith(expect.objectContaining({ search: "2002", disposition: "ANSWERED", date: "2026-06-20" })));

    const nextButton = screen.getAllByRole("button").find((button) => button.querySelector(".lucide-chevron-right"));
    expect(nextButton).toBeTruthy();
    fireEvent.click(nextButton!);
    await waitFor(() => expect(mocks.callPage).toHaveBeenCalledWith(expect.objectContaining({ offset: 5 })));

    fireEvent.click(screen.getByRole("button", { name: /Escuchar/ }));
    expect(await screen.findByText("Grabacion 2001 a 2002")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:recording");
    unmount();
  });

  it("traduce estados, alerta MOS bajo y abre el detalle del CDR", async () => {
    mocks.callPage.mockResolvedValue({ items: [{ ...callRecord, disposition: "FAILED", mos: 2.9 }], total: 1, limit: 5, offset: 0 });
    render(<Dashboard user={agent} onLogout={vi.fn()} />);
    expect(await screen.findByText("Fallida")).toBeVisible();
    expect(screen.getByText("Calidad de llamada")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Acciones de llamada 1" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Ver detalle" }));
    expect(await screen.findByText("Detalle de llamada #1")).toBeVisible();
    expect(screen.getByText("MOS 2.90")).toBeVisible();
  });

  it("muestra estados degradados y tablas vacias sin romper la consola", async () => {
    mocks.callPage.mockResolvedValue({ items: [], total: 0, limit: 5, offset: 0 });
    mocks.services.mockResolvedValue({ api: "ok", database: "error", pbx: "error", recording: "error", ivr: "error", network: "degraded" });
    const supervisor = { ...agent, username: "supervisor1", role: "Supervisor" as const };
    render(<Dashboard user={supervisor} onLogout={vi.fn()} />);
    expect(await screen.findByText("No hay actividad reciente.")).toBeVisible();
    expect(screen.getByText("No hay CDR para los filtros seleccionados.")).toBeVisible();
    expect(screen.getByText("OPTIMA")).toBeVisible();
    expect(screen.getAllByText("FALLO")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Auditoria" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reportes" }));
    expect(await screen.findByText("100%")).toBeVisible();
  });

  it("registra evaluaciones, refresca monitoreo y administra usuarios", async () => {
    const admin = { ...agent, username: "adminqa", display_name: "QA", role: "AdministradorQA" as const, extension: null };
    mocks.activeCalls.mockResolvedValue([{ session_id: "live-1", actor: "agente1", source_extension: "2001", destination: "2002", media: "audio", state: "active", held: true, started_at: "2026-06-20T12:00:00Z", mos: null }]);
    mocks.evaluations.mockResolvedValue([{ id: 1, call_id: 1, evaluator: "supervisor1", score: 85, notes: "", created_at: "2026-06-20T11:00:00Z" }]);
    render(<Dashboard user={admin} onLogout={vi.fn()} />);
    await screen.findByText("Llamadas recientes");

    fireEvent.click(screen.getByRole("button", { name: "Monitoreo en vivo" }));
    expect(await screen.findByText("RETENIDA")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Actualizar/ }));
    await waitFor(() => expect(mocks.activeCalls).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "Evaluaciones" }));
    expect(await screen.findByText("85/100")).toBeVisible();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "90" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Correcta" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar evaluacion" }));
    await waitFor(() => expect(mocks.createEvaluation).toHaveBeenCalledWith(1, 90, "Correcta"));

    fireEvent.click(screen.getByRole("button", { name: "Gestion de usuarios" }));
    fireEvent.click(await screen.findByRole("button", { name: "Activo" }));
    await waitFor(() => expect(mocks.updateUserStatus).toHaveBeenCalledWith("agente1", false));
    expect(await screen.findByRole("button", { name: "Inactivo" })).toBeVisible();
  });
});

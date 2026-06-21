import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, session } from "./api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("persiste el token y envia autenticacion y cuerpos JSON", async () => {
    session.token = "jwt-value";
    expect(session.token).toBe("jwt-value");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse({ accepted: true }));

    await api.callEvent("started", "2002", "video", "session-1");

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/calls/events");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer jwt-value");
    expect(init?.body).toBe(JSON.stringify({
      event: "started", destination: "2002", media: "video", session_id: "session-1",
    }));
    session.token = null;
    expect(session.token).toBeNull();
  });

  it("cubre login y consultas de llamadas, SIP, auditoria y calidad", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ access_token: "token" }))
      .mockResolvedValueOnce(jsonResponse({ extension: "2001" }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ bugs: 0 }));

    await api.login("agente1", "password");
    await api.sipConfig();
    await api.calls();
    await api.audit();
    await api.quality();

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ username: "agente1", password: "password" }));
  });

  it("propaga el detalle del backend y usa un error generico si no hay JSON", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ detail: "No autorizado" }, 401))
      .mockResolvedValueOnce(new Response("invalid", { status: 503 }));

    await expect(api.calls()).rejects.toThrow("No autorizado");
    await expect(api.calls()).rejects.toThrow("Error de comunicacion");
  });

  it("cubre paginacion, gobierno, presencia y controles de llamada", async () => {
    session.token = "token";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse({ accepted: true }));

    await api.callPage({ search: "2001", disposition: "ANSWERED", date: "2026-06-20", limit: 5, offset: 10 });
    await api.services();
    await api.activeCalls();
    await api.evaluations();
    await api.createEvaluation(7, 92, "Buena atencion");
    await api.reportSummary();
    await api.users();
    await api.updateUserStatus("qa user", false);
    await api.presence(true);
    await api.callQuality("session-7", {
      packets_received: 300, packets_lost: 2, jitter_ms: 4, rtt_ms: 25, bitrate_kbps: 96,
    });
    await api.callPage({});

    const pageUrl = String(fetchMock.mock.calls[0][0]);
    expect(pageUrl).toContain("search=2001");
    expect(pageUrl).toContain("disposition=ANSWERED");
    expect(pageUrl).toContain("date_from=2026-06-20T00%3A00%3A00-05%3A00");
    expect(fetchMock.mock.calls[4][1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[7][0]).toBe("/api/users/qa%20user/status");
    expect(fetchMock.mock.calls[8][1]?.body).toBe(JSON.stringify({ do_not_disturb: true }));
    expect(fetchMock.mock.calls[9][1]?.body).toContain('"packets_received":300');
    expect(fetchMock.mock.calls[10][0]).toBe("/api/calls/page?limit=10&offset=0");
  });

  it("descarga grabaciones autenticadas y reporta archivos ausentes", async () => {
    session.token = "token";
    const blob = new Blob(["audio"], { type: "audio/wav" });
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(blob, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    const downloaded = await api.recording("cdr/1");
    expect(downloaded.size).toBeGreaterThan(0);
    expect(downloaded.type).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/recordings/cdr%2F1");
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({ Authorization: "Bearer token" });
    await expect(api.recording("missing")).rejects.toThrow("Grabacion no disponible");
    session.token = null;
    fetchMock.mockResolvedValueOnce(new Response(blob, { status: 200 }));
    await api.recording("public-shape");
    expect(fetchMock.mock.calls[2][1]?.headers).toEqual({});
  });
});

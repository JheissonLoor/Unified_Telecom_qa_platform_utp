import { beforeEach, describe, expect, it, vi } from "vitest";
import { SipClient } from "./sip";
import type { SipConfig } from "./types";

const sipMocks = vi.hoisted(() => {
  class Emitter {
    listener?: (state: string) => void;
    addListener = vi.fn((listener: (state: string) => void) => { this.listener = listener; });
    emit(state: string) { this.listener?.(state); }
  }

  const makeURI = vi.fn((value: string): { value: string } | undefined => ({ value }));
  const start = vi.fn();
  const stop = vi.fn();
  const register = vi.fn();
  const unregister = vi.fn();
  const invite = vi.fn();
  const bye = vi.fn();
  const cancel = vi.fn();
  const accept = vi.fn();
  const reject = vi.fn();
  const info = vi.fn();
  const refer = vi.fn();
  const userAgents: FakeUserAgent[] = [];
  const registerers: FakeRegisterer[] = [];
  const inviters: FakeInviter[] = [];

  class FakeUserAgent {
    static makeURI = makeURI;
    options: Record<string, unknown>;
    start = start;
    stop = stop;
    constructor(options: Record<string, unknown>) { this.options = options; userAgents.push(this); }
  }

  class FakeRegisterer {
    stateChange = new Emitter();
    register = register;
    unregister = unregister;
    constructor() { registerers.push(this); }
  }

  class FakeInviter {
    id = "outgoing-session";
    state = "Initial";
    stateChange = new Emitter();
    invite = invite;
    bye = bye;
    cancel = cancel;
    info = info;
    refer = refer;
    sessionDescriptionHandler?: unknown;
    options: Record<string, unknown>;
    constructor(_agent: FakeUserAgent, _target: unknown, options: Record<string, unknown>) {
      this.options = options;
      inviters.push(this);
    }
  }

  class FakeInvitation {
    id = "incoming-session";
    state = "Initial";
    stateChange = new Emitter();
    accept = accept;
    reject = reject;
    bye = bye;
    info = info;
    refer = refer;
    request: { body?: string };
    remoteIdentity = { uri: { user: "1002" }, displayName: "Softphone 1002" };
    sessionDescriptionHandler?: unknown;
    constructor(body?: string) { this.request = { body }; }
  }

  return {
    Emitter, FakeUserAgent, FakeRegisterer, FakeInviter, FakeInvitation,
    makeURI, start, stop, register, unregister, invite, bye, cancel, accept, reject, info, refer,
    userAgents, registerers, inviters,
  };
});

vi.mock("sip.js", () => ({
  UserAgent: sipMocks.FakeUserAgent,
  Registerer: sipMocks.FakeRegisterer,
  Inviter: sipMocks.FakeInviter,
  Invitation: sipMocks.FakeInvitation,
  Session: class {},
  RegistererState: { Registered: "Registered", Unregistered: "Unregistered", Terminated: "Terminated" },
  SessionState: { Established: "Established", Terminated: "Terminated" },
  Web: {},
}));

const config: SipConfig = {
  extension: "2001",
  authorization_username: "2001",
  password: "secret",
  websocket_url: "wss://localhost/ws",
  sip_domain: "localhost",
  ice_servers: [{ urls: "stun:localhost:3478" }],
};

describe("SipClient", () => {
  const callbacks = {
    onRegistration: vi.fn(),
    onSession: vi.fn(),
    onIncoming: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sipMocks.userAgents.length = 0;
    sipMocks.registerers.length = 0;
    sipMocks.inviters.length = 0;
    sipMocks.makeURI.mockImplementation((value: string) => ({ value }));
    sipMocks.start.mockResolvedValue(undefined);
    sipMocks.stop.mockResolvedValue(undefined);
    sipMocks.register.mockResolvedValue(undefined);
    sipMocks.unregister.mockResolvedValue(undefined);
    sipMocks.invite.mockResolvedValue(undefined);
    sipMocks.accept.mockResolvedValue(undefined);
    sipMocks.reject.mockResolvedValue(undefined);
    sipMocks.info.mockResolvedValue(undefined);
    sipMocks.refer.mockResolvedValue(undefined);
    sipMocks.bye.mockResolvedValue(undefined);
    sipMocks.cancel.mockResolvedValue(undefined);
  });

  it("registra estados y acepta invitaciones de audio y video", async () => {
    const client = new SipClient(callbacks);
    await client.connect(config);
    expect(callbacks.onRegistration).toHaveBeenCalledWith("connecting");
    sipMocks.registerers[0].stateChange.emit("Registered");
    sipMocks.registerers[0].stateChange.emit("Unregistered");
    sipMocks.registerers[0].stateChange.emit("Terminated");
    expect(callbacks.onRegistration).toHaveBeenCalledWith("registered");
    expect(callbacks.onRegistration).toHaveBeenCalledWith("offline");
    expect(callbacks.onRegistration).toHaveBeenCalledWith("error");

    const delegate = sipMocks.userAgents[0].options.delegate as {
      onInvite: (invitation: InstanceType<typeof sipMocks.FakeInvitation>) => Promise<void>;
    };
    await delegate.onInvite(new sipMocks.FakeInvitation("m=video 9 UDP/TLS/RTP/SAVPF"));
    expect(callbacks.onIncoming).toHaveBeenLastCalledWith({
      from: "1002", displayName: "Softphone 1002", withVideo: true,
    });
    await client.acceptIncoming();
    expect(sipMocks.accept).toHaveBeenLastCalledWith({
      sessionDescriptionHandlerOptions: { constraints: { audio: true, video: true } },
    });
    await delegate.onInvite(new sipMocks.FakeInvitation("m=audio 9 UDP/TLS/RTP/SAVPF"));
    await client.rejectIncoming();
    expect(sipMocks.reject).toHaveBeenLastCalledWith({ statusCode: 486, reasonPhrase: "Busy Here" });
  });

  it("realiza llamadas, publica estados y cuelga segun el tipo de sesion", async () => {
    const client = new SipClient(callbacks);
    await client.connect(config);
    await client.call("2002", true);
    const inviter = sipMocks.inviters[0];
    expect(inviter.options).toEqual({
      sessionDescriptionHandlerOptions: { constraints: { audio: true, video: true } },
    });
    inviter.state = "Established";
    inviter.stateChange.emit("Established");
    await client.hangup();
    expect(sipMocks.bye).toHaveBeenCalled();

    await client.call("2002", false);
    await client.hangup();
    expect(sipMocks.cancel).toHaveBeenCalled();
    sipMocks.inviters[1].stateChange.emit("Terminated");
    expect(callbacks.onSession).toHaveBeenLastCalledWith(null);

    const delegate = sipMocks.userAgents[0].options.delegate as {
      onInvite: (invitation: InstanceType<typeof sipMocks.FakeInvitation>) => Promise<void>;
    };
    const incoming = new sipMocks.FakeInvitation();
    await delegate.onInvite(incoming);
    await client.rejectIncoming();
    expect(sipMocks.reject).toHaveBeenCalled();
  });

  it("controla retencion, transferencia, DTMF y no molestar", async () => {
    const client = new SipClient(callbacks);
    await client.connect(config);
    await client.call("2002", false);
    const session = sipMocks.inviters[0];
    session.state = "Established";
    await client.setHold(true);
    expect(sipMocks.invite).toHaveBeenCalled();
    await client.transfer("2003");
    expect(sipMocks.refer).toHaveBeenCalled();
    await client.sendDtmf("5");
    expect(sipMocks.info).toHaveBeenCalledWith(expect.objectContaining({ requestOptions: expect.any(Object) }));
    await expect(client.sendDtmf("Z")).rejects.toThrow("Tono DTMF invalido");

    const delegate = sipMocks.userAgents[0].options.delegate as {
      onInvite: (invitation: InstanceType<typeof sipMocks.FakeInvitation>) => Promise<void>;
    };
    client.setDoNotDisturb(true);
    await delegate.onInvite(new sipMocks.FakeInvitation());
    expect(sipMocks.reject).toHaveBeenLastCalledWith({ statusCode: 486, reasonPhrase: "Do Not Disturb" });
  });

  it("adjunta medios y desconecta registro y agente", async () => {
    class FakeMediaStream {
      tracks: unknown[] = [];
      addTrack(track: unknown) { this.tracks.push(track); }
    }
    vi.stubGlobal("MediaStream", FakeMediaStream);
    const client = new SipClient(callbacks);
    await client.connect(config);
    await client.call("2002", false);
    const audioTrack = { kind: "audio", enabled: true };
    sipMocks.inviters[0].sessionDescriptionHandler = {
      peerConnection: {
        getReceivers: () => [{ track: { kind: "audio" } }, { track: null }],
        getSenders: () => [{ track: audioTrack }],
      },
    };
    const local = { srcObject: null } as unknown as HTMLVideoElement;
    const remote = { srcObject: null } as unknown as HTMLVideoElement;
    expect(client.attachMedia(local, remote)).toEqual({ audio: true, video: false });
    expect((local.srcObject as unknown as FakeMediaStream).tracks).toHaveLength(1);
    expect((remote.srcObject as unknown as FakeMediaStream).tracks).toHaveLength(1);
    expect(client.setMediaEnabled("audio", false)).toBe(true);
    expect(audioTrack.enabled).toBe(false);
    expect(client.setMediaEnabled("video", true)).toBe(false);
    await client.disconnect();
    expect(sipMocks.unregister).toHaveBeenCalled();
    expect(sipMocks.stop).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("rechaza URI invalidas y reporta errores de transporte", async () => {
    sipMocks.makeURI.mockReturnValueOnce(undefined);
    await expect(new SipClient(callbacks).connect(config)).rejects.toThrow("URI SIP invalida");

    sipMocks.start.mockRejectedValueOnce(new Error("network"));
    await expect(new SipClient(callbacks).connect(config)).rejects.toThrow("network");
    expect(callbacks.onRegistration).toHaveBeenCalledWith("error");

    const client = new SipClient(callbacks);
    await expect(client.call("2002", false)).rejects.toThrow("SIP no registrado");
    await client.hangup();
    client.attachMedia(null, null);
  });

  it("cubre validaciones de sesion, transferencia y llamada entrante sin SDP", async () => {
    const client = new SipClient(callbacks);
    await expect(client.acceptIncoming()).rejects.toThrow("No hay llamada entrante");
    await client.rejectIncoming();
    await expect(client.setHold(true)).rejects.toThrow("No hay llamada establecida");
    await expect(client.transfer("2002")).rejects.toThrow("No hay llamada establecida");
    await expect(client.sendDtmf("1")).rejects.toThrow("No hay llamada establecida");
    expect(client.setRemoteAudioEnabled(null, true)).toBe(false);

    await client.connect(config);
    const delegate = sipMocks.userAgents[0].options.delegate as {
      onInvite: (invitation: InstanceType<typeof sipMocks.FakeInvitation>) => Promise<void>;
    };
    await delegate.onInvite(new sipMocks.FakeInvitation());
    const incoming = await client.acceptIncoming();
    expect(sipMocks.accept).toHaveBeenLastCalledWith({
      sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } },
    });
    await client.hangup();
    expect(sipMocks.reject).toHaveBeenCalled();
    expect(incoming).toBeDefined();

    await client.call("2002", false);
    sipMocks.inviters[0].state = "Established";
    sipMocks.makeURI.mockReturnValueOnce(undefined);
    await expect(client.transfer("2003")).rejects.toThrow("Destino de transferencia invalido");
    await client.setHold(false);
    expect(sipMocks.invite).toHaveBeenLastCalledWith({ sessionDescriptionHandlerModifiers: [] });
  });

  it("calcula metricas WebRTC y contempla estadisticas ausentes", async () => {
    const client = new SipClient(callbacks);
    expect(await client.qualitySnapshot()).toEqual({
      packets_received: 0, packets_lost: 0, jitter_ms: null, rtt_ms: null, bitrate_kbps: null,
    });
    await client.connect(config);
    await client.call("2002", false);
    const session = sipMocks.inviters[0];
    session.state = "Established";
    session.stateChange.emit("Established");
    session.sessionDescriptionHandler = {
      peerConnection: {
        getStats: async () => new Map([
          ["audio", { type: "inbound-rtp", kind: "audio", packetsReceived: 120, packetsLost: -2, bytesReceived: 16000, jitter: 0.004 }],
          ["pair", { type: "candidate-pair", state: "succeeded", currentRoundTripTime: 0.025 }],
          ["video", { type: "inbound-rtp", kind: "video" }],
          ["failed", { type: "candidate-pair", state: "failed" }],
        ]),
      },
    };
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 1000);
    const snapshot = await client.qualitySnapshot();
    expect(snapshot).toMatchObject({ packets_received: 120, packets_lost: 0, jitter_ms: 4, rtt_ms: 25 });
    expect(snapshot.bitrate_kbps).toBeGreaterThan(0);

    session.sessionDescriptionHandler = { peerConnection: null };
    expect(client.attachMedia(null, null)).toEqual({ audio: false, video: false });
    expect(client.setMediaEnabled("audio", true)).toBe(false);
    const media = document.createElement("audio");
    expect(client.setRemoteAudioEnabled(media, false)).toBe(true);
    expect(media.muted).toBe(true);
  });
});

import {
  Invitation,
  Inviter,
  Registerer,
  RegistererState,
  Session,
  SessionState,
  UserAgent,
  Web,
} from "sip.js";
import type { SipConfig } from "./types";

export type RegistrationState = "offline" | "connecting" | "registered" | "error";
export interface LocalMediaState { audio: boolean; video: boolean; }
export interface IncomingCall { from: string; displayName: string; withVideo: boolean; }
export interface QualitySnapshot {
  packets_received: number;
  packets_lost: number;
  jitter_ms: number | null;
  rtt_ms: number | null;
  bitrate_kbps: number | null;
}

export interface SipCallbacks {
  onRegistration: (state: RegistrationState) => void;
  onSession: (session: Session | null) => void;
  onIncoming: (call: IncomingCall | null) => void;
  onError: (message: string) => void;
}

export class SipClient {
  private userAgent?: UserAgent;
  private registerer?: Registerer;
  private session?: Session;
  private pendingInvitation?: Invitation;
  private doNotDisturb = false;
  private sessionStartedAt?: number;

  constructor(private readonly callbacks: SipCallbacks) {}

  async connect(config: SipConfig): Promise<void> {
    this.callbacks.onRegistration("connecting");
    const uri = UserAgent.makeURI(`sip:${config.extension}@${config.sip_domain}`);
    if (!uri) throw new Error("URI SIP invalida");
    const websocket = new URL(config.websocket_url);
    websocket.host = window.location.host;
    this.userAgent = new UserAgent({
      uri,
      authorizationUsername: config.authorization_username,
      authorizationPassword: config.password,
      transportOptions: { server: websocket.toString() },
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: { iceServers: config.ice_servers },
      },
      delegate: {
        onInvite: async (invitation: Invitation) => {
          if (this.doNotDisturb) {
            await invitation.reject({ statusCode: 486, reasonPhrase: "Do Not Disturb" });
            this.callbacks.onError("Llamada rechazada por No Molestar");
            return;
          }
          const withVideo = invitation.request.body?.includes("m=video") ?? false;
          this.pendingInvitation = invitation;
          this.callbacks.onIncoming({
            from: invitation.remoteIdentity.uri.user ?? "desconocido",
            displayName: invitation.remoteIdentity.displayName || "Llamada entrante",
            withVideo,
          });
        },
      },
    });
    this.registerer = new Registerer(this.userAgent);
    this.registerer.stateChange.addListener((state) => {
      if (state === RegistererState.Registered) this.callbacks.onRegistration("registered");
      if (state === RegistererState.Unregistered) this.callbacks.onRegistration("offline");
      if (state === RegistererState.Terminated) this.callbacks.onRegistration("error");
    });
    try {
      await this.userAgent.start();
      await this.registerer.register();
    } catch (error) {
      this.callbacks.onRegistration("error");
      throw error;
    }
  }

  async call(destination: string, withVideo: boolean): Promise<Session> {
    if (!this.userAgent) throw new Error("SIP no registrado");
    const target = UserAgent.makeURI(`sip:${destination}@localhost`);
    if (!target) throw new Error("Destino invalido");
    const inviter = new Inviter(this.userAgent, target, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: withVideo },
      },
    });
    this.bindSession(inviter);
    await inviter.invite();
    return inviter;
  }

  async acceptIncoming(): Promise<Session> {
    if (!this.pendingInvitation) throw new Error("No hay llamada entrante");
    const invitation = this.pendingInvitation;
    const withVideo = invitation.request.body?.includes("m=video") ?? false;
    this.pendingInvitation = undefined;
    this.callbacks.onIncoming(null);
    this.bindSession(invitation);
    await invitation.accept({
      sessionDescriptionHandlerOptions: { constraints: { audio: true, video: withVideo } },
    });
    return invitation;
  }

  async rejectIncoming(): Promise<void> {
    if (!this.pendingInvitation) return;
    const invitation = this.pendingInvitation;
    this.pendingInvitation = undefined;
    this.callbacks.onIncoming(null);
    await invitation.reject({ statusCode: 486, reasonPhrase: "Busy Here" });
  }

  setDoNotDisturb(enabled: boolean): void {
    this.doNotDisturb = enabled;
  }

  async setHold(held: boolean): Promise<void> {
    if (!this.session || this.session.state !== SessionState.Established) {
      throw new Error("No hay llamada establecida");
    }
    await this.session.invite({
      sessionDescriptionHandlerModifiers: held ? [Web.holdModifier] : [],
    });
  }

  async transfer(destination: string): Promise<void> {
    if (!this.session || this.session.state !== SessionState.Established) {
      throw new Error("No hay llamada establecida");
    }
    const target = UserAgent.makeURI(`sip:${destination}@localhost`);
    if (!target) throw new Error("Destino de transferencia invalido");
    await this.session.refer(target);
  }

  async sendDtmf(tone: string): Promise<void> {
    if (!this.session || this.session.state !== SessionState.Established) {
      throw new Error("No hay llamada establecida");
    }
    if (!/^[0-9A-D*#]$/i.test(tone)) throw new Error("Tono DTMF invalido");
    await this.session.info({
      requestOptions: {
        body: {
          contentDisposition: "render",
          contentType: "application/dtmf-relay",
          content: `Signal=${tone.toUpperCase()}\r\nDuration=250`,
        },
      },
    });
  }

  async hangup(): Promise<void> {
    if (!this.session) return;
    if (this.session.state === SessionState.Established) await this.session.bye();
    else if (this.session instanceof Inviter) await this.session.cancel();
    else if (this.session instanceof Invitation) await this.session.reject();
  }

  attachMedia(localVideo: HTMLVideoElement | null, remoteVideo: HTMLVideoElement | null): LocalMediaState {
    if (!this.session?.sessionDescriptionHandler) return { audio: false, video: false };
    const handler = this.session.sessionDescriptionHandler as Web.SessionDescriptionHandler;
    const pc = handler.peerConnection;
    if (!pc) return { audio: false, video: false };
    const remote = new MediaStream();
    pc.getReceivers().forEach((receiver) => receiver.track && remote.addTrack(receiver.track));
    const local = new MediaStream();
    const senders = pc.getSenders();
    senders.forEach((sender) => sender.track && local.addTrack(sender.track));
    if (remoteVideo) remoteVideo.srcObject = remote;
    if (localVideo) localVideo.srcObject = local;
    return {
      audio: senders.some((sender) => sender.track?.kind === "audio"),
      video: senders.some((sender) => sender.track?.kind === "video"),
    };
  }

  setMediaEnabled(kind: "audio" | "video", enabled: boolean): boolean {
    if (!this.session?.sessionDescriptionHandler) return false;
    const handler = this.session.sessionDescriptionHandler as Web.SessionDescriptionHandler;
    const tracks = handler.peerConnection?.getSenders()
      .map((sender) => sender.track)
      .filter((track): track is MediaStreamTrack => track?.kind === kind) ?? [];
    tracks.forEach((track) => { track.enabled = enabled; });
    return tracks.length > 0;
  }

  setRemoteAudioEnabled(element: HTMLMediaElement | null, enabled: boolean): boolean {
    if (!element) return false;
    element.muted = !enabled;
    return true;
  }

  async qualitySnapshot(): Promise<QualitySnapshot> {
    const handler = this.session?.sessionDescriptionHandler as Web.SessionDescriptionHandler | undefined;
    const pc = handler?.peerConnection;
    if (!pc) {
      return { packets_received: 0, packets_lost: 0, jitter_ms: null, rtt_ms: null, bitrate_kbps: null };
    }
    const reports = await pc.getStats();
    let packetsReceived = 0;
    let packetsLost = 0;
    let jitterMs: number | null = null;
    let rttMs: number | null = null;
    let bytesReceived = 0;
    reports.forEach((report) => {
      if (report.type === "inbound-rtp" && report.kind === "audio") {
        packetsReceived += report.packetsReceived ?? 0;
        packetsLost += report.packetsLost ?? 0;
        bytesReceived += report.bytesReceived ?? 0;
        if (typeof report.jitter === "number") jitterMs = report.jitter * 1000;
      }
      if (report.type === "candidate-pair" && report.state === "succeeded" && typeof report.currentRoundTripTime === "number") {
        rttMs = report.currentRoundTripTime * 1000;
      }
    });
    const elapsedSeconds = this.sessionStartedAt ? (Date.now() - this.sessionStartedAt) / 1000 : 0;
    return {
      packets_received: packetsReceived,
      packets_lost: Math.max(0, packetsLost),
      jitter_ms: jitterMs,
      rtt_ms: rttMs,
      bitrate_kbps: elapsedSeconds > 0 ? bytesReceived * 8 / elapsedSeconds / 1000 : null,
    };
  }

  async disconnect(): Promise<void> {
    await this.rejectIncoming();
    await this.hangup();
    if (this.registerer) await this.registerer.unregister();
    if (this.userAgent) await this.userAgent.stop();
  }

  private bindSession(session: Session): void {
    this.session = session;
    this.sessionStartedAt = Date.now();
    this.callbacks.onSession(session);
    session.stateChange.addListener((state) => {
      if (state === SessionState.Established) this.callbacks.onSession(session);
      if (state === SessionState.Terminated) {
        this.session = undefined;
        this.sessionStartedAt = undefined;
        this.callbacks.onSession(null);
      }
    });
  }
}

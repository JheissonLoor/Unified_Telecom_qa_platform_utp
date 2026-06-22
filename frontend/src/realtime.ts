export interface RealtimeEvent {
  type: string;
  occurred_at?: string;
  data: Record<string, unknown>;
}

export function realtimeUrl(location: Pick<Location, "protocol" | "host"> = window.location) {
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/events/ws`;
}

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private retryTimer: number | null = null;
  private retryCount = 0;
  private closed = false;

  constructor(
    private readonly token: string,
    private readonly onEvent: (event: RealtimeEvent) => void,
    private readonly onStatus: (connected: boolean) => void,
  ) {}

  connect() {
    if (!this.token || this.socket) return;
    this.closed = false;
    const socket = new WebSocket(realtimeUrl());
    this.socket = socket;
    socket.onopen = () => socket.send(JSON.stringify({ token: this.token }));
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(String(message.data)) as RealtimeEvent;
        if (event.type === "ready") {
          this.retryCount = 0;
          this.onStatus(true);
        } else if (event.type !== "heartbeat") {
          this.onEvent(event);
        }
      } catch {
        // Un mensaje invalido no debe interrumpir la consola del agente.
      }
    };
    socket.onclose = () => {
      this.socket = null;
      this.onStatus(false);
      if (!this.closed) this.scheduleReconnect();
    };
    socket.onerror = () => socket.close();
  }

  disconnect() {
    this.closed = true;
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.socket?.close();
    this.socket = null;
    this.onStatus(false);
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.retryCount, 15000);
    this.retryCount += 1;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient, realtimeUrl } from "./realtime";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];

  constructor(readonly url: string) { FakeWebSocket.instances.push(this); }
  send(value: string) { this.sent.push(value); }
  close() { this.onclose?.(); }
}

describe("RealtimeClient", () => {
  afterEach(() => {
    vi.useRealTimers();
    FakeWebSocket.instances = [];
    vi.unstubAllGlobals();
  });

  it("construye URL segura, autentica y entrega eventos", () => {
    expect(realtimeUrl({ protocol: "https:", host: "localhost:18443" } as Location)).toBe("wss://localhost:18443/api/events/ws");
    expect(realtimeUrl({ protocol: "http:", host: "localhost" } as Location)).toBe("ws://localhost/api/events/ws");
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const onEvent = vi.fn();
    const onStatus = vi.fn();
    const client = new RealtimeClient("jwt", onEvent, onStatus);
    client.connect();
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();
    expect(JSON.parse(socket.sent[0])).toEqual({ token: "jwt" });
    socket.onmessage?.({ data: JSON.stringify({ type: "ready", data: {} }) } as MessageEvent);
    socket.onmessage?.({ data: JSON.stringify({ type: "call.ended", data: { destination: "2002" } }) } as MessageEvent);
    socket.onmessage?.({ data: "invalid" } as MessageEvent);
    expect(onStatus).toHaveBeenCalledWith(true);
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "call.ended" }));
    client.disconnect();
  });

  it("reconecta con espera progresiva", () => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const client = new RealtimeClient("jwt", vi.fn(), vi.fn());
    client.connect();
    FakeWebSocket.instances[0].onclose?.();
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    client.disconnect();
  });
});

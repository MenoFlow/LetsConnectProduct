import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emitRealtime, connectRealtime, stopRealtime } from "@/lib/realtime";
import { useDbStore } from "@/stores/dbStore";

const mockSocket = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    connected: false,
    id: "socket-self",
    handlers,
    anyHandler: undefined as ((event: string, payload: unknown) => void) | undefined,
    ackResult: { ok: true, data: { id: "conversation-1" } },
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
      return mockSocket;
    }),
    onAny: vi.fn((handler: (event: string, payload: unknown) => void) => {
      mockSocket.anyHandler = handler;
    }),
    connect: vi.fn(() => {
      mockSocket.connected = true;
      mockSocket.handlers.get("connect")?.();
      mockSocket.handlers.get("realtime:ready")?.();
    }),
    disconnect: vi.fn(() => {
      mockSocket.connected = false;
    }),
    timeout: vi.fn(() => ({
      emit: vi.fn(
        (_event: string, _payload: unknown, callback: (error: null, result: unknown) => void) =>
          callback(null, mockSocket.ackResult),
      ),
    })),
  };
});

vi.mock("socket.io-client", () => ({ io: vi.fn(() => mockSocket) }));

const workspace = {
  users: [],
  companies: [],
  companyMembers: [],
  categories: [],
  products: [],
  conversations: [
    {
      id: "conversation-1",
      companyId: "company-1",
      clientId: "client-1",
      subject: "New quote",
      createdAt: "2026-11-16T12:00:00.000Z",
      updatedAt: "2026-11-16T12:00:00.000Z",
    },
  ],
  messages: [],
  favorites: [],
  activity: [],
};

describe("connexion temps réel", () => {
  beforeEach(() => {
    mockSocket.handlers.clear();
    mockSocket.anyHandler = undefined;
    mockSocket.ackResult = { ok: true, data: { id: "conversation-1" } };
    mockSocket.connected = false;
    useDbStore.setState({
      users: [],
      companies: [],
      companyMembers: [],
      categories: [],
      products: [],
      conversations: [],
      messages: [],
      favorites: [],
      activity: [],
      status: "idle",
      error: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(workspace), { status: 200 })),
    );
  });

  afterEach(() => {
    stopRealtime();
    vi.unstubAllGlobals();
  });

  it("uses the socket acknowledgement for chat mutations", async () => {
    connectRealtime("client-1");

    await expect(
      emitRealtime<{ id: string }>("conversation:create", {
        companyId: "company-1",
        subject: "New quote",
        body: "Please send a quote.",
      }),
    ).resolves.toEqual({ id: "conversation-1" });
    expect(mockSocket.connected).toBe(true);
  });

  it("reloads the workspace when another socket changes a conversation", async () => {
    connectRealtime("client-1");

    mockSocket.anyHandler?.("conversation:created", {
      sourceSocketId: "socket-peer",
    });

    await vi.waitFor(() => {
      expect(useDbStore.getState().conversations.map((conversation) => conversation.id)).toEqual([
        "conversation-1",
      ]);
    });
  });
});

import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import { ApiError, notifySessionExpired } from "@/lib/api";
import { reloadWorkspace } from "@/stores/dbStore";

type RealtimeStatus = "offline" | "connecting" | "connected" | "error";
type SocketResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { status: number; message: string } };

const API_BASE = ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "/api").replace(
  /\/+$/,
  "",
);
const SOCKET_URL = API_BASE === "/api" ? undefined : API_BASE.replace(/\/api$/, "");
const workspaceEvents = [
  "conversation:created",
  "conversation:updated",
  "conversation:deleted",
  "message:created",
  "message:updated",
  "message:deleted",
  "conversation:read",
];

const useRealtimeStore = create<{ status: RealtimeStatus }>()(() => ({ status: "offline" }));
let socket: Socket | undefined;
let connectedUserId: string | undefined;
let authenticated = false;

export function useRealtimeStatus(): RealtimeStatus {
  return useRealtimeStore((state) => state.status);
}

export function connectRealtime(userId: string): void {
  if (connectedUserId === userId && socket) return;
  stopRealtime();
  connectedUserId = userId;
  authenticated = false;
  useRealtimeStore.setState({ status: "connecting" });

  const active = io(SOCKET_URL, {
    path: "/api/socket.io",
    withCredentials: true,
    autoConnect: false,
  });
  socket = active;
  active.on("connect", () => useRealtimeStore.setState({ status: "connecting" }));
  active.on("realtime:ready", () => {
    authenticated = true;
    useRealtimeStore.setState({ status: "connected" });
    void reloadWorkspace();
  });
  active.on("realtime:unauthorized", () => {
    notifySessionExpired();
    stopRealtime();
  });
  active.on("connect_error", () => {
    useRealtimeStore.setState({ status: "error" });
  });
  active.on("disconnect", () => {
    if (connectedUserId) useRealtimeStore.setState({ status: "connecting" });
  });
  active.onAny((event: string, payload: unknown) => {
    if (!workspaceEvents.includes(event)) return;
    if (
      payload &&
      typeof payload === "object" &&
      "sourceSocketId" in payload &&
      payload.sourceSocketId === active.id
    ) {
      return;
    }
    void reloadWorkspace();
  });
  active.connect();
}

export function stopRealtime(): void {
  const active = socket;
  socket = undefined;
  connectedUserId = undefined;
  authenticated = false;
  active?.disconnect();
  useRealtimeStore.setState({ status: "offline" });
}

export function emitRealtime<T>(event: string, payload: unknown): Promise<T> {
  const active = socket;
  if (!active?.connected || !authenticated) {
    return Promise.reject(new Error("La connexion temps réel n’est pas disponible."));
  }

  return new Promise<T>((resolve, reject) => {
    active.timeout(10_000).emit(event, payload, (timeoutError: Error | null, result: SocketResult<T>) => {
      if (timeoutError) {
        reject(new Error("Le serveur ne répond pas. Réessayez."));
      } else if (!result) {
        reject(new Error("Le serveur n’a pas confirmé l’opération."));
      } else if (!result.ok) {
        reject(new ApiError(result.error.status, result.error.message));
      } else {
        resolve(result.data);
      }
    });
  });
}

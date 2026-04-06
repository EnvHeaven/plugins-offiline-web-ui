import { Injectable } from "@angular/core";

export interface DaemonEventBase {
  type: "repo:selected" | "version:set" | "version:incremented";
}

export interface RepoSelectedEvent extends DaemonEventBase {
  type: "repo:selected";
}

export interface VersionChangedEvent extends DaemonEventBase {
  type: "version:set" | "version:incremented";
  record?: {
    artifactName?: string;
    nextVersion?: string;
    lastVersion?: string;
  };
}

export type DaemonEvent = RepoSelectedEvent | VersionChangedEvent;

@Injectable({ providedIn: "root" })
export class DaemonService {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(event: DaemonEvent) => void>();

  subscribe(listener: (event: DaemonEvent) => void): () => void {
    this.listeners.add(listener);
    this.ensureSocket();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.disposeSocket();
      }
    };
  }

  private ensureSocket(): void {
    if (this.socket || this.listeners.size === 0) {
      return;
    }

    const socket = new WebSocket(this.buildSocketUrl());
    this.socket = socket;

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as DaemonEvent;
        this.listeners.forEach((listener) => listener(payload));
      } catch {
        // Ignore malformed daemon messages and keep the socket alive.
      }
    });

    socket.addEventListener("close", () => {
      this.socket = null;
      if (this.listeners.size > 0) {
        this.scheduleReconnect();
      }
    });

    socket.addEventListener("error", () => {
      socket.close();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureSocket();
    }, 5_000);
  }

  private buildSocketUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }

  private disposeSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

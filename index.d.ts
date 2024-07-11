import type { Server } from "node:http";
import type { Socket } from "node:net";

export interface WebsocketServer {
  getInfo: () => {
    listening: boolean;
    port: number;
    clients: string[];
  };
  send: (keys: string[], message: string) => void;
  broadcast: (message: string) => void;
  close: () => void;
  onBroadcast: (callback: (message: string) => void) => void;
  onSend: (callback: (key: string, message: string) => void) => void;
  onMessage: (callback: (key: string, message: string) => void) => void;
  onConnection: (callback: (key: string) => void) => void;
  onDisconnection: (callback: (key: string) => void) => void;
  onListen: (callback: () => void) => void;
  onClose: (callback: () => void) => void;
}

export interface Ws {
  createWebSocketServer: (options: {
    port: number | string;
  }) => WebsocketServer;
}
declare global {
  interface Window {
    ws: Ws;
  }
}

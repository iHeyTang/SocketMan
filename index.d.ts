import type { Server } from "node:http";
import type { Socket } from "node:net";

export interface WebsocketServer {
  send: (key: string, message: string) => void;
  broadcast: (message: string) => void;
  onMessage: (callback: (key: string, message: string) => void) => void;
  onConnection: (callback: (key: string) => void) => void;
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

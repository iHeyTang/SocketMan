import { createHash } from "node:crypto";
import { createServer } from "node:http";
import type { Socket } from "node:net";
import type { WebsocketServer } from "..";

window.ws = {
  createWebSocketServer: (options) => {
    const sockets: Record<string, Socket> = {};

    const connectionHandlers: Parameters<WebsocketServer["onConnection"]>[0][] =
      [];
    const messageHandlers: Parameters<WebsocketServer["onMessage"]>[0][] = [];

    const messageFragments: Record<string, Buffer[]> = {};

    const port =
      typeof options.port === "number"
        ? options.port
        : Number.parseInt(options.port);

    const server = createServer((req, res) => {
      if (req.method === "GET" && req.url) {
        const { headers, url } = req;
        if (url === "/ws") {
          if (
            headers.upgrade &&
            headers.upgrade.toLowerCase() === "websocket"
          ) {
            // 获取req的客户端信息
            const addr = req.socket.remoteAddress;

            const acceptKey = headers["sec-websocket-key"];
            const hash = createHash("sha1")
              .update(`${acceptKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
              .digest("base64");
            const responseHeaders = [
              "HTTP/1.1 101 Switching Protocols",
              "Upgrade: websocket",
              "Connection: Upgrade",
              `Sec-WebSocket-Accept: ${hash}`,
            ];
            req.socket.write(`${responseHeaders.join("\r\n")}\r\n\r\n`);
            if (addr) {
              sockets[addr] = req.socket;
              for (const handler of connectionHandlers) handler(addr);
              req.socket.on("data", (buffer) => {
                const isFinalFrame = buffer[0] & 0x80;
                const opcode = buffer[0] & 0x0f;
                const isMasked = buffer[1] & 0x80;
                let payloadLength = buffer[1] & 0x7f;
                let currentOffset = 2;

                if (payloadLength === 126) {
                  payloadLength = buffer.readUInt16BE(currentOffset);
                  currentOffset += 2;
                } else if (payloadLength === 127) {
                  payloadLength = Number(buffer.readBigUInt64BE(currentOffset));
                  currentOffset += 8;
                }

                let payload = Buffer.alloc(payloadLength);
                if (isMasked) {
                  const maskingKey = buffer.slice(
                    currentOffset,
                    currentOffset + 4
                  );
                  currentOffset += 4;

                  for (let i = 0; i < payloadLength; i++) {
                    const byte = buffer[currentOffset + i];
                    payload[i] = byte ^ maskingKey[i % 4];
                  }
                } else {
                  payload = buffer.slice(
                    currentOffset,
                    currentOffset + payloadLength
                  );
                }

                if (opcode === 0x01) {
                  // Text frame
                  const message = payload.toString("utf8");
                  if (isFinalFrame) {
                    for (const handler of messageHandlers)
                      handler(addr, message);
                  } else {
                    if (!messageFragments[addr]) messageFragments[addr] = [];
                    messageFragments[addr].push(payload);
                  }
                } else if (opcode === 0x00) {
                  // Continuation frame
                  if (messageFragments[addr])
                    messageFragments[addr].push(payload);
                }
              });

              req.socket.on("close", () => {
                delete sockets[addr];
              });
            }
          } else {
            res.writeHead(426, { "Content-Length": "0" });
            res.end();
          }
        } else {
          res.writeHead(404);
          res.end();
        }
      }
    });

    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}/`);
    });

    return {
      onConnection: (callback) => {
        connectionHandlers.push(callback);
      },
      onMessage: (callback) => {
        messageHandlers.push(callback);
      },
      broadcast: (message) => {
        const frame = Buffer.alloc(2 + Buffer.byteLength(message));
        frame[0] = 0x81; // 10000001: FIN bit set, text frame
        frame[1] = Buffer.byteLength(message); // 假设长度小于126
        frame.write(message, 2); // 从第三个字节开始写入消息
        for (const key in sockets) if (sockets[key]) sockets[key].write(frame); // 发送构建的帧到客户端
      },
      send: (key, message) => {
        const MAX_FRAME_SIZE = 125; // 设置最大帧大小
        let messageLength = Buffer.byteLength(message);

        if (messageLength <= MAX_FRAME_SIZE) {
          // 消息长度小于等于123，不需要拆分
          const frame = Buffer.alloc(2 + messageLength);
          frame[0] = 0x81; // FIN bit set, text frame
          frame[1] = messageLength;
          frame.write(message, 2);
          if (sockets[key]) sockets[key].write(frame);
        } else {
          // 消息需要拆分
          let offset = 0;
          while (messageLength > 0) {
            const currentFrameSize = Math.min(messageLength, MAX_FRAME_SIZE);
            const frame = Buffer.alloc(2 + currentFrameSize);
            frame[0] = offset === 0 ? 0x01 : 0x00; // 设置FIN位，第一个帧为0x01，后续帧为0x00
            if (messageLength - currentFrameSize === 0) frame[0] |= 0x80; // 如果是最后一个帧，设置FIN位为1
            frame[1] = currentFrameSize;
            frame.write(message.substr(offset, currentFrameSize), 2);
            if (sockets[key]) sockets[key].write(frame);

            offset += currentFrameSize;
            messageLength -= currentFrameSize;
          }
        }
      },
    };
  },
};

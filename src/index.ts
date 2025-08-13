import http from "http";
import { WebSocket, WebSocketServer } from "ws";

// Use Render-assigned PORT or default locally
const PORT = Number(process.env.PORT || 8081);

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Room storage
const RoomArray = new Map<string, WebSocket[]>();

let userCount = 0;

// Handle WebSocket connections
wss.on("connection", (socket) => {
  userCount++;
  console.log(`[WS] User connected. Total: ${userCount}`);

  socket.on("message", (message) => {
    try {
      const parsed = JSON.parse(message.toString());

      if (parsed.type === "join") {
        const roomId = parsed.payload.roomId;
        if (!RoomArray.has(roomId)) {
          RoomArray.set(roomId, []);
        }
        RoomArray.get(roomId)!.push(socket);
        console.log(`[WS] User joined room: ${roomId}`);
      }

      else if (parsed.type === "chat") {
        const id = parsed.payload.roomId;
        const arr = RoomArray.get(id);
        if (!arr) return;

        for (const client of arr) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(parsed.payload.message);
          }
        }
        console.log(`[WS] Message sent to room: ${id}`);
      }
    } catch (err) {
      console.error("[WS] Invalid message:", err);
    }
  });

  socket.on("close", () => {
    userCount--;
    console.log(`[WS] User disconnected. Total: ${userCount}`);
    for (const [room, arr] of RoomArray.entries()) {
      const filtered = arr.filter((s) => s !== socket);
      if (filtered.length === 0) {
        RoomArray.delete(room);
      } else {
        RoomArray.set(room, filtered);
      }
    }
  });
});

// Upgrade HTTP → WebSocket
server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket as any, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("[SERVER] Shutting down...");
  wss.clients.forEach((client) => client.close());
  server.close(() => process.exit(0));
});

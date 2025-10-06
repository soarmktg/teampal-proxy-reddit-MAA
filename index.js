import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Replace this with your actual Pipedream webhook URL
const PIPEDREAM_WEBHOOK_URL = "https://eoxxx.m.pipedream.net";

// --- SSE HANDSHAKE ---
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log("✅ Teampal connected via SSE");

  // Send initial connected message
  res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result: "connected" })}\n\n`);

  // Keep-alive ping every 15s
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", id: 0, method: "ping" })}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
    console.log("❌ Teampal SSE connection closed");
  });
});

// --- HANDLE JSON

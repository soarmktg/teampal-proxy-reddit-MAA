/**
 * MCP-compatible SSE + JSON-RPC bridge for Teampal <-> Pipedream <-> Reddit
 * Deploy on Render.com as a Node.js web service
 */

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 🔧 Replace with your actual Pipedream workflow URL
const PIPEDREAM_WEBHOOK_URL = "https://eoxxx.m.pipedream.net"; 

// --- SSE HANDSHAKE (required by Teampal MCP) ---
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log("Teampal connected via SSE");

  // Initial handshake to satisfy MCP
  res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result: "connected" })}\n\n`);

  // Keep alive ping every 15 seconds
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", id: 0, method: "ping" })}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
    console.log("Teampal SSE connection closed");
  });
});

// --- HANDLE ACTION CALLS ---
app.post("/", async (req, res) => {
  const { id, method, params } = req.body;

  console.log("Incoming JSON-RPC from Teampal:", method, params);

  try {
    // Forward to your Pipedream workflow (acts as Reddit logic)
    const response = await fetch(PIPEDREAM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params }),
    });

    const result = await response.json().catch(() => ({}));

    res.json({ jsonrpc: "2.0", id, result: result || { ok: true } });
  } catch (err) {
    console.error("Error forwarding to Pipedream:", err);
    res.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: err.message || "Pipedream error" },
    });
  }
});

// --- BASIC HEALTH CHECK ---
app.get("/health", (req, res) => {
  res.status(200).send("MCP SSE bridge is healthy");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ MCP bridge running on port ${PORT}`));

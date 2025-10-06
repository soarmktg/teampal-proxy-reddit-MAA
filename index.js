/**
 * TeamPal MCP Bridge (CommonJS version for Render)
 * Reddit → Pipedream → TeamPal via SSE + JSON-RPC
 */

const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Replace with your actual Pipedream webhook URL
const PIPEDREAM_WEBHOOK_URL = "https://eoxxx.m.pipedream.net";

// SSE stream endpoint
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log("✅ Teampal connected via SSE");

  res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result: "connected" })}\n\n`);

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", id: 0, method: "ping" })}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
    console.log("❌ Teampal SSE connection closed");
  });
});

// JSON-RPC handler
app.post("/", async (req, res) => {
  const { id, method, params } = req.body;
  console.log("Incoming JSON-RPC from Teampal:", method, params);

  // Handle MCP initialize handshake
  if (method === "initialize") {
    const result = {
      protocolVersion: "2025-03-26",
      capabilities: { tools: { listChanged: true } },
      serverInfo: { name: "reddit-mcp-bridge", version: "1.0.0" }
    };
    console.log("✅ Responding to initialize handshake");
    return res.json({ jsonrpc: "2.0", id, result });
  }

  // Forward to Pipedream
  try {
    const response = await fetch(PIPEDREAM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params })
    });

    const result = await response.json().catch(() => ({}));
    res.json({ jsonrpc: "2.0", id, result: result || { ok: true } });
  } catch (err) {
    console.error("Error forwarding to Pipedream:", err);
    res.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: err.message || "Pipedream error" }
    });
  }
});

app.get("/health", (req, res) => res.status(200).send("MCP SSE bridge is healthy"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 MCP bridge running on port ${PORT}`));

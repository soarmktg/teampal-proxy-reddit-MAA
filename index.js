/**
 * TeamPal MCP Bridge (Render-ready, CommonJS, Node 24.x)
 * Reddit → Pipedream → TeamPal via HTTP Streamable JSON-RPC
 */

const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔧 Replace this with your actual Pipedream webhook
const PIPEDREAM_WEBHOOK_URL = "https://eoxveo4ymtvm7s8.m.pipedream.net";

/* ────────────────────────────────
   SSE / HTTP Streamable endpoint
──────────────────────────────── */
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log("✅ Teampal connected via SSE");

  res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", id: 0, result: "connected" })}\n\n`);

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", id: 0, method: "ping" })}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
    console.log("❌ Teampal SSE connection closed");
  });
});

/* ────────────────────────────────
   JSON-RPC Endpoint
──────────────────────────────── */
app.post("/", async (req, res) => {
  const { id, method, params } = req.body;
  console.log("Incoming JSON-RPC from Teampal:", method);

  // 1️⃣ initialize handshake
  if (method === "initialize") {
    const result = {
      protocolVersion: "2025-03-26",
      capabilities: { tools: { listChanged: true } },
      serverInfo: { name: "reddit-mcp-bridge", version: "1.1.0" }
    };
    console.log("✅ Responding to initialize handshake");
    return res.json({ jsonrpc: "2.0", id, result });
  }

  // 2️⃣ notifications/initialized
  if (method === "notifications/initialized") {
    console.log("✅ Acknowledged notifications/initialized");
    return res.json({ jsonrpc: "2.0", id, result: { ok: true } });
  }

  // 3️⃣ tools/list
  if (method === "tools/list") {
    console.log("✅ Responding with tool list");
    const result = {
      tools: [
        {
          name: "reddit_comment",
          description: "Post a comment on a Reddit post.",
          inputSchema: {
            type: "object",
            properties: {
              postId: { type: "string" },
              comment: { type: "string" }
            },
            required: ["postId", "comment"]
          }
        },
        {
          name: "reddit_post",
          description: "Create a new Reddit post.",
          inputSchema: {
            type: "object",
            properties: {
              subreddit: { type: "string" },
              title: { type: "string" },
              body: { type: "string" }
            },
            required: ["subreddit", "title"]
          }
        },
        {
          name: "reddit_search",
          description: "Search posts in a subreddit.",
          inputSchema: {
            type: "object",
            properties: {
              subreddit: { type: "string" },
              query: { type: "string" }
            },
            required: ["query"]
          }
        },
        {
          name: "reddit_message",
          description: "Send a private message to a Reddit user.",
          inputSchema: {
            type: "object",
            properties: {
              username: { type: "string" },
              subject: { type: "string" },
              message: { type: "string" }
            },
            required: ["username", "message"]
          }
        }
      ]
    };
    return res.json({ jsonrpc: "2.0", id, result });
  }

  // 4️⃣ tools/call → execute via Pipedream
  if (method === "tools/call" && params?.name) {
    const { name, arguments: args } = params;
    console.log(`🛠 Executing tool: ${name}`);

    try {
      const response = await fetch(PIPEDREAM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: name, args })
      });

      const result = await response.json().catch(() => ({}));
      return res.json({ jsonrpc: "2.0", id, result });
    } catch (err) {
      console.error("❌ Error executing tool:", err);
      return res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: err.message || "Pipedream error" }
      });
    }
  }

  // 5️⃣ fallback
  console.warn("⚠️ Unknown method:", method);
  return res.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Method not found" }
  });
});

/* ────────────────────────────────
   Health Check
──────────────────────────────── */
app.get("/health", (_, res) => res.status(200).send("MCP SSE bridge is healthy"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 MCP bridge running on port ${PORT}`));

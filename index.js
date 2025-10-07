import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 10000;

// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());

// ===== Pipedream Webhook =====
const PIPEDREAM_WEBHOOK_URL =
  process.env.PIPEDREAM_URL || "https://eoxveo4ymtvm7s8.m.pipedream.net";
console.log(`✅ Connected to Pipedream webhook: ${PIPEDREAM_WEBHOOK_URL}`);

// ===== SSE Connection =====
let clients = [];

app.get("/", (req, res) => {
  res.send("✅ TeamPal Reddit MCP Bridge is live.");
});

app.get("/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const client = { id: Date.now(), res };
  clients.push(client);
  console.log(`🟢 SSE client connected (${clients.length} total)`);

  res.write(`data: ${JSON.stringify({ message: "connected" })}\n\n`);

  req.on("close", () => {
    console.log(`🔴 SSE client disconnected`);
    clients = clients.filter((c) => c.id !== client.id);
  });
});

// ===== Manual Test Route =====
app.get("/test", async (req, res) => {
  try {
    console.log("🔍 Testing full connection to Pipedream + Reddit agent...");

    const testPayload = {
      body: {
        event: {
          body: {
            method: "reddit.search_posts",
            params: {
              subreddit: "Construction",
              query: "estimate",
              limit: 3
            }
          }
        }
      }
    };

    const pdResponse = await axios.post(PIPEDREAM_WEBHOOK_URL, testPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    console.log("✅ Pipedream Response:", pdResponse.data);
    res.send(`✅ Pipedream responded: ${JSON.stringify(pdResponse.data)}`);
  } catch (err) {
    console.error("❌ Error contacting Pipedream:", err.message);
    res.send(`❌ Error contacting Pipedream: ${err.message}`);
  }
});


// ===== JSON-RPC Endpoint =====
app.post("/", async (req, res) => {
  const body = req.body;
  const method = body.method;

  console.log("📥 Incoming JSON-RPC:", method);

  try {
    // 1️⃣ Initialize
    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        id: body.id || null,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: { sampling: {}, roots: { listChanged: true } },
          clientInfo: { name: "mcp", version: "0.1.0" },
        },
      });
    }

    // 2️⃣ Tool list
    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        id: body.id || null,
        result: {
          tools: [
            {
              name: "reddit_search",
              description: "Search Reddit posts by keyword or subreddit.",
              input_schema: {
                type: "object",
                properties: {
                  subreddit: { type: "string" },
                  query: { type: "string" },
                  limit: { type: "number" },
                },
              },
            },
          ],
        },
      });
    }

    // 3️⃣ Tool execution
    if (method === "tools/call") {
      console.log("⚙️ Executing tool:", body.params?.name);
      const payload = body.params || body;
      console.log("➡️ Forwarding payload to Pipedream:", payload);

      try {
        const pdResponse = await axios.post(PIPEDREAM_WEBHOOK_URL, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 20000,
        });

        const data = pdResponse.data;
        console.log("✅ Pipedream responded:", data.message || "No message");

        return res.json({
          jsonrpc: "2.0",
          id: body.id || null,
          result: {
            success: data.success || false,
            message: data.message || "No message received.",
            results: data.results || [],
          },
        });
      } catch (err) {
        console.error("❌ Pipedream call failed:", err.message);
        return res.json({
          jsonrpc: "2.0",
          id: body.id || null,
          error: {
            code: -32000,
            message: `Pipedream request failed: ${err.message}`,
          },
        });
      }
    }

    // 4️⃣ Unknown method
    return res.json({
      jsonrpc: "2.0",
      id: body.id || null,
      error: { code: -32601, message: `Unknown method: ${method}` },
    });
  } catch (err) {
    console.error("💥 MCP Bridge Error:", err.message);
    return res.json({
      jsonrpc: "2.0",
      id: body.id || null,
      error: { code: -32000, message: err.message },
    });
  }
});

// ===== Keep-alive Ping =====
setInterval(() => {
  clients.forEach((client) => {
    client.res.write(`data: ${JSON.stringify({ message: "ping" })}\n\n`);
  });
}, 15000);

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🚀 MCP bridge running on port ${PORT}`);
  console.log(`✅ TeamPal connected via SSE`);
  console.log(`🌐 Available at: https://teampal-proxy-reddit-maa.onrender.com`);
});

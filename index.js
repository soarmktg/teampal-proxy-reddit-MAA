import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ===== CONFIG =====
const PORT = process.env.PORT || 10000;
const PIPEDREAM_WEBHOOK_URL = "https://eoxveo4ymtvm7s8.m.pipedream.net"; // ✅ Replace with your actual Pipedream webhook

// ===== STARTUP LOG =====
app.listen(PORT, () => {
  console.log("✅ MCP bridge running on port", PORT);
  console.log("✅ Connected to Pipedream webhook:", PIPEDREAM_WEBHOOK_URL);
  console.log("✅ Available at: https://teampal-proxy-reddit-maa.onrender.com");
});

// ===== MANUAL TEST ROUTE =====
app.get("/test", async (req, res) => {
  try {
    console.log("🧩 Testing full connection to Pipedream + Reddit agent...");

    // ✅ Simplified payload (no nested 'event' wrapper)
    const testPayload = {
      method: "reddit.search_posts",
      params: {
        subreddit: "Construction",
        query: "estimate",
        limit: 3,
      },
    };

    console.log("📦 Sending payload to Pipedream:", JSON.stringify(testPayload, null, 2));

    const pdResponse = await axios.post(PIPEDREAM_WEBHOOK_URL, testPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    // ✅ Handle both plain and nested responses from Pipedream
    const responseData = pdResponse.data?.body || pdResponse.data;
    console.log("✅ Pipedream returned:", responseData);

    res.status(200).json({
      success: true,
      message: "🟢 Connection successful — Render ↔ Pipedream working!",
      data: responseData,
    });
  } catch (err) {
    console.error("❌ Error contacting Pipedream:", err.message);
    const errorData = err.response?.data || err.message;
    res
      .status(500)
      .json({ success: false, message: `Error contacting Pipedream: ${errorData}` });
  }
});

// ===== JSON-RPC ENDPOINT (for TeamPal MCP) =====
app.post("/", async (req, res) => {
  try {
    const body = req.body;
    const method = body?.method || "initialize";
    const params = body?.params || {};

    console.log("🔗 Incoming JSON-RPC:", { method, params });

    // ✅ Send directly to Pipedream (no extra nesting)
    const eventPayload = {
      method,
      params,
    };

    const pdResponse = await axios.post(PIPEDREAM_WEBHOOK_URL, eventPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    const responseData = pdResponse.data?.body || pdResponse.data;

    console.log("✅ Pipedream response to JSON-RPC:", responseData);

    res.status(200).json({
      jsonrpc: "2.0",
      id: body.id || 0,
      result: responseData,
    });
  } catch (err) {
    console.error("💥 JSON-RPC Error:", err.message);
    const errorData = err.response?.data || err.message;
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id || 0,
      error: {
        code: -32000,
        message: `Error contacting Pipedream: ${errorData}`,
      },
    });
  }
});

// ===== HEALTHCHECK =====
app.get("/", (req, res) => {
  res.send("✅ TeamPal Reddit MCP proxy is running!");
});

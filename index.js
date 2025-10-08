// ===============================
// ✅ TeamPal Reddit Proxy (Diagnostic + Fallback)
// ===============================

import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// 🔧 Your Pipedream HTTP trigger URL
const PIPEDREAM_WEBHOOK_URL = "https://eoxveo4ymtvm7s8.m.pipedream.net";

// ---------- helpers ----------
function now() {
  return new Date().toISOString();
}

function log(title, obj) {
  console.log(`\n[${now()}] ${title}:\n${typeof obj === "string" ? obj : JSON.stringify(obj, null, 2)}\n`);
}

async function postToPipedream(payload) {
  // Do NOT throw on 4xx/5xx — we need the body
  return axios.post(PIPEDREAM_WEBHOOK_URL, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
    validateStatus: () => true,
  });
}

// Sends preferred shape, then falls back to legacy wrapper if needed.
async function sendWithFallback(method, params) {
  const shapeA = { method, params };
  log("📦 Sending payload (A)", shapeA);

  let resp = await postToPipedream(shapeA);
  log("📨 Pipedream response (A) status", resp.status);
  log("📨 Pipedream response (A) body", resp.data);

  if (resp.status < 400) return { shape: "A", resp };

  const shapeB = { event: { body: { method, params } } };
  log("📦 Retrying with payload (B)", shapeB);

  resp = await postToPipedream(shapeB);
  log("📨 Pipedream response (B) status", resp.status);
  log("📨 Pipedream response (B) body", resp.data);

  return { shape: "B", resp };
}

// ---------- routes ----------
app.get("/", (_req, res) => {
  res.send("🟢 TeamPal Reddit Proxy is running!");
});

// Simple smoke test
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: now() });
});

// Manual test exercise
app.get("/test", async (_req, res) => {
  try {
    log("🧩 Testing full connection to Pipedream + Reddit agent", "");

    const method = "reddit.search_posts";
    const params = { subreddit: "Construction", query: "estimate", limit: 3 };

    const { shape, resp } = await sendWithFallback(method, params);

    const body = resp?.data?.body ?? resp?.data;
    const ok = resp.status < 400;

    return res.status(ok ? 200 : 502).json({
      success: ok,
      used_shape: shape,
      status_from_pipedream: resp.status,
      message: ok
        ? "🟢 Connection successful — Render ↔ Pipedream working!"
        : "🔴 Pipedream returned an error (see details)",
      data: body,
    });
  } catch (err) {
    log("❌ Error contacting Pipedream", err?.message || err);
    return res.status(500).json({
      success: false,
      message: `Error contacting Pipedream: ${err?.message || String(err)}`,
    });
  }
});

// Main proxy endpoint TeamPal will call
app.post("/", async (req, res) => {
  try {
    const incoming = req.body || {};
    log("📥 Incoming request from TeamPal (raw)", incoming);

    // Accept both { method, params } and { body: { method, params } }
    const method = incoming?.method ?? incoming?.body?.method;
    const params = incoming?.params ?? incoming?.body?.params ?? {};

    if (!method) {
      return res.status(400).json({
        success: false,
        message: "Missing 'method' in request body",
        example: { method: "reddit.search_posts", params: { subreddit: "Construction", query: "estimate", limit: 3 } },
      });
    }

    const { shape, resp } = await sendWithFallback(method, params);

    const body = resp?.data?.body ?? resp?.data;
    const ok = resp.status < 400;

    return res.status(ok ? 200 : 502).json({
      success: ok,
      used_shape: shape,
      status_from_pipedream: resp.status,
      message: ok ? "✅ Forwarded successfully to Pipedream." : "🔴 Pipedream returned an error (see details)",
      data: body,
    });
  } catch (err) {
    log("❌ Error contacting Pipedream", err?.message || err);
    return res.status(500).json({
      success: false,
      message: `Error contacting Pipedream: ${err?.message || String(err)}`,
    });
  }
});

// ---------- start ----------
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("🌐 Ready at: https://teampal-proxy-reddit-maa.onrender.com");
});

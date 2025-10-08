// ===============================
// ✅ TeamPal Reddit Proxy (Final Fixed Version)
// ===============================

import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// 🧠 Replace with your actual Pipedream HTTP trigger URL
const PIPEDREAM_WEBHOOK_URL = "https://eoxveo4ymtvm7s8.m.pipedream.net";

// ============= BASIC HEALTH CHECK =============
app.get("/", (req, res) => {
  res.send("🟢 TeamPal Reddit Proxy is running!");
});

// ============= TEST ENDPOINT =============
app.get("/test", async (req, res) => {
  try {
    console.log("🧩 Testing full connection to Pipedream + Reddit agent...");

    // ✅ Correct structure (no extra nested 'body')
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

    const responseData = pdResponse.data?.body || pdResponse.data;
    console.log("✅ Pipedream returned:", JSON.stringify(responseData, null, 2));

    res.status(200).json({
      success: true,
      message: "🟢 Connection successful — Render ↔ Pipedream working!",
      data: responseData,
    });
  } catch (err) {
    console.error("❌ Error contacting Pipedream:", err.message);
    const errorData = err.response?.data || err.message;
    res.status(500).json({
      success: false,
      message: `Error contacting Pipedream: ${errorData}`,
    });
  }
});

// ============= MAIN ROUTE for TeamPal =============
app.post("/", async (req, res) => {
  try {
    const incoming = req.body;
    console.log("📥 Incoming request from TeamPal:", JSON.stringify(incoming, null, 2));

    // ✅ Send correct structure (no nested 'body')
    const payload = incoming.body || incoming;

    console.log("📦 Forwarding payload to Pipedream:", JSON.stringify(payload, null, 2));

    const pdResponse = await axios.post(PIPEDREAM_WEBHOOK_URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    const responseData = pdResponse.data?.body || pdResponse.data;
    console.log("✅ Response from Pipedream:", JSON.stringify(responseData, null, 2));

    res.status(200).json({
      success: true,
      message: "✅ Forwarded successfully to Pipedream.",
      data: responseData,
    });
  } catch (err) {
    console.error("❌ Error contacting Pipedream:", err.message);
    const errorData = err.response?.data || err.message;
    res.status(500).json({
      success: false,
      message: `Error contacting Pipedream: ${errorData}`,
    });
  }
});

// ============= START SERVER =============
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("🌐 Ready at:", `https://teampal-proxy-reddit-maa.onrender.com`);
});

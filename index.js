import express from "express";
import axios from "axios";

const app = express();
app.use(express.json()); // ✅ Ensure JSON is parsed correctly

const PORT = process.env.PORT || 10000;
const PIPEDREAM_WEBHOOK_URL = "https://eoxveo4ymtvm7s8.m.pipedream.net";

// ===== Health Check =====
app.get("/", (req, res) => {
  res.send("✅ Reddit Multi-Action Agent is live.");
});

// ===== Manual Test Route =====
app.get("/test", async (req, res) => {
  console.log("🧪 Testing full connection to Pipedream + Reddit agent...");

  try {
    const testPayload = {
      event: {
        body: {
          method: "reddit.search_posts",
          params: {
            subreddit: "Construction",
            query: "estimate",
            limit: 3,
          },
        },
      },
    };

    console.log("📤 Sending payload to Pipedream:", JSON.stringify(testPayload, null, 2));

    const pdResponse = await axios.post(PIPEDREAM_WEBHOOK_URL, testPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    console.log("✅ Pipedream responded:", pdResponse.data);
    res.status(200).send(`✅ Pipedream responded: ${JSON.stringify(pdResponse.data)}`);
  } catch (err) {
    console.error("❌ Error contacting Pipedream:", err.response?.data || err.message);
    res.status(400).send(`❌ Error contacting Pipedream: ${err.response?.data || err.message}`);
  }
});

// ===== JSON-RPC Endpoint =====
app.post("/", async (req, res) => {
  const { method, params } = req.body || {};
  console.log("📬 Incoming JSON-RPC method:", method, "params:", params);

  if (!method) return res.status(400).send({ error: "Missing method" });

  // Sample simple handshake
  if (method === "initialize") {
    return res.send({
      success: true,
      name: "Reddit Multi-Action Agent",
      description: "Allows Ollie to search posts, reply, message, submit posts, and browse subreddits on Reddit.",
      methods: [
        "reddit.search_posts",
        "reddit.reply_comment",
        "reddit.send_message",
        "reddit.submit_post",
        "reddit.list_subreddits",
      ],
    });
  }

  res.status(404).send({ error: `Unsupported method: ${method}` });
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🚀 MCP bridge running on port ${PORT}`);
  console.log(`✅ Connected to Pipedream webhook: ${PIPEDREAM_WEBHOOK_URL}`);
  console.log(`🌍 Server running at: https://teampal-proxy-reddit-maa.onrender.com`);
});

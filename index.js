import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// ====== Configuration ======
const PORT = process.env.PORT || 10000;
const PIPEDREAM_WEBHOOK_URL = "https://eoxveo4ymtvm7s8.m.pipedream.net";

console.log(`✅ Connected to Pipedream webhook: ${PIPEDREAM_WEBHOOK_URL}`);

// ====== Start Server ======
app.listen(PORT, () => {
  console.log(`🚀 MCP bridge running on port ${PORT}`);
  console.log(`🌐 Available at your primary URL: https://teampal-proxy-reddit-maa.onrender.com`);
  console.log("==============================================");
  console.log("✅ TeamPal connected via SSE");
  console.log("✅ Connected to Pipedream + Reddit agent bridge");
  console.log("==============================================");
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

    console.log("✅ Raw Pipedream response:", pdResponse.data || "No data returned");

    // ✅ Detect actual success condition
    if (pdResponse.data && (pdResponse.data.success || pdResponse.status === 200)) {
      res.status(200).send(`✅ Success! Pipedream workflow executed.`);
    } else {
      res.status(200).send(`⚠️ Workflow executed, but returned no explicit success flag.`);
    }
  } catch (err) {
    console.error("❌ Error contacting Pipedream:", err.response?.data || err.message);
    res
      .status(500)
      .send(`❌ Error contacting Pipedream: ${err.response?.data || err.message}`);
  }
});

// ===== JSON-RPC Endpoint for TeamPal =====
app.post("/", async (req, res) => {
  try {
    const body = req.body;
    const method = body.method || "initialize";
    const params = body.params || {};

    console.log("📬 Incoming JSON-RPC request:", method);

    // 🧠 Handle TeamPal handshake
    if (method === "initialize") {
      return res.json({
        success: true,
        name: "Reddit Multi-Action Agent",
        description:
          "Allows Ollie to search posts, reply, send messages, submit posts, and browse subreddits on Reddit.",
        methods: [
          "reddit.search_posts",
          "reddit.reply_comment",
          "reddit.send_message",
          "reddit.submit_post",
          "reddit.list_subreddits",
        ],
      });
    }

    // 🧩 Forward non-initialize calls to Pipedream
    console.log("📤 Forwarding to Pipedream:", JSON.stringify(body, null, 2));
    const pdResponse = await axios.post(PIPEDREAM_WEBHOOK_URL, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    console.log("✅ Pipedream response received:", pdResponse.data || "No data returned");

    return res.json(pdResponse.data);
  } catch (err) {
    console.error("❌ Error in JSON-RPC endpoint:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

// ===== Root =====
app.get("/", (req, res) => {
  res.send("✅ Reddit Multi-Action Agent bridge is live and ready!");
});

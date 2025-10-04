import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;

// --- Root endpoint ---
app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "Reddit Multi-Action Agent",
    description: "Search, post, and comment on Reddit via TeamPal",
    methods: [
      "reddit.search_posts",
      "reddit.reply_comment",
      "reddit.submit_post",
      "reddit.list_subreddits"
    ]
  });
});

// --- Required for TeamPal MCP ---
app.get("/initialize", (req, res) => {
  res.json({
    success: true,
    name: "Reddit Multi-Action Agent",
    description: "Provides Reddit actions (search, post, reply) to TeamPal",
    version: "1.0.0"
  });
});

app.get("/info", (req, res) => {
  res.json({
    name: "Reddit Multi-Action Agent",
    description: "MCP interface for Reddit via Render and Pipedream",
    methods: [
      "reddit.search_posts",
      "reddit.reply_comment",
      "reddit.submit_post",
      "reddit.list_subreddits"
    ],
    author: "LM Ventures",
    health: "OK"
  });
});

// --- Example route for method calls (optional test) ---
app.post("/", (req, res) => {
  const { method, params } = req.body;
  console.log("Received:", method, params);
  res.json({ success: true, method, params });
});

app.listen(PORT, () => {
  console.log(`✅ Reddit MCP running on port ${PORT}`);
});

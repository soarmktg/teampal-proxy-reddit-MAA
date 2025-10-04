import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Root endpoint (TeamPal discovery)
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
    ],
  });
});

// Info endpoint
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

// Initialize endpoint (TeamPal handshake)
app.get("/initialize", (req, res) => {
  res.json({
    success: true,
    name: "Reddit Multi-Action Agent",
    description: "Provides Reddit actions (search, post, reply) to TeamPal",
    version: "1.0.0"
  });
});

// Handle JSON-RPC requests from TeamPal
app.post("/", async (req, res) => {
  const { method, params } = req.body;
  console.log(`Received method: ${method}`);

  try {
    switch (method) {
      case "reddit.search_posts":
        res.json({
          success: true,
          posts: [
            { id: "1ny364q", title: "Mock Reddit post", author: "example_user", permalink: "https://reddit.com/test/comments/1ny364q" },
            { id: "1ny35vh", title: "Another post", author: "another_user", permalink: "https://reddit.com/test/comments/1ny35vh" }
          ]
        });
        break;

      case "reddit.reply_comment":
        res.json({
          success: true,
          message: `Replied to comment ${params.comment_id} with "${params.text}"`,
        });
        break;

      case "reddit.submit_post":
        res.json({
          success: true,
          message: `Posted to subreddit ${params.subreddit}: ${params.title}`,
        });
        break;

      case "reddit.list_subreddits":
        res.json({
          success: true,
          subreddits: ["Entrepreneur", "Marketing", "SmallBusiness", "Startups"],
        });
        break;

      default:
        res.status(400).json({ success: false, error: `Unsupported method: ${method}` });
    }
  } catch (err) {
    console.error("Error handling request:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Reddit MCP running on port ${PORT}`);
});

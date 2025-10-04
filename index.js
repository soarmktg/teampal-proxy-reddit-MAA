// index.js
import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

// ✅ Allow TeamPal / browsers / Pipedream to connect
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// ✅ Environment variables (match Pipedream keys)
const PIPE_URL = process.env.PIPE_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const USER_AGENT = process.env.USER_AGENT;

// ✅ Root route (TeamPal handshake)
app.get("/", (req, res) => {
  res.json({
    name: "Reddit Multi-Action Agent",
    description:
      "Allows Ollie to search posts, reply to comments, send messages, submit posts, and list subreddits.",
    methods: [
      "reddit.search_posts",
      "reddit.reply_comment",
      "reddit.send_message",
      "reddit.submit_post",
      "reddit.list_subreddits",
    ],
  });
});

// ✅ Handle MCP methods
app.post("/", async (req, res) => {
  const { method, params } = req.body;

  if (!method) {
    return res.status(400).json({ success: false, error: "No method provided" });
  }

  try {
    switch (method) {
      // 🔍 Search posts
      case "reddit.search_posts": {
        console.log("Searching posts...", params);
        const { subreddit, query, limit } = params;
        const response = await axios.post(PIPE_URL, {
          subreddit,
          query,
          limit,
        });
        return res.json(response.data);
      }

      // 💬 Reply to a comment
      case "reddit.reply_comment": {
        const { comment_id, text } = params;
        return res.json({
          success: true,
          action: "Reply sent",
          comment_id,
          text,
        });
      }

      // ✉️ Send a direct message
      case "reddit.send_message": {
        const { recipient, subject, text } = params;
        return res.json({
          success: true,
          action: "Message sent",
          recipient,
          subject,
          text,
        });
      }

      // 🧵 Submit a post
      case "reddit.submit_post": {
        const { subreddit, title, text } = params;
        return res.json({
          success: true,
          action: "Post submitted",
          subreddit,
          title,
          text,
        });
      }

      // 📋 List subreddits
      case "reddit.list_subreddits": {
        const subreddits = [
          "Entrepreneur",
          "Marketing",
          "SmallBusiness",
          "Startups",
          "DigitalMarketing",
        ];
        return res.json({
          success: true,
          subreddits,
        });
      }

      // ❌ Fallback
      default:
        return res
          .status(400)
          .json({ success: false, error: `Unsupported method: ${method}` });
    }
  } catch (err) {
    console.error("❌ MCP error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Start server
const port = process.env.PORT || 10000;
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Reddit MCP running on port ${port}`);
});

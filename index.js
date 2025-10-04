import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// === Environment variables ===
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const USER_AGENT = process.env.USER_AGENT;
const PIPE_URL = process.env.PIPE_URL;

// === Helper: Get Reddit Access Token ===
async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=password&username=${USERNAME}&password=${PASSWORD}`,
  });

  if (!res.ok) throw new Error(`Failed to get token: ${res.statusText}`);
  const data = await res.json();
  return data.access_token;
}

// === MCP “initialize” route (required by TeamPal) ===
app.post("/", async (req, res) => {
  const { method, params } = req.body || {};

  // Handle TeamPal MCP initialization
  if (method === "initialize" || !method) {
    return res.json({
      success: true,
      name: "Reddit Multi-Action Agent",
      description: "Allows Ollie to search posts, reply, message, and post on Reddit.",
      methods: [
        "reddit.search_posts",
        "reddit.reply_comment",
        "reddit.send_message",
        "reddit.submit_post",
        "reddit.list_subreddits"
      ],
    });
  }

  try {
    switch (method) {
      // === Search Reddit posts ===
      case "reddit.search_posts": {
        const token = await getAccessToken();
        const { subreddit, query, limit } = params;
        const url = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance`;
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "User-Agent": USER_AGENT,
          },
        });
        const json = await response.json();
        const posts = json.data.children.map(post => ({
          id: post.data.id,
          title: post.data.title,
          author: post.data.author,
          permalink: `https://reddit.com${post.data.permalink}`,
        }));
        return res.json({ success: true, posts });
      }

      // === Reply to a comment ===
      case "reddit.reply_comment": {
        const token = await getAccessToken();
        const { parent_id, text } = params;
        const response = await fetch("https://oauth.reddit.com/api/comment", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `thing_id=${parent_id}&text=${encodeURIComponent(text)}`,
        });
        const result = await response.json();
        return res.json({ success: true, result });
      }

      // === Send a private message ===
      case "reddit.send_message": {
        const token = await getAccessToken();
        const { to, subject, text } = params;
        const response = await fetch("https://oauth.reddit.com/api/compose", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `to=${to}&subject=${encodeURIComponent(subject)}&text=${encodeURIComponent(text)}`,
        });
        const result = await response.json();
        return res.json({ success: true, result });
      }

      // === Submit a new Reddit post ===
      case "reddit.submit_post": {
        const token = await getAccessToken();
        const { subreddit, title, text } = params;
        const response = await fetch("https://oauth.reddit.com/api/submit", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `sr=${subreddit}&title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}&kind=self`,
        });
        const result = await response.json();
        return res.json({ success: true, result });
      }

      // === List subreddits ===
      case "reddit.list_subreddits": {
        const token = await getAccessToken();
        const response = await fetch("https://oauth.reddit.com/subreddits/mine/subscriber", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "User-Agent": USER_AGENT,
          },
        });
        const json = await response.json();
        const subs = json.data.children.map(sub => sub.data.display_name);
        return res.json({ success: true, subreddits: subs });
      }

      default:
        return res.status(400).json({ error: `Unsupported method: ${method}` });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// === Start server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Reddit MCP running on port ${PORT}`));

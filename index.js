import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// 🔧 Environment variables (from Render dashboard)
const {
  CLIENT_ID,
  CLIENT_SECRET,
  USERNAME,
  PASSWORD,
  USER_AGENT,
  PIPE_URL
} = process.env;

// 🔐 Get Reddit access token
async function getAccessToken() {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const params = new URLSearchParams({
    grant_type: "password",
    username: USERNAME,
    password: PASSWORD
  });

  const response = await axios.post("https://www.reddit.com/api/v1/access_token", params, {
    headers: {
      Authorization: `Basic ${credentials}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  return response.data.access_token;
}

// 🧩 MCP Methods Implementation
const MCP_METHODS = {
  // 1️⃣ Search posts
  "reddit.search_posts": async (params) => {
    const token = await getAccessToken();
    const { subreddit, query, limit = 5 } = params;

    const url = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT }
    });

    const posts = res.data.data.children.map((p) => ({
      id: p.data.id,
      title: p.data.title,
      author: p.data.author,
      permalink: `https://reddit.com${p.data.permalink}`
    }));

    return { success: true, posts };
  },

  // 2️⃣ Reply to comment
  "reddit.reply_comment": async (params) => {
    const token = await getAccessToken();
    const { parent_id, text } = params;

    const response = await axios.post(
      "https://oauth.reddit.com/api/comment",
      new URLSearchParams({ api_type: "json", text, thing_id: parent_id }),
      { headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT } }
    );

    return { success: true, data: response.data };
  },

  // 3️⃣ Submit a post
  "reddit.submit_post": async (params) => {
    const token = await getAccessToken();
    const { subreddit, title, text } = params;

    const response = await axios.post(
      "https://oauth.reddit.com/api/submit",
      new URLSearchParams({ sr: subreddit, kind: "self", title, text }),
      { headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT } }
    );

    return { success: true, data: response.data };
  },

  // 4️⃣ List subreddits (user subscribed)
  "reddit.list_subreddits": async () => {
    const token = await getAccessToken();
    const res = await axios.get("https://oauth.reddit.com/subreddits/mine/subscriber", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT }
    });

    const subs = res.data.data.children.map((s) => s.data.display_name);
    return { success: true, subreddits: subs };
  }
};

// 🔁 MCP Router (handles method dispatch)
app.post("/", async (req, res) => {
  try {
    const { method, params } = req.body;
    if (!method || !MCP_METHODS[method]) {
      return res.status(400).json({ success: false, error: "Unsupported or missing method" });
    }

    const result = await MCP_METHODS[method](params || {});
    res.json(result);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🧠 MCP Descriptor endpoint (TeamPal reads this)
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(
    JSON.stringify(
      {
        success: true,
        name: "Reddit Multi-Action Agent",
        description: "Search, post, and comment on Reddit via TeamPal",
        methods: [
          "reddit.search_posts",
          "reddit.reply_comment",
          "reddit.submit_post",
          "reddit.list_subreddits"
        ]
      },
      null,
      2
    )
  );
});

// ❤️ Health check (TeamPal or Render)
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Reddit MCP" });
});

// ⚙️ HEAD support (TeamPal sometimes sends HEAD before GET)
app.head("/", (req, res) => {
  res.status(200).end();
});

// 🚀 Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Reddit MCP running on port ${PORT}`));

import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

app.post("/", async (req, res) => {
  try {
    const PIPE_URL = process.env.PIPE_URL;
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const USERNAME = process.env.USERNAME;
    const PASSWORD = process.env.PASSWORD;
    const USER_AGENT = process.env.USER_AGENT;

    if (!CLIENT_ID || !CLIENT_SECRET || !USERNAME || !PASSWORD || !USER_AGENT) {
      return res.status(400).json({
        success: false,
        error: "Missing Reddit credentials in environment variables.",
      });
    }

    const body = req.body;
    if (!body || !body.method) {
      return res.status(400).json({
        success: false,
        error: "No method provided in request body.",
      });
    }

    const method = body.method;
    const params = body.params || {};

    console.log("🔹 Method:", method);
    console.log("🔹 Params:", params);

    // Authenticate to Reddit
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const tokenResponse = await axios.post(
      "https://www.reddit.com/api/v1/access_token",
      new URLSearchParams({
        grant_type: "password",
        username: USERNAME,
        password: PASSWORD,
      }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log("✅ Reddit Access Token Acquired");

    // ============ HANDLERS ============
    if (method === "reddit.search_posts") {
      const { subreddit, query, limit } = params;
      const response = await axios.get(
        `https://oauth.reddit.com/r/${subreddit}/search?q=${query}&limit=${limit}&sort=new`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": USER_AGENT,
          },
        }
      );

      return res.json({
        success: true,
        posts: response.data.data.children.map((p) => ({
          id: p.data.id,
          title: p.data.title,
          author: p.data.author,
          permalink: `https://reddit.com${p.data.permalink}`,
        })),
      });
    }

    if (method === "reddit.reply_comment") {
      const { parent_id, text } = params;
      const response = await axios.post(
        "https://oauth.reddit.com/api/comment",
        new URLSearchParams({
          thing_id: parent_id,
          text,
        }),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": USER_AGENT,
          },
        }
      );

      return res.json({ success: true, reply: response.data });
    }

    if (method === "reddit.submit_post") {
      const { subreddit, title, text } = params;
      const response = await axios.post(
        "https://oauth.reddit.com/api/submit",
        new URLSearchParams({
          sr: subreddit,
          title,
          text,
          kind: "self",
        }),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": USER_AGENT,
          },
        }
      );

      return res.json({ success: true, post: response.data });
    }

    if (method === "reddit.send_message") {
      const { to, subject, message } = params;
      const response = await axios.post(
        "https://oauth.reddit.com/api/compose",
        new URLSearchParams({
          to,
          subject,
          text: message,
        }),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": USER_AGENT,
          },
        }
      );

      return res.json({ success: true, message: response.data });
    }

    if (method === "reddit.list_subreddits") {
      const response = await axios.get(
        "https://oauth.reddit.com/subreddits/mine/subscriber",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": USER_AGENT,
          },
        }
      );

      return res.json({
        success: true,
        subreddits: response.data.data.children.map(
          (s) => s.data.display_name
        ),
      });
    }

    return res.status(400).json({
      success: false,
      error: `Unsupported method: ${method}`,
    });
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 MCP Reddit Proxy running on port ${PORT}`);
});

import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// ✅ MCP-compatible methods
const methods = {
  "reddit.search_posts": async (params) => {
    console.log("Searching posts...", params);
    return {
      success: true,
      posts: [
        {
          id: "1ny364q",
          title: "Mock Reddit post 1",
          author: "example_user",
          permalink: "https://reddit.com/r/test/comments/1ny364q/"
        },
        {
          id: "1ny35vh",
          title: "Mock Reddit post 2",
          author: "another_user",
          permalink: "https://reddit.com/r/test/comments/1ny35vh/"
        }
      ]
    };
  },

  "reddit.reply_comment": async (params) => ({
    success: true,
    message: `Mock reply to comment ${params.comment_id}: ${params.text}`
  }),

  "reddit.send_message": async (params) => ({
    success: true,
    message: `Mock message sent to ${params.user}: ${params.text}`
  }),

  "reddit.submit_post": async (params) => ({
    success: true,
    message: `Mock post submitted to ${params.subreddit} titled "${params.title}"`
  }),

  "reddit.list_subreddits": async () => ({
    success: true,
    subreddits: ["Entrepreneur", "Marketing", "SideHustle"]
  })
};

// ✅ Main handler
app.post("/", async (req, res) => {
  const { method, params } = req.body;

  if (method === "initialize") {
    return res.json({
      success: true,
      name: "Reddit Multi-Action Agent",
      description: "Allows Ollie to search, post, and reply on Reddit.",
      methods: Object.keys(methods)
    });
  }

  const handler = methods[method];
  if (!handler) {
    return res.status(400).json({
      success: false,
      error: `Unsupported method: ${method}`
    });
  }

  try {
    const result = await handler(params);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Root route for quick health check
app.get("/", (req, res) => {
  res.send("✅ Reddit MCP is live and responding to JSON-RPC requests.");
});

// ✅ Important: use 0.0.0.0 so Render can expose it
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Reddit MCP running on port ${PORT}`);
});

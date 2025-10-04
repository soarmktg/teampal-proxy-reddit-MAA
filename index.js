import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// Root route for TeamPal MCP validation
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
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

// Reddit search route
app.post("/", async (req, res) => {
  const { method, params } = req.body;
  res.setHeader("Content-Type", "application/json");

  try {
    if (method === "reddit.search_posts") {
      console.log("Searching posts...", params);
      return res.json({
        success: true,
        posts: [
          {
            id: "1ny364q",
            title: "Mock Reddit post 1",
            author: "example_user",
            permalink:
              "https://reddit.com/r/test/comments/1ny364q/mock_post_1"
          },
          {
            id: "1ny35vh",
            title: "Mock Reddit post 2",
            author: "another_user",
            permalink:
              "https://reddit.com/r/test/comments/1ny35vh/mock_post_2"
          }
        ]
      });
    }

    // Add more methods (reply_comment, submit_post, etc.) here

    return res.status(400).json({
      success: false,
      error: "Unsupported method"
    });
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`✅ Reddit MCP running on port ${PORT}`)
);

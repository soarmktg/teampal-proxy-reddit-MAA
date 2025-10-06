app.post("/", async (req, res) => {
  const { id, method, params } = req.body;
  console.log("Incoming JSON-RPC from Teampal:", method, params);

  // === 1️⃣ Handle MCP initialize handshake ===
  if (method === "initialize") {
    const result = {
      protocolVersion: "2025-03-26",
      capabilities: { tools: { listChanged: true } },
      serverInfo: { name: "reddit-mcp-bridge", version: "1.0.0" }
    };
    console.log("✅ Responding to initialize handshake");
    return res.json({ jsonrpc: "2.0", id, result });
  }

  // === 2️⃣ Handle MCP notifications/initialized ===
  if (method === "notifications/initialized") {
    console.log("✅ Received 'notifications/initialized' from Teampal");
    return res.json({ jsonrpc: "2.0", id, result: { ok: true } });
  }

  // === 3️⃣ Handle tools/list ===
  if (method === "tools/list") {
    console.log("✅ Responding with tool list");
    const result = {
      tools: [
        {
          name: "reddit_comment",
          description: "Post a comment on a specific Reddit post.",
          inputSchema: {
            type: "object",
            properties: {
              postId: { type: "string", description: "Reddit post ID or permalink" },
              comment: { type: "string", description: "Text content of the comment" }
            },
            required: ["postId", "comment"]
          }
        },
        {
          name: "reddit_post",
          description: "Create a new Reddit post in a given subreddit.",
          inputSchema: {
            type: "object",
            properties: {
              subreddit: { type: "string", description: "Target subreddit name" },
              title: { type: "string", description: "Post title" },
              body: { type: "string", description: "Post content (text)" }
            },
            required: ["subreddit", "title"]
          }
        },
        {
          name: "reddit_search",
          description: "Search posts in a subreddit by keyword.",
          inputSchema: {
            type: "object",
            properties: {
              subreddit: { type: "string" },
              query: { type: "string" }
            },
            required: ["query"]
          }
        },
        {
          name: "reddit_message",
          description: "Send a private message to a Reddit user.",
          inputSchema: {
            type: "object",
            properties: {
              username: { type: "string", description: "Target Reddit username" },
              subject: { type: "string" },
              message: { type: "string" }
            },
            required: ["username", "message"]
          }
        }
      ]
    };
    return res.json({ jsonrpc: "2.0", id, result });
  }

  // === 4️⃣ Handle executing a tool (reddit_comment, reddit_post, etc.) ===
  if (
    method === "tools/call" &&
    params &&
    params.name &&
    params.arguments
  ) {
    const { name, arguments: args } = params;
    console.log(`🛠 Executing tool: ${name}`, args);

    try {
      // Forward to your Pipedream workflow
      const response = await fetch(PIPEDREAM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: name, args })
      });

      const result = await response.json().catch(() => ({}));
      return res.json({ jsonrpc: "2.0", id, result });
    } catch (err) {
      console.error("❌ Error executing tool:", err);
      return res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: err.message || "Pipedream error" }
      });
    }
  }

  // === 5️⃣ Default fallback for unknown methods ===
  console.warn("⚠️ Unknown method received:", method);
  return res.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Method not found" }
  });
});

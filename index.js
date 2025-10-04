import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;
const PIPE_URL = process.env.REDDIT_PIPE_URL; // from Render environment variables

// Root check
app.get("/", (req, res) => {
  res.send("✅ TeamPal MCP Proxy is running");
});

// JSON-RPC handler
app.post("/", async (req, res) => {
  const { id, method, params } = req.body;

  if (!method || !params) {
    return res.status(400).json({
      jsonrpc: "2.0",
      id: id || null,
      error: "Invalid JSON-RPC request: missing method or params",
    });
  }

  try {
    // Forward only the `params` to Pipedream
    const response = await axios.post(PIPE_URL, params, {
      headers: { "Content-Type": "application/json" },
    });

    res.json({
      jsonrpc: "2.0",
      id,
      result: response.data,
    });
  } catch (err) {
    console.error("Proxy error:", err.response?.data || err.message);

    res.status(500).json({
      jsonrpc: "2.0",
      id,
      error: "Proxy failed to call Pipedream",
      detail: err.response?.data || err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 TeamPal MCP Proxy running on port ${PORT}`);
});

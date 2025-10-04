import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());

// Main proxy route
app.post("/", async (req, res) => {
  const { id, method, params } = req.body;

  try {
    // Forward ONLY the params to Pipedream
    const response = await axios.post(
      process.env.REDDIT_PIPE_URL,
      params, // <-- just the params object
      { headers: { "Content-Type": "application/json" } }
    );

    res.json({
      jsonrpc: "2.0",
      id,
      result: response.data,
    });
  } catch (error) {
    console.error("Proxy error:", error.message);

    res.status(500).json({
      jsonrpc: "2.0",
      id,
      error: "Proxy failed to call Pipedream",
      detail: error.response?.data || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ TeamPal MCP Proxy running on port ${PORT}`);
});

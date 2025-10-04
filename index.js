import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post("/", async (req, res) => {
  try {
    const pipeUrl = process.env.REDDIT_PIPE_URL;
    if (!pipeUrl) {
      return res.status(500).json({ error: "Missing REDDIT_PIPE_URL" });
    }

    console.log("Forwarding request to:", pipeUrl);
    console.log("Request body:", req.body);

    const response = await axios.post(pipeUrl, req.body, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("Response from Pipedream:", response.data);

    // ✅ Send Pipedream’s response back
    res.status(200).json(response.data);
  } catch (err) {
    console.error("Proxy error:", err.message, err.response?.data);
    res.status(500).json({ error: "Proxy failed to call Pipedream", detail: err.message });
  }
});

app.listen(port, () => {
  console.log(`TeamPal MCP Proxy running on port ${port}`);
});

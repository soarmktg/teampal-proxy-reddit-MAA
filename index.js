import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

app.post("/", async (req, res) => {
  const { id, method, params } = req.body;

  try {
    let url;
    let payload = { id, method, params };

    switch (true) {
      case method.startsWith("reddit."):
        url = process.env.REDDIT_PIPE_URL;
        break;

      default:
        return res.json({
          jsonrpc: "2.0",
          id,
          error: `Unknown method: ${method}`
        });
    }

    const response = await axios.post(url, payload);

    return res.json({
      jsonrpc: "2.0",
      id,
      result: response.data
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.json({
      jsonrpc: "2.0",
      id,
      error: "Proxy failed to call Pipedream"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TeamPal MCP Proxy running on port ${PORT}`);
});

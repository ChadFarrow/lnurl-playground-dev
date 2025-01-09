import fs from "fs/promises";

async function getPrismWebhook() {
  return async (req, res) => {
    const filePath = "../../prism-webhook.json";

    try {
      // Read the file content
      const data = await fs.readFile(filePath, "utf-8");
      const content = data.length ? JSON.parse(data) : [];

      // Send content as JSON response
      res.json(content);
    } catch (err) {
      if (err.code === "ENOENT") {
        // File not found, return empty JSON array
        res.json([]);
      } else {
        console.error(err);
        res.status(500).send("Failed to read the file");
      }
    }
  };
}

export default getPrismWebhook;

import fs from "fs/promises";

async function webhook() {
  return async (req, res) => {
    const filePath = "prism-webhook.json";

    try {
      // Read existing file
      let content = [];
      try {
        const data = await fs.readFile(filePath, "utf-8");
        if (data.length) {
          content = JSON.parse(data);
        }
      } catch (err) {
        if (err.code !== "ENOENT") throw err; // Ignore file-not-found errors
      }

      // Append new request body
      content.push(req.body);

      // Write updated array back to file
      await fs.writeFile(filePath, JSON.stringify(content, null, 2));
      res.send("Webhook received and saved");
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to process the request");
    }
  };
}
export default webhook;

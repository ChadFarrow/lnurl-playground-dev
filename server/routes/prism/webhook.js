import fs from "fs";

function webhook() {
  return async (req, res) => {
    fs.readFile("strike-test.json", (err, data) => {
      let content = [];

      if (!err && data.length) {
        try {
          content = JSON.parse(data);
        } catch (parseErr) {
          return res.status(500).send("Failed to parse existing file");
        }
      }

      // Append new request body
      content.push(req.body);

      // Write updated array back to file
      fs.writeFile(
        "prism-webhook.json",
        JSON.stringify(content, null, 2),
        (writeErr) => {
          if (writeErr) {
            return res.status(500).send("Failed to save file");
          }
          res.send("Webhook received and saved");
        }
      );
    });
  };
}

export default webhook;

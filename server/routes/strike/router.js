import express from "express";
import fs from "fs";

const router = express.Router();

// Hello World route
router.post("/", (req, res) => {
  console.log("hi");
  res.send("Hello World");
});

router.post("/test", (req, res) => {
  console.log("hi");
  res.send("Hello World");
});

// Handle preflight CORS
router.options("/webhook-test", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

// Webhook-test route with CORS
router.post("/webhook-test", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");

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
      "strike-test.json",
      JSON.stringify(content, null, 2),
      (writeErr) => {
        if (writeErr) {
          return res.status(500).send("Failed to save file");
        }
        res.send("Webhook received and saved");
      }
    );
  });
});

const strikeRoutes = router;

export default strikeRoutes;

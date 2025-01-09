import fs from "fs/promises";
import { Webhook } from "svix";
import dotenv from "dotenv";
import sendLNUrl from "./sendLNUrl.js";

dotenv.config();

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
      let newData = req.body;
      content.push(newData);

      // Write updated array back to file
      await fs.writeFile(filePath, JSON.stringify(content, null, 2));

      const payload = req.body;
      const headers = req.headers;

      const wh = new Webhook(process.env.PRISM_WEBHOOK);

      try {
        // Verify the signature
        const verifiedPayload = await wh.verify(
          JSON.stringify(payload),
          headers
        );
        console.log("Webhook verified");

        // Process the webhook payload here
        res.status(200).send("Webhook received");

        let amount = newData.amount * 1000 - 5000;
        let recipients = [
          { "@_address": "sjb@strike.me", amount: Math.floor(amount * 0.25) },
          {
            "@_address": "adamcurry@strike.me",
            amount: Math.floor(amount * 0.25),
          },
        ];

        let paid = Promise.all(recipients.map((v) => sendLNUrl(v)));
        console.log(paid);
      } catch (err) {
        console.error("Invalid webhook signature");
        res.status(200).send("Invalid signature");
      }
      res.send("Webhook received and saved");
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to process the request");
    }
  };
}
export default webhook;

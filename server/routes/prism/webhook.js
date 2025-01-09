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

        let amount = newData.amount;
        let recipients = [
          "sjb@strike.me",
          "adamcurry@strike.me",
          "jb55@sendsats.lol",
          "dergigi@npub.cash",
          "jack@primal.net",
          "hzrd149@minibits.cash",
        ];

        let routes = recipients.map((v) => {
          return {
            "@_address": v,
            amount: Math.floor(amount / recipients.length),
          };
        });

        let paid = await Promise.all(routes.map((v) => sendLNUrl(v)));
        console.log(paid);
      } catch (err) {
        console.error("Invalid webhook signature");
        res.status(200).send("Invalid signature");
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to process the request");
    }
  };
}
export default webhook;

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
        let lnurl = null;
        const tags = newData.metadata?.zap_request?.tags;

        if (tags) {
          const lnurlTag = tags.find((tag) => tag[0] === "lnurl");
          if (lnurlTag) {
            lnurl = lnurlTag[1];
          }
        }

        let route = lnurl?.split("#")?.[1];

        let amount = newData.amount;
        if (route) {
          console.log(`${new Date().getTime()}:  ${route}`);
        } else {
          let recipients = [
            "sjb@strike.me",
            "adamcurry@strike.me",
            "jb55@sendsats.lol",
            "dergigi@npub.cash",
            "jack@primal.net",
            "hzrd149@minibits.cash",
          ];

          let lnRoutes = recipients.map((v) => {
            return {
              "@_address": v,
              amount: Math.floor(amount / recipients.length),
            };
          });

          let paid = await Promise.all(lnRoutes.map((v) => sendLNUrl(v)));
          console.log(paid);
        }
      } catch (err) {
        console.error(err);
        res.status(200).send("Invalid signature");
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to process the request");
    }
  };
}
export default webhook;

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
        // const verifiedPayload = await wh.verify(
        //   JSON.stringify(payload),
        //   headers
        // );
        console.log("Webhook verified");

        // Process the webhook payload here
        res.status(200).send("Webhook received");
        let splitbox = null;
        const tags = newData.metadata?.zap_request?.tags;

        if (tags) {
          const splitboxTag = tags.find((tag) => tag[0] === "splitbox");
          if (splitboxTag) {
            splitbox = splitboxTag[1];
          }
        }

        let amount = newData.amount;
        if (splitbox) {
          console.log(`${new Date().getTime()}:  ${splitbox}`);
        } else {
          console.log("prism split");
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

// http://localhost:3000/lnurlp/prism/callback?amount=1000&nostr=%7B%22created_at%22%3A1736827008%2C%22content%22%3A%22%22%2C%22tags%22%3A%5B%5B%22p%22%2C%224660cd71c8a4715b9d23bdb7ff5b33e12508259247b2426423453f8af3b73849%22%5D%2C%5B%22amount%22%2C%221000%22%5D%2C%5B%22relays%22%2C%22wss%3A%2F%2Fstrfry.iris.to%2F%22%2C%22wss%3A%2F%2Frelay.damus.io%2F%22%2C%22wss%3A%2F%2Frelay.nostr.band%2F%22%2C%22wss%3A%2F%2Frelay.snort.social%2F%22%5D%2C%5B%22e%22%2C%2201f48856d49fb2ae918dc4b8a6a31a7cb2cd07ea922b774c893d5fb3e9c3753d%22%2C%22wss%3A%2F%2Fstrfry.iris.to%2F%22%5D%2C%5B%22lnurl%22%2C%22https%3A%2F%2Fgetalby.com%2Flnurlp%2Fprism%2Fcallback%23pc.856cd618-7f34-57ea-9b84-3600f1f65e7f%22%5D%5D%2C%22kind%22%3A9734%2C%22pubkey%22%3A%2223103189356cf7c8bc09bb8b431fc3e71e85582c8f755b9ee160203c9c19e403%22%2C%22id%22%3A%22e50ce63af37046c4eccdfde83eeb1a02d18f4e7899225e9677d3747cd0e2ca08%22%2C%22sig%22%3A%22a4b69219267c20d8d1bda6c08a549295bbab7e84d9d8838967a3d215a5c3761230f092ec594eec2663e94464f5e52b574bdea6e50408b076595b4f3d4497ab15%22%7D

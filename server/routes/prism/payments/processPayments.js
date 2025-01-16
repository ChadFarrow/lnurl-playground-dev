import sendKeysend from "./sendKeysend.js";
import sendLNUrl from "./sendLNUrl.js";
import dotenv from "dotenv";

if (!process.env.WEBHOOK_SERVER) {
  dotenv.config();
}

export default async function processPayments({
  splits,
  metadata,
  id,
  message,
  nostr,
}) {
  let paymentAttempts = splits.map((recipient) => {
    if (recipient?.["@_type"] === "node") {
      return sendKeysend({
        accessToken: process.env.PRISM_ALBY_ACCESS_TOKEN,
        recipient,
        metadata,
      });
    } else if (recipient?.["@_type"] === "lnaddress") {
      return sendLNUrl({
        accessToken: process.env.PRISM_ALBY_ACCESS_TOKEN,
        recipient,
        id,
        message,
        nostr,
      });
    } else {
      return Promise.resolve({ status: "skipped", recipient });
    }
  });

  return Promise.all(paymentAttempts);
}

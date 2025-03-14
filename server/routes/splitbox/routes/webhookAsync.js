import confirmInvoice from "../functions/getSplits/confirmInvoice.js";
import getSplits from "../functions/getSplits/getSplits.js";
import processPayments from "../functions/payments/processPayments.js";
import blockToMeta from "../functions/tsk/blockToMeta.js";
import { Webhook } from "svix";
import dotenv from "dotenv";

dotenv.config();

function webhookAsync(storeMetadata) {
  return async (req, res) => {
    const payload = req.body;
    const headers = req.headers;
    res.status(200).send("Webhook received");
    try {
      // Verify the signature
      // const wh = new Webhook(process.env.TSB_WEBHOOK);
      // const verifiedPayload = await wh.verify(JSON.stringify(payload), headers);
      console.log("Webhook verified");
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server error");
      return;
    }

    if (payload.payment_request) {
      let preimage = payload.preimage || payload.payment_preimage;
      let invoice = payload.payment_request;
      console.log(payload);

      if (confirmInvoice(preimage, invoice) || true) {
        await storeMetadata.updateByInvoice(invoice, { settled: true });

        const storedData = await storeMetadata.getByInvoice(invoice);
        let {
          eventGuid,
          blockGuid,
          value,
          comment,
          metadata,
          id,
          parentAddress,
        } = storedData;

        if (blockGuid) {
          let event = await getEvent(eventGuid);
          let block = getBlock(event, blockGuid);

          //this adds an '@_' to each destination so it matches parsed RSS feeds
          let splits = []
            .concat(value?.destinations)
            .filter(Boolean)
            .map((obj) =>
              Object.fromEntries(
                Object.entries(obj).map(([key, value]) => [
                  key.startsWith("@_") ? key : `@_${key}`,
                  value,
                ])
              )
            );

          let account = await storeMetadata.fetchAccessToken(
            parentAddress || "thesplitbox@getalby.com"
          );

          console.log(storedData);

          let completedPayments = await processPayments({
            accessToken: account.albyAccessToken,
            splits,
            metadata: blockToMeta(block, payload.amount, comment),
            id,
          });
          await storeMetadata.updateByInvoice(invoice, { completedPayments });
          console.log({ completedPayments, id });
        } else if (metadata) {
          let splits = await getSplits(metadata);
          console.log(splits);
          let account = await storeMetadata.fetchAccessToken(
            parentAddress || "thesplitbox@getalby.com"
          );
          let completedPayments = await processPayments({
            accessToken: account.albyAccessToken,
            splits,
            metadata,
            id,
          });
          await storeMetadata.updateByInvoice(invoice, { completedPayments });
          console.log({ completedPayments, id });
        }
      }
    } else {
      console.log({ success: false, reason: "unconfirmed preimage" });
    }
  };
}

export default webhookAsync;

async function getEvent(guid) {
  const url = `https://curiohoster.com/api/sk/getblocks?guid=${guid}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

function getBlock(event, guid) {
  return (event?.blocks || []).find((v) => v.blockGuid === guid);
}

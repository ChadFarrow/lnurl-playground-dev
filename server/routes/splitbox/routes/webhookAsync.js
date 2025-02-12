import confirmInvoice from "../functions/getSplits/confirmInvoice.js";
import getSplits from "../functions/getSplits/getSplits.js";
import processPayments from "../functions/payments/processPayments.js";
import { Webhook } from "svix";
import dotenv from "dotenv";

dotenv.config();

function webhookAsync(storeMetadata) {
  return async (req, res) => {
    try {
      const payload = req.body;
      const headers = req.headers;

      const wh = new Webhook(process.env.TSB_WEBHOOK);

      // Verify the signature
      const verifiedPayload = await wh.verify(JSON.stringify(payload), headers);
      console.log("Webhook verified");

      // Process the webhook payload here
      res.status(200).send("Webhook received");
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server error");
    }

    if (payload.payment_request) {
      let preimage = payload.preimage || payload.payment_preimage;
      let invoice = payload.payment_request;

      if (confirmInvoice(preimage, invoice)) {
        await storeMetadata.updateByInvoice(invoice, { settled: true });

        const payload = await storeMetadata.getByInvoice(invoice);
        const { metadata, id, parentAddress } = payload;
        let splits = await getSplits(metadata);
        let account = await storeMetadata.fetchAccessToken(parentAddress);
        let completedPayments = await processPayments({
          accessToken: account.albyAccessToken || account.strikeAccessToken,
          splits,
          metadata,
          id,
        });
        await storeMetadata.updateByInvoice(
          invoice,
          { completedPayments },
          splits
        );
        res.json({ completedPayments, id });
      } else {
        res.json({ succes: false, reason: "unconfirmed preimage" });
      }
    } else {
      res.json({ succes: false, reason: "no payment request present" });
    }
  };
}

export default webhookAsync;

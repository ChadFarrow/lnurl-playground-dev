import confirmInvoice from "../functions/getSplits/confirmInvoice.js";
import getSplits from "../functions/getSplits/getSplits.js";
import processPayments from "../functions/payments/processPayments.js";

function webhookSync(storeMetadata) {
  return async (req, res) => {
    try {
      const data = req.body;
      console.log(data);

      if (data.payment_request) {
        let preimage = data.preimage || data.payment_preimage;
        let invoice = data.payment_request;

        if (confirmInvoice(preimage, invoice)) {
          console.log("confirmed");
          await storeMetadata.updateByInvoice(invoice, { settled: true });

          const data = await storeMetadata.getByInvoice(invoice);
          console.log(data);
          const { metadata, id, parentAddress } = data;
          let splits = await getSplits(metadata);
          let account = await storeMetadata.fetchAccessToken(parentAddress);
          let completedPayments = await processPayments({
            accessToken: account.albyAccessToken || account.strikeAccessToken,
            splits,
            metadata,
            id,
          });
          console.log(completedPayments);
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
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server error");
    }
  };
}

export default webhookSync;

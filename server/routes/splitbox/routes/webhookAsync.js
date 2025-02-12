import confirmInvoice from "../functions/getSplits/confirmInvoice.js";
import getSplits from "../functions/getSplits/getSplits.js";
import processPayments from "../functions/payments/processPayments.js";
import { Webhook } from "svix";
import dotenv from "dotenv";

dotenv.config();

function webhookAsync(storeMetadata) {
  return async (req, res) => {
    const payload = req.body;
    const headers = req.headers;
    try {
      // Verify the signature
      // const wh = new Webhook(process.env.TSB_WEBHOOK);
      // const verifiedPayload = await wh.verify(JSON.stringify(payload), headers);
      console.log("Webhook verified");

      res.status(200).send("Webhook received");
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server error");
      return;
    }

    if (payload.payment_request) {
      let preimage = payload.preimage || payload.payment_preimage;
      let invoice = payload.payment_request;

      if (confirmInvoice(preimage, invoice)) {
        await storeMetadata.updateByInvoice(
          invoice,
          { settled: true },
          "tsb-tsk"
        );

        const storedData = await storeMetadata.getByInvoice(invoice, "tsb-tsk");
        const { metadata, id, parentAddress } = storedData;
        console.log(storedData);

        let event = await getBlocks(storedData.guid);
        console.log(event?.blocks?.[0]?.value);
        // let splits = await getSplits(metadata);
        // let account = await storeMetadata.fetchAccessToken(
        //   parentAddress,
        //   "tsb-tsk"
        // );
        // let completedPayments = await processPayments({
        //   accessToken: account.albyAccessToken || account.strikeAccessToken,
        //   splits,
        //   metadata,
        //   id,
        // });
        // await storeMetadata.updateByInvoice(
        //   invoice,
        //   { completedPayments },
        //   "tsb-tsk"
        // );
        // console.log({ completedPayments, id });
      } else {
        console.log({ success: false, reason: "unconfirmed preimage" });
      }
    }
  };
}

export default webhookAsync;

async function getBlocks(guid) {
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

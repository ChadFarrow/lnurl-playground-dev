import getInvoice from "../functions/getSplits/getInvoice.js";
import { v4 as uuidv4 } from "uuid";

function invoice(storeMetadata) {
  return async (req, res) => {
    const { address } = req.query;

    const payload = req.body;
    const tlv = payload.metadata;

    delete tlv.name;
    delete tlv.value_msat;
    if (!tlv.reply_custom_value) {
      delete tlv.reply_custom_value;
    }

    if (!tlv.reply_custom_key) {
      delete tlv.reply_custom_key;
    }

    // process TLV from the POST, if there's a feedGuid, then do the rest.
    let settings = await storeMetadata.fetchSettings(address);
    if (tlv.feed_guid) {
      //check to see if tlv has a feed_guid that's allowed to send sats. Prevents storing undesired data.
      if (settings.approvedGuids.find((v) => v === tlv.feed_guid)) {
        try {
          const metaID = uuidv4();
          const invoice = await getInvoice(address, tlv.value_msat_total);
          const newMetadata = {
            id: metaID,
            invoice,
            ...payload,
          };

          storeMetadata.add(newMetadata);

          res.json({ invoice, id: metaID });
        } catch (error) {
          console.error(error.message);
          res.status(500).send("Internal server error");
        }
      } else {
        res.json({
          error:
            "This lightning address hasn't approved this feed for payments",
        });
      }
    } else {
      res.json({ error: "No feed_guid in TLV record" });
    }
  };
}

export default invoice;

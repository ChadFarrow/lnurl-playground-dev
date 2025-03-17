import axios from "axios";
import clone from "just-clone";

export default function sendKeysend({ accessToken, recipient, metadata, id }) {
  let record = {
    destination: recipient["@_address"],
    amount: recipient.amount,
  };

  const tlv = clone(metadata);
  tlv.metadataUrl = `${process.env.WEBHOOK_SERVER}/metadata/${id}`;

  tlv.name = recipient["@_name"];
  tlv.value_msat = recipient.amount * 1000;

  let customRecords = {};
  if (tlv) {
    customRecords[7629169] = JSON.stringify(tlv);
  }
  if (recipient["@_customKey"]) {
    customRecords[recipient["@_customKey"]] = recipient["@_customValue"];
  }

  if (Object.keys(customRecords)?.length > 0) {
    record.custom_records = customRecords;
  }

  return new Promise(async (resolve, reject) => {
    try {
      // Throwing an error for testing purposes
      // throw new Error("Intentional test error");

      let paymentData;
      if (recipient.amount) {
        const paymentRes = await axios.post(
          "https://api.getalby.com/payments/keysend",
          record,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        paymentData = paymentRes.data;
      } else {
        paymentData = { amount: 0, status: "no sats sent, amount too low" };
      }
      resolve({
        success: true,
        recipient: recipient,
        paymentData,
      });
    } catch (error) {
      console.log("Keysend Payment Error:", error.message || error);
      let err = error.message || error;
      resolve({ success: false, recipient, record, err });
    }
  });
}

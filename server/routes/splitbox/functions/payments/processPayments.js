import sendKeysend from "./sendKeysend.js";
import sendLNUrl from "./sendLNUrl.js";

export default async function processPayments({
  accessToken,
  splits,
  metadata,
  metaID,
}) {
  let paymentAttempts = splits.map((recipient) => {
    if (recipient?.["@_type"] === "node") {
      return sendKeysend({ accessToken, recipient, metadata });
    } else if (recipient?.["@_type"] === "lnaddress") {
      return sendLNUrl({ accessToken, recipient, metaID });
    } else {
      return Promise.resolve({ status: "skipped", recipient });
    }
  });

  return Promise.all(paymentAttempts);
}

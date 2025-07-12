import sendKeysend from "./sendKeysend.js";
import sendLNUrl from "./sendLNUrl.js";

export default async function processPayments({
  accessToken,
  splits,
  metadata,
  id,
}) {
  console.log("🚀 Starting payment processing...");
  console.log("Access Token:", accessToken ? "Present" : "Missing");
  console.log("Splits count:", splits?.length || 0);
  console.log("Metadata:", metadata ? "Present" : "Missing");
  console.log("ID:", id);

  if (!accessToken) {
    console.error("❌ No access token provided for payments");
    return splits.map(recipient => ({
      success: false,
      recipient,
      error: "No access token available"
    }));
  }

  if (!splits || splits.length === 0) {
    console.log("⚠️ No splits to process");
    return [];
  }

  let paymentAttempts = splits.map((recipient) => {
    console.log();
    console.log("💰 Processing recipient:", recipient);
    if (recipient?.["@_type"] === "node") {
      return sendKeysend({ accessToken, recipient, metadata, id });
    } else if (recipient?.["@_type"] === "lnaddress") {
      return sendLNUrl({ accessToken, recipient, id });
    } else {
      console.log("⚠️ Skipping recipient with unknown type:", recipient?.["@_type"]);
      return Promise.resolve({ status: "skipped", recipient });
    }
  });

  const results = await Promise.all(paymentAttempts);
  console.log("✅ Payment processing completed:", results);
  return results;
}

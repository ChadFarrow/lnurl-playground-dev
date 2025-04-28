import axios from "axios";

export default async function sendKeysend({
  accessToken,
  recipient,
  metadata,
  id,
}) {
  if (!accessToken) throw new Error("Missing access token.");
  if (!recipient?.["@_address"]) throw new Error("Missing recipient address.");
  if (typeof recipient.amount !== "number" || recipient.amount < 0)
    throw new Error("Invalid recipient amount.");
  if (!process.env.WEBHOOK_SERVER)
    throw new Error("Missing WEBHOOK_SERVER environment variable.");

  const record = {
    destination: recipient["@_address"],
    amount: recipient.amount,
  };

  const customRecords = {
    7629169: JSON.stringify({
      ...metadata,
      metadataUrl: `${process.env.WEBHOOK_SERVER}/metadata/${id}`,
      name: recipient["@_name"] || "",
      value_msat: recipient.amount * 1000,
    }),
  };

  if (recipient["@_customKey"]) {
    customRecords[recipient["@_customKey"]] = recipient["@_customValue"];
  }

  if (Object.keys(customRecords).length > 0) {
    record.custom_records = customRecords;
  }

  try {
    let paymentData;
    if (recipient.amount > 0) {
      const paymentRes = await axios.post(
        "https://api.getalby.com/payments/keysend",
        record,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 10000, // Optional: avoid hanging forever
        }
      );
      paymentData = paymentRes.data;
    } else {
      paymentData = { amount: 0, status: "No sats sent. Amount too low." };
    }

    return {
      success: true,
      recipient: minimalRecipient(recipient),
      paymentData,
    };
  } catch (error) {
    if (error.response) {
      console.error("Keysend Server Error:", {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error("Keysend No Response:", error.request);
    } else {
      console.error("Keysend Setup Error:", error.message);
    }

    return {
      success: false,
      recipient: minimalRecipient(recipient),
      errorMessage: error.message || "Unknown error",
      statusCode: error.response?.status || null,
      serverData: error.response?.data || null,
    };
  }
}

function minimalRecipient(recipient) {
  return {
    address: recipient["@_address"],
    name: recipient["@_name"] || null,
  };
}

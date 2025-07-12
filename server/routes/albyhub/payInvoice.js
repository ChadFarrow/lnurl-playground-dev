import { finalizeEvent, generateSecretKey, getPublicKey, nip04 } from "nostr-tools";
import { Relay } from "nostr-tools/relay";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const { NWC_CONNECTION_STRING } = process.env;

function parseNWCConnectionString(connectionString) {
  const url = new URL(connectionString);
  const walletPubkey = url.hostname;
  const secret = url.searchParams.get('secret');
  const relayUrl = url.searchParams.get('relay');
  return { walletPubkey, secret, relayUrl };
}

const payInvoice = async (req, res) => {
  try {
    const { invoice } = req.body;

    if (!invoice) {
      return res.status(400).json({ message: "Invoice required" });
    }

    if (!NWC_CONNECTION_STRING) {
      return res.status(500).json({ message: "NWC connection not configured" });
    }

    const { walletPubkey, secret, relayUrl } = parseNWCConnectionString(NWC_CONNECTION_STRING);
    
    console.log("Attempting NWC payment...");
    console.log("Wallet pubkey:", walletPubkey);
    console.log("Relay:", relayUrl);

    // Connect to the relay
    const relay = await Relay.connect(relayUrl);
    console.log("Connected to relay");

    // Generate a private key for this request
    const clientPrivkey = secret; // Use the secret from NWC connection
    const clientPubkey = getPublicKey(clientPrivkey);

    // Create the payment request
    const paymentRequest = {
      method: "pay_invoice",
      params: {
        invoice: invoice
      },
      id: crypto.randomUUID()
    };

    // Encrypt the content using NIP-04
    const encryptedContent = await nip04.encrypt(clientPrivkey, walletPubkey, JSON.stringify(paymentRequest));

    // Create the Nostr event
    const event = finalizeEvent({
      kind: 23194, // NWC request kind
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["p", walletPubkey]
      ],
      content: encryptedContent,
    }, clientPrivkey);

    console.log("Sending NWC payment request...");

    // Publish the event and wait for response
    await relay.publish(event);

    // Listen for the response
    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Payment timeout"));
      }, 30000); // 30 second timeout

      const sub = relay.subscribe([
        {
          kinds: [23195], // NWC response kind
          authors: [walletPubkey],
          "#p": [clientPubkey],
          since: Math.floor(Date.now() / 1000) - 5
        }
      ], {
        onevent(responseEvent) {
          clearTimeout(timeout);
          sub.close();
          resolve(responseEvent);
        },
        oneose() {
          // End of stored events
        }
      });
    });

    const responseEvent = await responsePromise;
    
    // Decrypt the response
    const decryptedResponse = await nip04.decrypt(clientPrivkey, walletPubkey, responseEvent.content);
    const response = JSON.parse(decryptedResponse);

    console.log("NWC Response:", response);

    relay.close();

    if (response.error) {
      return res.status(400).json({
        success: false,
        message: "Payment failed",
        error: response.error
      });
    }

    res.json({
      success: true,
      info: response.result || response,
      message: "Payment successful via NWC"
    });
    
  } catch (error) {
    console.error("NWC payment error:", error.message);
    res.status(500).json({
      message: "Payment failed",
      error: error.message,
    });
  }
};

export default payInvoice;
import confirmInvoice from "../functions/getSplits/confirmInvoice.js";
import getSplits from "../functions/getSplits/getSplits.js";
import processPayments from "../functions/payments/processPayments.js";
import { finalizeEvent, generateSecretKey, getPublicKey, nip04 } from "nostr-tools";
import { Relay } from "nostr-tools/relay";
import crypto from "crypto";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

function parseNWCConnectionString(connectionString) {
  const url = new URL(connectionString);
  const walletPubkey = url.hostname;
  const secret = url.searchParams.get('secret');
  const relayUrl = url.searchParams.get('relay');
  return { walletPubkey, secret, relayUrl };
}

// New function to send payments via Alby API
async function sendAlbyPayment(recipient, amountSats, accessToken) {
  try {
    console.log(`Sending ${amountSats} sats to ${recipient} via Alby API`);
    
    // Check if it's a Lightning address or node pubkey
    if (recipient.includes('@')) {
      // Lightning address - use LNURL
      const [name, server] = recipient.split("@");
      const paymentUrl = `https://${server}/.well-known/lnurlp/${name}`;
      
      const res = await fetch(paymentUrl);
      const data = await res.json();
      
      if (!data.callback) {
        throw new Error("Callback URL missing in LNURLP response");
      }
      
      const invoiceRes = await fetch(
        `${data.callback}?amount=${amountSats * 1000}`
      );
      const invoiceData = await invoiceRes.json();
      const invoice = invoiceData.pr;
      
      const paymentRes = await axios.post(
        "https://api.getalby.com/payments/bolt11",
        { invoice },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      
      return {
        recipient,
        amount_sats: amountSats,
        status: "paid",
        payment_hash: paymentRes.data.payment_hash,
        preimage: paymentRes.data.preimage
      };
    } else {
      // Node pubkey - use keysend
      const record = {
        destination: recipient,
        amount: amountSats,
      };
      
      const paymentRes = await axios.post(
        "https://api.getalby.com/payments/keysend",
        record,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      
      return {
        recipient,
        amount_sats: amountSats,
        status: "paid",
        payment_hash: paymentRes.data.payment_hash,
        preimage: paymentRes.data.preimage
      };
    }
  } catch (error) {
    console.error(`❌ Alby payment failed to ${recipient}:`, error.message);
    return {
      recipient,
      amount_sats: amountSats,
      status: "failed",
      error: error.message
    };
  }
}

async function sendLightningPayment(recipient, amountSats, nwcConfig) {
  try {
    console.log(`Sending ${amountSats} sats to ${recipient} via NWC`);
    
    const { walletPubkey, secret, relayUrl } = nwcConfig;
    
    // Connect to relay
    const relay = await Relay.connect(relayUrl);
    const clientPrivkey = secret;
    const clientPubkey = getPublicKey(clientPrivkey);

    // First, get invoice from the recipient's Lightning address
    let invoice;
    if (recipient.includes('@')) {
      // Lightning address - use LNURL to get invoice from recipient
      const [name, server] = recipient.split("@");
      const paymentUrl = `https://${server}/.well-known/lnurlp/${name}`;
      
      const res = await fetch(paymentUrl);
      const data = await res.json();
      
      if (!data.callback) {
        throw new Error("Callback URL missing in LNURLP response");
      }
      
      const invoiceRes = await fetch(
        `${data.callback}?amount=${amountSats * 1000}`
      );
      const invoiceData = await invoiceRes.json();
      invoice = invoiceData.pr;
      
      console.log(`Got invoice from ${recipient}: ${invoice}`);
    } else {
      throw new Error("Node payments not supported via NWC in this implementation");
    }

    // Now pay the external invoice using NWC
    const paymentRequest = {
      method: "pay_invoice", 
      params: { invoice },
      id: crypto.randomUUID()
    };

    const encryptedPaymentContent = await nip04.encrypt(clientPrivkey, walletPubkey, JSON.stringify(paymentRequest));
    const paymentEvent = finalizeEvent({
      kind: 23194,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", walletPubkey]],
      content: encryptedPaymentContent,
    }, clientPrivkey);

    await relay.publish(paymentEvent);

    // Wait for payment response
    const paymentResponse = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Payment timeout")), 15000);
      
      const sub = relay.subscribe([{
        kinds: [23195],
        authors: [walletPubkey],
        "#p": [clientPubkey],
        since: Math.floor(Date.now() / 1000) - 5
      }], {
        onevent(responseEvent) {
          clearTimeout(timeout);
          sub.close();
          resolve(responseEvent);
        }
      });
    });

    const decryptedPaymentResponse = await nip04.decrypt(clientPrivkey, walletPubkey, paymentResponse.content);
    const paymentData = JSON.parse(decryptedPaymentResponse);

    relay.close();

    if (paymentData.error) {
      throw new Error(paymentData.error.message || "Payment failed");
    }

    console.log(`✅ Payment successful to ${recipient}: ${amountSats} sats`);
    return {
      recipient,
      amount_sats: amountSats,
      status: "paid",
      preimage: paymentData.result?.preimage,
      payment_hash: paymentData.result?.payment_hash
    };

  } catch (error) {
    console.error(`❌ Payment failed to ${recipient}:`, error.message);
    return {
      recipient,
      amount_sats: amountSats,
      status: "failed",
      error: error.message
    };
  }
}

function webhookSync(storeMetadata) {
  return async (req, res) => {
    try {
      const data = req.body;
      console.log("Webhook received:", data);

      // Only process incoming payments, not outgoing split payments
      if (data.type === 'outgoing' || data.state === 'SETTLED' && data.type === 'outgoing') {
        console.log("Skipping outgoing payment webhook");
        return res.json({ success: true, reason: "Outgoing payment ignored" });
      }

      // Handle both old format (payment_request) and new NWC format (preimage only)
      let preimage = data.preimage || data.payment_preimage;
      let invoice = data.payment_request;

      if (preimage) {
        console.log("Processing payment with preimage:", preimage);
        
        // Find the stored payment by preimage or invoice
        let storedPayment;
        if (invoice) {
          storedPayment = await storeMetadata.getByInvoice(invoice);
        } else {
          // For webhooks without invoice, skip processing split payments
          console.log("No invoice in webhook - likely a split payment, skipping");
          return res.json({ success: true, reason: "No invoice provided" });
        }

        if (storedPayment) {
          console.log("Found stored payment:", storedPayment.id);
          
          // Mark as settled
          await storeMetadata.updateById(storedPayment.id, { 
            settled: true, 
            preimage: preimage,
            fees_paid: data.fees_paid 
          });

          const { metadata, id, parentAddress } = storedPayment;
          
          // Get splits directly from RSS feed URL since we have it
          console.log("Getting splits from RSS feed for metadata:", metadata);
          let rssFeeds = [];
          
          if (metadata.url) {
            try {
              const feedUrl = metadata.url;
              console.log("Fetching RSS feed directly from:", feedUrl);
              
              const response = await fetch(feedUrl);
              const feedText = await response.text();
              
              // Parse RSS feed to extract value recipients
              const { parse } = await import("fast-xml-parser");
              const parserOptions = {
                attributeNamePrefix: "@_",
                ignoreAttributes: false,
                ignoreNameSpace: false,
              };
              
              const feedData = parse(feedText, parserOptions);
              const channel = feedData.rss.channel;
              
              // Get value recipients from channel level
              const valueRecipients = channel["podcast:value"]?.["podcast:valueRecipient"];
              console.log("Found value recipients:", valueRecipients);
              
              if (valueRecipients && Array.isArray(valueRecipients)) {
                rssFeeds = valueRecipients.map(recipient => ({
                  address: recipient["@_address"],
                  name: recipient["@_name"],
                  split: parseFloat(recipient["@_split"]),
                  type: recipient["@_type"]
                }));
              }
              
              console.log("Parsed RSS feed splits:", rssFeeds);
            } catch (error) {
              console.error("Error parsing RSS feed:", error);
              rssFeeds = [];
            }
          } else {
            console.log("No RSS feed URL in metadata, falling back to getSplits");
            rssFeeds = await getSplits({ metadata });
          }
          
          if (rssFeeds && rssFeeds.length > 0) {
            console.log("Processing RSS feed splits:", rssFeeds);
            
            // Calculate split amounts
            const totalSats = Math.floor(metadata.value_msat_total / 1000);
            console.log(`Total payment: ${totalSats} sats`);
            
            // Determine payment method
            const { NWC_CONNECTION_STRING } = process.env;
            const settings = await storeMetadata.fetchSettings(parentAddress);
            const { ALBY_ACCESS_TOKEN } = settings; // Get Alby token from settings
            
            let paymentMethod = "none";
            let nwcConfig = null;
            let albyToken = null;
            
            if (NWC_CONNECTION_STRING) {
              try {
                nwcConfig = parseNWCConnectionString(NWC_CONNECTION_STRING);
                paymentMethod = "nwc";
                console.log("Using NWC for payments");
              } catch (error) {
                console.error("Failed to parse NWC connection string:", error.message);
              }
            }
            
            if (ALBY_ACCESS_TOKEN && !nwcConfig) {
              albyToken = ALBY_ACCESS_TOKEN;
              paymentMethod = "alby";
              console.log("Using Alby API for payments");
            }
            
            if (paymentMethod === "none") {
              console.log("⚠️ No payment method configured - simulating payments only");
            }
            
            // Convert RSS feed splits to the format expected by payment functions
            let validSplits = rssFeeds.map(split => ({
              address: split.address,
              name: split.name,
              percentage: split.split,
              type: split.type === 'node' ? 'node' : 'lnaddress'
            }));
            
            // Filter splits based on payment method
            if (paymentMethod === "nwc" || paymentMethod === "alby") {
              // Both can handle Lightning addresses and node pubkeys
              validSplits = validSplits.filter(split => 
                split.address.includes('@') || // Lightning addresses
                split.address.match(/^[0-9a-fA-F]{66}$/) // Node pubkeys
              );
            }
            
            console.log(`Sending real payments to ${validSplits.length} recipients using ${paymentMethod}...`);
            
            // Send real Lightning payments to each recipient
            const splitResults = [];
            
            for (const split of validSplits) {
              const amountSats = Math.floor(totalSats * split.percentage / 100);
              if (amountSats > 0) { // Only send if amount is > 0
                console.log(`Processing payment: ${amountSats} sats to ${split.address}`);
                
                try {
                  let paymentResult;
                  
                  if (paymentMethod === "nwc") {
                    paymentResult = await sendLightningPayment(split.address, amountSats, nwcConfig);
                  } else if (paymentMethod === "alby") {
                    paymentResult = await sendAlbyPayment(split.address, amountSats, albyToken);
                  } else {
                    // Simulate payment
                    paymentResult = {
                      recipient: split.address,
                      amount_sats: amountSats,
                      status: "simulated",
                      error: "No payment method configured"
                    };
                  }
                  
                  splitResults.push({
                    recipient: split.address,
                    name: split.name,
                    percentage: split.percentage,
                    amount_sats: amountSats,
                    status: paymentResult.status,
                    preimage: paymentResult.preimage,
                    error: paymentResult.error,
                    type: split.type
                  });
                } catch (error) {
                  console.error(`Payment error for ${split.address}:`, error);
                  splitResults.push({
                    recipient: split.address,
                    name: split.name,
                    percentage: split.percentage,
                    amount_sats: amountSats,
                    status: "failed",
                    error: error.message,
                    type: split.type
                  });
                }
              }
            }
            
            // Add simulated results for other recipients  
            const allRSSFeeds = rssFeeds.map(split => ({
              address: split.address,
              name: split.name,
              percentage: split.split,
              type: split.type === 'node' ? 'node' : 'lnaddress'
            }));
            const otherSplits = allRSSFeeds.filter(split => 
              !validSplits.some(valid => valid.address === split.address)
            );
            
            for (const split of otherSplits) {
              const amountSats = Math.floor(totalSats * split.percentage / 100);
              splitResults.push({
                recipient: split.address,
                name: split.name,
                percentage: split.percentage,
                amount_sats: amountSats,
                status: "simulated", // These recipients don't get real payments yet
                type: split.type
              });
            }

            console.log("Final split results:", splitResults);

            await storeMetadata.updateById(id, { 
              completedPayments: splitResults,
              splits_processed: true,
              real_payments_sent: validSplits.length,
              payment_method_used: paymentMethod
            });

            const realPayments = splitResults.filter(r => r.status === "paid").length;
            const failedPayments = splitResults.filter(r => r.status === "failed").length;
            const simulatedPayments = splitResults.filter(r => r.status === "simulated").length;

            res.json({ 
              success: true,
              id: id,
              completedPayments: splitResults,
              payment_method: paymentMethod,
              message: `Real payments: ${realPayments} sent, ${failedPayments} failed, ${simulatedPayments} simulated`
            });
          } else {
            res.json({ success: false, reason: "No RSS feed splits found" });
          }
        } else {
          res.json({ success: false, reason: "Payment not found in store" });
        }
      } else {
        res.json({ success: false, reason: "No preimage provided" });
      }
    } catch (error) {
      console.error("Webhook error:", error.message);
      res.status(500).send("Internal server error");
    }
  };
}

export default webhookSync;

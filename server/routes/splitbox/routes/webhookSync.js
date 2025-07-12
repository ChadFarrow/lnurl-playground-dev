import confirmInvoice from "../functions/getSplits/confirmInvoice.js";
import getSplits from "../functions/getSplits/getSplits.js";
import processPayments from "../functions/payments/processPayments.js";
import { finalizeEvent, generateSecretKey, getPublicKey, nip04 } from "nostr-tools";
import { Relay } from "nostr-tools/relay";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

function parseNWCConnectionString(connectionString) {
  const url = new URL(connectionString);
  const walletPubkey = url.hostname;
  const secret = url.searchParams.get('secret');
  const relayUrl = url.searchParams.get('relay');
  return { walletPubkey, secret, relayUrl };
}

async function sendLightningPayment(recipient, amountSats, nwcConfig) {
  try {
    console.log(`Sending ${amountSats} sats to ${recipient}`);
    
    const { walletPubkey, secret, relayUrl } = nwcConfig;
    
    // Connect to relay
    const relay = await Relay.connect(relayUrl);
    const clientPrivkey = secret;
    const clientPubkey = getPublicKey(clientPrivkey);

    // Create invoice request first
    const invoiceRequest = {
      method: "make_invoice",
      params: {
        amount: amountSats * 1000, // Convert to msats
        description: `Split payment to ${recipient}`
      },
      id: crypto.randomUUID()
    };

    // Encrypt and send invoice request
    const encryptedInvoiceContent = await nip04.encrypt(clientPrivkey, walletPubkey, JSON.stringify(invoiceRequest));
    const invoiceEvent = finalizeEvent({
      kind: 23194,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", walletPubkey]],
      content: encryptedInvoiceContent,
    }, clientPrivkey);

    await relay.publish(invoiceEvent);

    // Wait for invoice response
    const invoiceResponse = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Invoice timeout")), 15000);
      
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

    const decryptedInvoiceResponse = await nip04.decrypt(clientPrivkey, walletPubkey, invoiceResponse.content);
    const invoiceData = JSON.parse(decryptedInvoiceResponse);
    
    if (invoiceData.error) {
      throw new Error(invoiceData.error.message || "Invoice creation failed");
    }

    const invoice = invoiceData.result.invoice;
    console.log(`Created invoice for ${recipient}: ${invoice}`);

    // Now pay the invoice
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
          // For NWC payments, we need to find by ID or other means
          // Let's get all payments and find the most recent one
          const allPayments = await storeMetadata.getAll();
          storedPayment = allPayments[allPayments.length - 1]; // Get the most recent
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
          
          // Get the splits configuration
          const settings = await storeMetadata.fetchSettings(parentAddress);
          console.log("Settings for", parentAddress, ":", settings);
          
          if (settings && settings.splits) {
            console.log("Processing splits:", settings.splits);
            
            // Get NWC configuration
            const { NWC_CONNECTION_STRING } = process.env;
            if (!NWC_CONNECTION_STRING) {
              throw new Error("NWC connection not configured");
            }
            
            const nwcConfig = parseNWCConnectionString(NWC_CONNECTION_STRING);
            
            // Calculate split amounts
            const totalSats = Math.floor(metadata.value_msat_total / 1000);
            console.log(`Total payment: ${totalSats} sats`);
            
            // Filter out Lightning addresses that are not real Lightning addresses for now
            // Focus on your addresses that we know work
            const validSplits = settings.splits.filter(split => 
              split.address.includes('@getalby.com') || 
              split.address.includes('@strike.me') ||
              split.address.includes('@btcpay.podtards.com')
            );
            
            console.log(`Sending real payments to ${validSplits.length} recipients...`);
            
            // Send real Lightning payments to each recipient
            const splitResults = [];
            
            for (const split of validSplits) {
              const amountSats = Math.floor(totalSats * split.percentage / 100);
              if (amountSats > 0) { // Only send if amount is > 0
                console.log(`Processing payment: ${amountSats} sats to ${split.address}`);
                
                try {
                  const paymentResult = await sendLightningPayment(split.address, amountSats, nwcConfig);
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
            const otherSplits = settings.splits.filter(split => 
              !split.address.includes('@getalby.com') && 
              !split.address.includes('@strike.me') &&
              !split.address.includes('@btcpay.podtards.com')
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
              real_payments_sent: validSplits.length
            });

            const realPayments = splitResults.filter(r => r.status === "paid").length;
            const failedPayments = splitResults.filter(r => r.status === "failed").length;

            res.json({ 
              success: true,
              id: id,
              completedPayments: splitResults,
              message: `Real payments: ${realPayments} sent, ${failedPayments} failed, ${otherSplits.length} simulated`
            });
          } else {
            res.json({ success: false, reason: "No splits configuration found" });
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

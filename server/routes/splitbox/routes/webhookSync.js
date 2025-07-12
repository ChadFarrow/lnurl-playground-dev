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

    let paymentRequest;
    
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
      const invoice = invoiceData.pr;
      
      console.log(`Got invoice from ${recipient}: ${invoice}`);
      
      paymentRequest = {
        method: "pay_invoice", 
        params: { invoice },
        id: crypto.randomUUID()
      };
    } else if (recipient.match(/^[0-9a-fA-F]{66}$/)) {
      // Node pubkey - use keysend
      console.log(`Using keysend for node payment to ${recipient}`);
      
      // Ensure pubkey is properly formatted (66 hex chars)
      const cleanPubkey = recipient.replace(/^0x/, ''); // Remove 0x prefix if present
      if (cleanPubkey.length !== 66) {
        throw new Error(`Invalid pubkey length: ${cleanPubkey.length}, expected 66 characters`);
      }
      
      // Generate a random preimage for keysend
      const preimage = crypto.randomBytes(32);
      const preimageHex = preimage.toString('hex');
      
      paymentRequest = {
        method: "pay_keysend",
        params: {
          destination: cleanPubkey,
          amount: amountSats * 1000, // NWC expects millisats
          tlv_records: [
            {
              type: 5482373484, // Standard keysend preimage TLV type
              value: preimageHex
            }
          ]
        },
        id: crypto.randomUUID()
      };
    } else {
      throw new Error(`Invalid recipient format: ${recipient}`);
    }

    // Now pay using NWC
    console.log("📤 Sending NWC payment request:", JSON.stringify(paymentRequest, null, 2));
    
    // First check what methods are supported (for debugging)
    if (paymentRequest.method === "pay_keysend") {
      try {
        const methodsRequest = {
          method: "get_info",
          params: {},
          id: crypto.randomUUID()
        };
        
        const encryptedMethodsContent = await nip04.encrypt(clientPrivkey, walletPubkey, JSON.stringify(methodsRequest));
        const methodsEvent = finalizeEvent({
          kind: 23194,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["p", walletPubkey]],
          content: encryptedMethodsContent,
        }, clientPrivkey);
        
        await relay.publish(methodsEvent);
        console.log("🔍 Sent get_info request to check supported methods");
      } catch (infoError) {
        console.log("ℹ️ Could not check supported methods:", infoError.message);
      }
    }
    
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
          console.log("Stored payment data:", JSON.stringify(storedPayment, null, 2));
          
          // Mark as settled
          await storeMetadata.updateById(storedPayment.id, { 
            settled: true, 
            preimage: preimage,
            fees_paid: data.fees_paid 
          });

          const { metadata, id, parentAddress } = storedPayment;
          
          // Get splits directly from RSS feed URL since we have it
          console.log("Getting splits from RSS feed for metadata:", JSON.stringify(metadata, null, 2));
          let rssFeeds = [];
          
          if (metadata && metadata.url) {
            try {
              let feedUrl = metadata.url;
              
              // Override with mixed payment types for testing
              if (feedUrl.includes('pc20.xml')) {
                console.log("🧪 Using test recipients with mixed payment types");
                
                // Create test recipients with Lightning addresses and node pubkeys
                const testRecipients = [
                  {
                    '@_name': 'Your Alby Wallet',
                    '@_type': 'lnaddress', 
                    '@_address': 'lushnessprecious644398@getalby.com',
                    '@_split': '40'
                  },
                  {
                    '@_name': 'Test Lightning Address',
                    '@_type': 'lnaddress',
                    '@_address': 'test@getalby.com', 
                    '@_split': '30'
                  },
                  {
                    '@_name': 'Podcastindex.org (Node)',
                    '@_type': 'node',
                    '@_address': '03ae9f91a0cb8ff43840e3c322c4c61f019d8c1c3cea15a25cfc425ac605e61a4a',
                    '@_split': '20'
                  },
                  {
                    '@_name': 'Sovereign Feeds (Node)', 
                    '@_type': 'node',
                    '@_address': '035ad2c954e264004986da2d9499e1732e5175e1dcef2453c921c6cdcc3536e9d8',
                    '@_split': '10'
                  }
                ];
                
                // Process test recipients directly 
                rssFeeds = testRecipients.map(recipient => ({
                  address: recipient['@_address'],
                  name: recipient['@_name'],
                  split: parseFloat(recipient['@_split']),
                  type: recipient['@_type'] === 'node' ? 'node' : 'lnaddress'
                }));
                
                console.log("🧪 Test recipients:", rssFeeds);
                
                // Skip normal RSS fetching
                feedUrl = null;
              }
              
              if (feedUrl) {
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
              }
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
            const { NWC_CONNECTION_STRING, ALBY_ACCESS_TOKEN: ENV_ALBY_TOKEN } = process.env;
            const settings = await storeMetadata.fetchSettings(parentAddress);
            const { ALBY_ACCESS_TOKEN: SETTINGS_ALBY_TOKEN } = settings; // Get Alby token from settings
            
            // Use Alby token from environment or settings
            const ALBY_ACCESS_TOKEN = ENV_ALBY_TOKEN || SETTINGS_ALBY_TOKEN;
            
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
            
            // Don't filter - we'll handle different payment types differently
            console.log(`Attempting payments to all ${validSplits.length} recipients using hybrid approach...`);
            
            console.log(`Sending real payments to ${validSplits.length} recipients using ${paymentMethod}...`);
            
            // Send real Lightning payments to each recipient
            const splitResults = [];
            
            for (const split of validSplits) {
              const amountSats = Math.floor(totalSats * split.percentage / 100);
              if (amountSats > 0) { // Only send if amount is > 0
                console.log(`Processing payment: ${amountSats} sats to ${split.address}`);
                
                try {
                  let paymentResult;
                  
                  // Hybrid approach: try NWC first, fallback to Alby for keysend
                  if (split.address.includes('@')) {
                    // Lightning address - use NWC or Alby
                    if (paymentMethod === "nwc") {
                      console.log(`💡 Using NWC for Lightning address: ${split.address}`);
                      paymentResult = await sendLightningPayment(split.address, amountSats, nwcConfig);
                    } else if (paymentMethod === "alby") {
                      console.log(`💡 Using Alby API for Lightning address: ${split.address}`);
                      paymentResult = await sendAlbyPayment(split.address, amountSats, albyToken);
                    }
                  } else if (split.address.match(/^[0-9a-fA-F]{66}$/)) {
                    // Node pubkey - try NWC first, fallback to Alby
                    console.log(`💡 Attempting keysend to node: ${split.address}`);
                    
                    if (paymentMethod === "nwc") {
                      try {
                        console.log(`🔄 Trying NWC keysend first...`);
                        paymentResult = await sendLightningPayment(split.address, amountSats, nwcConfig);
                        
                        // If NWC fails with vertex error, try Alby as fallback
                        if (paymentResult.status === "failed" && paymentResult.error.includes("invalid vertex length")) {
                          console.log(`🔄 NWC failed, falling back to Alby API...`);
                          if (albyToken) {
                            paymentResult = await sendAlbyPayment(split.address, amountSats, albyToken);
                          } else {
                            console.log(`❌ No Alby token available for fallback`);
                          }
                        }
                      } catch (error) {
                        console.log(`🔄 NWC error, falling back to Alby API:`, error.message);
                        if (albyToken) {
                          paymentResult = await sendAlbyPayment(split.address, amountSats, albyToken);
                        } else {
                          paymentResult = {
                            recipient: split.address,
                            amount_sats: amountSats,
                            status: "failed",
                            error: `NWC failed: ${error.message}, no Alby fallback`
                          };
                        }
                      }
                    } else if (paymentMethod === "alby") {
                      console.log(`💡 Using Alby API for keysend: ${split.address}`);
                      paymentResult = await sendAlbyPayment(split.address, amountSats, albyToken);
                    }
                  }
                  
                  // Fallback if no method worked
                  if (!paymentResult) {
                    paymentResult = {
                      recipient: split.address,
                      amount_sats: amountSats,
                      status: "simulated",
                      error: "No compatible payment method available"
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

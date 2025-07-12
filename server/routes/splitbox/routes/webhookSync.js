import confirmInvoice from "../functions/getSplits/confirmInvoice.js";
import getSplits from "../functions/getSplits/getSplits.js";
import processPayments from "../functions/payments/processPayments.js";

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
            
            // For demo purposes, let's simulate the splitting process
            const splitResults = settings.splits.map(split => ({
              recipient: split.address,
              name: split.name,
              percentage: split.percentage,
              amount_sats: Math.floor((metadata.value_msat_total / 1000) * split.percentage / 100),
              status: "simulated", // In real implementation, this would be the actual payment status
              type: split.type
            }));

            console.log("Split results:", splitResults);

            await storeMetadata.updateById(id, { 
              completedPayments: splitResults,
              splits_processed: true 
            });

            res.json({ 
              success: true,
              id: id,
              completedPayments: splitResults,
              message: "Splits processed (simulated)"
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

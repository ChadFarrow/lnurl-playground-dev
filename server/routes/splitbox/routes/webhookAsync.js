import confirmInvoice from "../functions/getSplits/confirmInvoice.js";
import getSplits from "../functions/getSplits/getSplits.js";

function webhookAsync(storeMetadata) {
  return async (req, res) => {
    try {
      res.json({ message: "Payment request received" });
      setImmediate(async () => {
        const data = req.body;
        if (data.payment_request) {
          let preimage = data.preimage;
          let invoice = data.payment_request;

          // Send the response immediately, so the client isn't waiting

          // Now process the data asynchronously after the response

          try {
            if (confirmInvoice(preimage, invoice)) {
              await storeMetadata.updateByInvoice(invoice, { settled: true });

              const metadataData = await storeMetadata.getByInvoice(invoice);
              const { metadata } = metadataData;
              let splits = await getSplits(metadata);

              // You can log or handle the results here as needed
            }
          } catch (processingError) {
            console.error(
              "Error during post-response processing:",
              processingError.message
            );
          }
        } else {
          console.error("Bad request: Missing payment_request");
        }
      });
    } catch (error) {
      console.error("Webhook processing error:", error.message);
    }
  };
}

export default webhookAsync;

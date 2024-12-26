import getPWInvoice from "../functions/password/getPWInvoice.js";
import { v4 as uuidv4 } from "uuid";

function resetPassword(storeMetadata) {
  return async (req, res) => {
    const { address, password } = req.body;

    const resetID = "tsb" + uuidv4();

    try {
      const invoiceData = await getPWInvoice(address, 1000, resetID);

      await storeMetadata.resetPassword({
        address,
        password,
        invoice: invoiceData.pr,
        verifyCB: invoiceData.verify,
        resetID,
      });

      res.json({ invoiceData });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server error");
    }
  };
}

export default resetPassword;

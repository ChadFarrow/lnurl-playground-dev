import express from "express";
import axios from "axios";
import { io } from "socket.io-client";
import { randomUUID } from "crypto";
import mongoStore from "../../stores/mongo/store.js";
const storeMetadata = mongoStore;

const router = express.Router();

router.get("/lnurlp/:name", (req, res) => {
  const { name } = req.params; // Extract the dynamic part from the route

  res.json({
    status: "OK",
    tag: "payRequest",
    commentAllowed: 255,
    callback: `https://thesplitbox.com/lnurlp/${name}/callback`, // Use the dynamic name
    metadata: `[["text/identifier","${name}@thesplitbox.com"],["text/plain","Sats for ${name}"]]`,
    minSendable: 1000,
    maxSendable: 10000000000,
    payerData: {
      name: { mandatory: false },
      email: { mandatory: false },
      pubkey: { mandatory: false },
    },
    nostrPubkey:
      "23103189356cf7c8bc09bb8b431fc3e71e85582c8f755b9ee160203c9c19e403",
    allowsNostr: true,
  });
});

router.get("/lnurlp/:name/callback", async (req, res) => {
  const { name } = req.params;
  const { amount } = req.query;

  console.log(name);

  if (!amount) {
    return res.status(400).json({ status: "ERROR", message: "Missing amount" });
  }

  const taskMatch = name.match(/^tsk-([0-9a-fA-F-]{36})$/);
  if (taskMatch) {
    const guid = taskMatch[1];
    const url = `https://api.thesplitkit.com/event?event_id=${guid}`;

    try {
      const metaID = randomUUID();
      const payload = await getRemoteValue(url);
      const albyResponse = await axios.get(
        `https://getalby.com/lnurlp/thesplitbox/callback`,
        { params: { amount, comment: `tsk-${metaID}` } }
      );
      let invoiceData = albyResponse.data;
      let invoice = invoiceData.pr;

      const newMetadata = {
        id: metaID,
        invoice,
        ...payload,
      };
      storeMetadata.addTSK(newMetadata);

      return res.json({
        status: "OK",
        metaID,
        invoice: albyResponse.data,
        ...payload,
      });
    } catch (error) {
      return res.status(504).json({ status: "ERROR", message: error.message });
    }
  }

  // Default response for non-task names
  res.json({
    status: "OK",
    tag: "payRequest",
    commentAllowed: 255,
    callback: `https://getalby.com/lnurlp/${name}/callback`,
    metadata: `[["text/identifier","${name}@getalby.com"],["text/plain","Sats for thesplitbox"]]`,
    minSendable: 1000,
    maxSendable: 10000000000,
    payerData: {
      name: { mandatory: false },
      email: { mandatory: false },
      pubkey: { mandatory: false },
    },
    nostrPubkey:
      "79f00d3f5a19ec806189fcab03c1be4ff81d18ee4f653c88fac41fe03570f432",
    allowsNostr: true,
  });
});

const wellknownRoutes = router;
export default wellknownRoutes;

async function getRemoteValue(url) {
  return new Promise((resolve, reject) => {
    const socket = io(url, { transports: ["websocket"] });

    console.log(socket);

    socket.on("remoteValue", async (data) => {
      socket.disconnect(); // Close connection after receiving data

      resolve(data);
    });

    // Timeout to prevent waiting indefinitely
    setTimeout(() => {
      console.log("No remoteValue received, closing connection.");
      socket.disconnect();
      reject(new Error("No response from TheSplitKit"));
    }, 20000);
  });
}

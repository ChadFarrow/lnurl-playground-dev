import axios from "axios";
import { io } from "socket.io-client";
import { randomUUID } from "crypto";
let valueTimer;

async function getRemoteValue(guid) {
  const url = `https://api.thesplitkit.com/event?event_id=${guid}`;
  console.log(url);
  return new Promise((resolve, reject) => {
    const socket = io(url, { transports: ["websocket"] });
    socket.on("remoteValue", async (data) => {
      console.log(data);
      socket.disconnect(); // Close connection after receiving data
      if (!data.guid) {
        const url = `https://api.thesplitkit.com/api/sk/getblocks?guid=${guid}`;
        console.log(url);
      }
      data.guid = data.guid || guid;
      clearTimeout(valueTimer);
      resolve(data);
    });

    // Timeout to prevent waiting indefinitely
    valueTimer = setTimeout(() => {
      console.log("No remoteValue received, closing connection.");
      socket.disconnect();
      const url = `https://api.thesplitkit.com//api/sk/getblocks?guid=${guid}`;
      console.log(url);
      resolve({ guid });
    }, 10000);
  });
}

async function handleTskCallback(guid, amount, comment, res, storeMetadata) {
  try {
    const metaID = randomUUID();
    console.log(guid);
    const payload = await getRemoteValue(guid);
    const albyResponse = await axios.get(
      `https://getalby.com/lnurlp/thesplitbox/callback`,
      {
        params: {
          amount,
          comment: `http://localhost:3000/tsk/metadata/${metaID}`,
        },
      }
    );
    let invoiceData = albyResponse.data;
    let invoice = invoiceData.pr;

    console.log(`http://localhost:3000/metadata/${metaID}`);
    const newMetadata = {
      id: metaID,
      ts: new Date().getTime(),
      comment,
      invoice,
      ...payload,
    };

    storeMetadata.add(newMetadata, "tsb-tsk");

    return res.json(albyResponse.data);
  } catch (error) {
    return res.status(504).json({ status: "ERROR", message: error.message });
  }
}

function lnurlp(storeMetadata) {
  return async (req, res) => {
    const { name } = req.params;
    const { amount, comment } = req.query;

    if (!amount) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Missing amount" });
    }

    const tskMatch = name.match(/^tsk-([0-9a-fA-F-]{36})$/);
    if (tskMatch) {
      return handleTskCallback(
        tskMatch[1],
        amount,
        comment,
        res,
        storeMetadata
      );
    }

    // Default response for non-task names
    res.json({
      status: "OK",
      tag: "payRequest",
      commentAllowed: 255,
      callback: `https://getalby.com/lnurlp/${name}/callback`,
      metadata: `[["text/identifier","${name}@getalby.com"],["text/plain",${name}]]`,
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
  };
}

export default lnurlp;

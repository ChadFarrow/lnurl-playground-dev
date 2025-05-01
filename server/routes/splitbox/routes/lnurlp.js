import axios from "axios";
import { io } from "socket.io-client";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
let valueTimer;

if (!process.env.WEBHOOK_SERVER) {
  dotenv.config();
}

async function getBlock(guid) {
  const url = `https://api.thesplitkit.com/event?event_id=${guid}`;
  return new Promise((resolve, reject) => {
    const socket = io(url, { transports: ["websocket"] });
    socket.on("remoteValue", async (data) => {
      socket.disconnect(); // Close connection after receiving data
      if (!data?.blockGuid) {
        data = await handleEventFallback(guid);
      }

      clearTimeout(valueTimer);
      resolve(stripValueBlock(data));
    });

    // Timeout to prevent waiting indefinitely
    valueTimer = setTimeout(async () => {
      console.log("No block received, closing connection.");
      socket.disconnect();
      const data = stripValueBlock(await handleEventFallback(guid));

      resolve(data);
    }, 10000);
  });
}

async function handleEventFallback(guid) {
  const url = `https://api.thesplitkit.com/api/sk/getblocks?guid=${guid}`;
  const res = await fetch(url);
  let block = {};
  try {
    const data = await res.json();
    if (data?.blocks[0]) {
      block = data.blocks[0];
    }
  } catch (error) {}

  return block;
}

function stripValueBlock(block) {
  let data = {};
  data.eventGuid = block?.eventGuid;
  data.blockGuid = block?.blockGuid;
  data.value = block?.value || {};
  return data;
}

async function handleTskCallback(
  guid,
  amount,
  comment,
  rawNostr,
  nostr,
  payerdata,
  res,
  storeMetadata
) {
  try {
    const metaID = randomUUID();
    const payload = await getBlock(guid);
    const albyResponse = await axios.get(
      `https://getalby.com/lnurlp/thesplitbox/callback`,
      {
        params: {
          amount,
          comment: `${process.env.WEBHOOK_SERVER}/metadata/${metaID}`,
          nostr: rawNostr,
        },
      }
    );
    let invoiceData = albyResponse.data;
    let invoice = invoiceData.pr;

    const newMetadata = {
      id: metaID,
      ts: new Date().getTime(),
      comment,
      invoice,
      payerdata,
      nostr,
      ...payload,
    };

    storeMetadata.add(newMetadata);

    return res.json(albyResponse.data);
  } catch (error) {
    return res.status(504).json({ status: "ERROR", message: error.message });
  }
}

function lnurlp(storeMetadata) {
  return async (req, res) => {
    const { name } = req.params;
    const { amount, comment, nostr, payerdata } = req.query;

    if (!amount) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Missing amount" });
    }

    let decodedPayerdata = null;
    if (payerdata) {
      try {
        decodedPayerdata = JSON.parse(payerdata);
      } catch (error) {
        return res
          .status(400)
          .json({ status: "ERROR", message: "Invalid payerdata" });
      }
    }

    let decodedNostr = null;
    if (nostr) {
      try {
        decodedNostr = JSON.parse(nostr);
      } catch (error) {
        return res
          .status(400)
          .json({ status: "ERROR", message: "Invalid nostr data" });
      }
    }

    const tskMatch = name.match(/^tsk-([0-9a-fA-F-]{36})$/);
    if (tskMatch) {
      return handleTskCallback(
        tskMatch[1],
        amount,
        comment,
        nostr,
        decodedNostr,
        decodedPayerdata,
        res,
        storeMetadata
      );
    }

    // Default response for non-tsk names
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

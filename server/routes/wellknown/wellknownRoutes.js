import express from "express";
const router = express.Router();

router.get("/lnurlp/prism", (req, res) => {
  res.json({
    status: "OK",
    tag: "payRequest",
    commentAllowed: 255,
    callback: "https://getalby.com/lnurlp/prism/callback",
    metadata:
      '[["text/identifier","prism@getalby.com"],["text/plain","Sats for prism"]]',
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

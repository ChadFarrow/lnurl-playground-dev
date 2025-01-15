import express from "express";
const router = express.Router();

router.get("/lnurlp/:name", (req, res) => {
  const { name } = req.params; // Extract the dynamic part from the route

  res.json({
    status: "OK",
    tag: "payRequest",
    commentAllowed: 255,
    // callback: `https://thesplitbox.com/lnurlp/${name}/callback`, // Use the dynamic name
    // metadata: `[["text/identifier","${name}@thesplitbox.com"],["text/plain","Sats for ${name}"]]`,,
    callback: `https://getalby.com/lnurlp/prism/callback`, // Use the dynamic name
    metadata: `[["text/identifier","prism@getalby.com"],["text/plain","Sats for ${name}"]]`,
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

const wellknownRoutes = router;
export default wellknownRoutes;

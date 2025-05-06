import express from "express";

const router = express.Router();

router.get("/lnurlp/:name", (req, res) => {
  const { name } = req.params; // Extract the dynamic part from the route

  res.json({
    status: "OK",
    tag: "payRequest",
    commentAllowed: 255,
    callback: `https://thesplitbox.com/lnurlp/${name}/callback`, // Use the dynamic name
    metadata: `[["text/identifier","${name}@thesplitbox.com"],["text/plain","${name}"]]`,
    minSendable: 1000,
    maxSendable: 10000000000,
    payerData: {
      name: { mandatory: false },
      email: { mandatory: false },
      pubkey: { mandatory: false },
    },
    nostrPubkey:
      "4484c8d3dfcefab6cd348d2ff05f50873d5a59811c141f9f3b1b227ddef143df",
    allowsNostr: true,
  });
});

const wellknownRoutes = router;
export default wellknownRoutes;

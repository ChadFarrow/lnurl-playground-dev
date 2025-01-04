import express from "express";

import cors from "cors";

const router = express.Router();
const corsOptions = { origin: "*" };

async function handle(fn, req, res) {
  const handler = await fn(storeMetadata);
  handler(req, res);
}

// Hello World route
router.post("/", (req, res) => {
  console.log("hi");
  res.send("Hello World");
});

router.post("/test", (req, res) => {
  console.log("hi");
  res.send("Hello World");
});

router.options("/webhook-test", cors(corsOptions)); // Preflight
router.post("/webhook-test", cors(corsOptions), (req, res) =>
  handle(invoice, req, res)
);

const strikeRoutes = router;

export default strikeRoutes;

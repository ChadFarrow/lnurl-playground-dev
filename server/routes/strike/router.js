import express from "express";
import cors from "cors";
import mongoStore from "../../stores/mongo/store.js";

import webhookTest from "./webhook-test.js";
import webhookTestAlby from "./webhook-test-alby.js";

const storeMetadata = mongoStore;
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
  handle(webhookTest, req, res)
);

router.options("/webhook-test-alby", cors(corsOptions)); // Preflight
router.post("/webhook-test-alby", cors(corsOptions), (req, res) =>
  handle(webhookTestAlby, req, res)
);

const strikeRoutes = router;

export default strikeRoutes;

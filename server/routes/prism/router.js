import express from "express";
import cors from "cors";
import mongoStore from "../../stores/mongo/store.js";

import webhook from "./webhook.js";
import getPrismWebhook from "./getwebhook.js";

const storeMetadata = mongoStore;
const router = express.Router();
const corsOptions = { origin: "*" };

async function handle(fn, req, res) {
  const handler = await fn(storeMetadata);
  handler(req, res);
}

router.get("/test", (req, res) => {
  res.send("Hello World");
});

router.options("/webhook", cors(corsOptions)); // Preflight
router.post("/webhook", cors(corsOptions), (req, res) => {
  console.log("prism webhook test");
  return handle(webhook, req, res);
});

router.post("/webhook", cors(corsOptions), (req, res) => {
  return handle(getPrismWebhook, req, res);
});

const prismRoutes = router;

export default prismRoutes;

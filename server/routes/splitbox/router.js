import express from "express";
import cors from "cors";
import mongoStore from "../../stores/mongo/store.js";

//routes
import invoice from "./routes/invoice.js";
import webhookSync from "./routes/webhookSync.js";
import webhookAsync from "./routes/webhookAsync.js";
import saveSettings from "./routes/saveSettings.js";
import fetchSettings from "./routes/fetchSettings.js";
import getById from "./routes/getById.js";
import lnurlp from "./routes/lnurlp.js";

const storeMetadata = mongoStore;
const router = express.Router();
const corsOptions = { origin: "*" };

async function handle(fn, req, res) {
  const handler = await fn(storeMetadata);
  handler(req, res);
}

router.options("/invoice", cors(corsOptions)); // Preflight
router.post("/invoice", cors(corsOptions), (req, res) =>
  handle(invoice, req, res)
);

router.options("/webhook-sync", cors(corsOptions)); // Preflight
router.post("/webhook-sync", cors(corsOptions), (req, res) =>
  handle(webhookSync, req, res)
);

router.options("/webhook-async", cors(corsOptions)); // Preflight
router.post("/webhook-async", cors(corsOptions), (req, res) =>
  handle(webhookAsync, req, res)
);

router.post("/save-settings", async (req, res) =>
  handle(saveSettings, req, res)
);

router.get("/fetch-settings", async (req, res) =>
  handle(fetchSettings, req, res)
);

router.get("/metadata/:id", async (req, res) => {
  const { id } = req.params;
  let data = await storeMetadata.getById(id);
  res.json(data);
});

router.get("/lnurlp/:name/callback", async (req, res) =>
  handle(lnurlp, req, res)
);

export default router;

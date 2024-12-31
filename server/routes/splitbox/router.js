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

const storeMetadata = mongoStore;
const router = express.Router();
const corsOptions = { origin: "*" };

async function handle(fn, req, res) {
  const handler = await fn(storeMetadata);
  handler(req, res);
}

router.post("/invoice", cors(corsOptions), (req, res) =>
  handle(invoice, req, res)
);

router.post("/webhook-sync", cors(corsOptions), (req, res) =>
  handle(webhookSync, req, res)
);

router.post("/webhook-async", cors(corsOptions), (req, res) =>
  handle(storeMetadata, req, res)
);

router.post("/save-settings", async (req, res) =>
  handle(saveSettings, req, res)
);

router.get("/fetch-settings", async (req, res) =>
  handle(fetchSettings, req, res)
);

router.get("/metadata/:id", (req, res) => {
  const { id } = req.params;
  handle((store) => getById(store, id), req, res);
});

export default router;

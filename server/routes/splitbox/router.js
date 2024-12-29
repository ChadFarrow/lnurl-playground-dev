import express from "express";
import mongoStore from "../../stores/mongo/store.js";

//routes
import invoice from "./routes/invoice.js";
import webhookSync from "./routes/webhookSync.js";
import webhookAsync from "./routes/webhookAsync.js";
import saveSettings from "./routes/saveSettings.js";
import fetchSettings from "./routes/fetchSettings.js";
import getById from "./routes/getById.js";

//change this to whatever your preferred data storage is
const storeMetadata = mongoStore;

const router = express.Router();

async function handle(fn, req, res) {
  const handler = await fn(storeMetadata);
  handler(req, res);
}

router.post("/invoice", (req, res) => handle(invoice, req, res));

router.post("/webhook-sync", (req, res) => handle(webhookSync, req, res));

router.post("/webhook-async", (req, res) => handle(storeMetadata, req, res));

router.post("/save-settings", async (req, res) =>
  handle(saveSettings, req, res)
);

router.get("/fetch-settings", async (req, res) =>
  handle(fetchSettings, req, res)
);

router.get("/metadata/:id", (req, res) => {
  const { id } = req.params;
  console.log(id);
  handle((store) => getById(store, id), req, res);
});

export default router;

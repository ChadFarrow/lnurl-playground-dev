import express from "express";
import mongoStore from "../../stores/mongo/store.js";

//routes
import invoice from "./routes/invoice.js";
import webhookSync from "./routes/webhookSync.js";
import webhookAsync from "./routes/webhookAsync.js";
import resetPassword from "./routes/resetPassword.js";
import saveSettings from "./routes/saveSettings.js";

//change this to whatever your preferred data storage is
const storeMetadata = mongoStore;

const router = express.Router();

router.post("/invoice", (req, res) => invoice(storeMetadata)(req, res));

router.post("/webhook-sync", (req, res) =>
  webhookSync(storeMetadata)(req, res)
);

router.post("/webhook-async", (req, res) =>
  webhookAsync(storeMetadata)(req, res)
);

router.post("/reset-password", (req, res) =>
  resetPassword(storeMetadata)(req, res)
);

router.post("/save-settings", (req, res) =>
  saveSettings(storeMetadata)(req, res)
);

export default router;

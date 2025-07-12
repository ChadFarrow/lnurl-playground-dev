import express from "express";
import cors from "cors";
import inMemoryStore from "../../stores/inMemoryStore.js";

//routes
import invoice from "./routes/invoice.js";
import webhookSync from "./routes/webhookSync.js";
import webhookAsync from "./routes/webhookAsync.js";
import saveSettings from "./routes/saveSettings.js";
import fetchSettings from "./routes/fetchSettings.js";
import getById from "./routes/getById.js";
import lnurlp from "./routes/lnurlp.js";

const storeMetadata = inMemoryStore;
const router = express.Router();
const corsOptions = { 
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

// Apply CORS to all routes
router.use(cors(corsOptions));

function handle(fn, req, res) {
  const handler = fn(storeMetadata);
  handler(req, res);
}

router.post("/invoice", (req, res) =>
  handle(invoice, req, res)
);

router.post("/webhook-sync", (req, res) =>
  handle(webhookSync, req, res)
);

router.post("/webhook-async", (req, res) =>
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

router.get("/lnurlp/:address/callback", async (req, res) =>
  handle(lnurlp, req, res)
);

export default router;

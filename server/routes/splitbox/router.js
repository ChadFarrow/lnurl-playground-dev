import express from "express";
import cors from "cors";
import inMemoryStore from "../../stores/inMemoryStore.js";
import processPayments from "./functions/payments/processPayments.js";

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
  origin: ["http://localhost:5173", "http://localhost:4000", "http://localhost:4001", "http://Chads-Mac-mini.local:4000", "http://chads-mac-mini.local:4000"],
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

// Debug endpoint to test payment processing
router.post("/debug-payment", async (req, res) => {
  try {
    console.log("🧪 Debug payment test initiated");
    const { accessToken, splits, metadata, id } = req.body;
    
    console.log("Test data:", { accessToken: !!accessToken, splits: splits?.length, metadata: !!metadata, id });
    
    const results = await processPayments({
      accessToken,
      splits: splits || [],
      metadata,
      id: id || "test-id"
    });
    
    res.json({
      success: true,
      results,
      message: "Payment processing test completed"
    });
  } catch (error) {
    console.error("Debug payment error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

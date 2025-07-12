import express from "express";
import cors from "cors";
import auth from "./auth.js";
import refresh from "./refresh.js";
import boost from "./boost.js";
import logout from "./logout.js";
import lnurlp from "./lnurlp.js";
import payInvoice from "./payInvoice.js";

import bodyParser from "body-parser";

const router = express.Router();

const albyRoutes = (tempTokens) => {
  const corsOptions = {
    origin: ["http://localhost:5173", "http://localhost:4000", "http://localhost:4001", "http://Chads-Mac-mini.local:4000", "http://chads-mac-mini.local:4000"],
    credentials: true
  };

  router.use(cors(corsOptions));
  
  router.use((req, res, next) => {
    req.tempTokens = tempTokens;
    next();
  });

  router.get("/auth", auth);
  router.get("/refresh", refresh);
  router.get("/account", refresh);
  router.post("/boost", boost);
  router.post("/pay-invoice", payInvoice);
  router.post("/lnurlp", lnurlp);
  router.get("/logout", logout);

  return router;
};

export default albyRoutes;

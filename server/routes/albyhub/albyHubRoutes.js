import express from "express";
import cors from "cors";
import payInvoice from "./payInvoice.js";

const router = express.Router();

const albyHubRoutes = () => {
  const corsOptions = {
    origin: "http://localhost:5173",
    credentials: true
  };

  router.use(cors(corsOptions));
  
  router.post("/pay-invoice", payInvoice);
  
  router.get("/test", (req, res) => {
    res.json({ message: "AlbyHub integration working" });
  });

  return router;
};

export default albyHubRoutes;
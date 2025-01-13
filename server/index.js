import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors"; // Import the CORS package
import fs from "fs";
import axios from "axios";
import fetch from "node-fetch";

import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
} from "nostr-tools/pure";

import albyRoutes from "./routes/alby/albyRoutes.js";
import splitBoxRouter from "./routes/splitbox/router.js";
import strikeRoutes from "./routes/strike/router.js";
import wellknownRoutes from "./routes/wellknown/wellknownRoutes.js";
import prismRoutes from "./routes/prism/router.js";

const PORT = 3000; // Server port
const app = express();

dotenv.config();

app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  const allowedOrigins = ["http://localhost:5173"];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (allowedOrigins.includes(origin) || !origin) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
  );

  app.use(express.static(path.join(process.cwd(), "/server/public")));
} else {
  // Serve static files from 'public' folder
  app.use(express.static(path.join(process.cwd(), "/public")));
}

app.use(express.json()); // Parse JSON request bodies

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

let tempTokens = {};
if (process.env.ALBY_JWT) {
  app.use("/alby", albyRoutes(tempTokens));
}

app.use("/strike", strikeRoutes);

app.use("/", splitBoxRouter);

app.use("/.well-known", cors({ origin: "*" }), wellknownRoutes);

app.use("/prism", prismRoutes);

app.get("/lnurlp/:name/callback/", async (req, res) => {
  const { name } = req.params;
  const { amount, comment } = req.query;
  let { nostr } = req.query;
  const filePath = "callbackData.json"; // File to store JSON data

  try {
    // Read or initialize the JSON file
    let data = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      data = JSON.parse(fileContent);
    }

    if (nostr) {
      try {
        nostr = JSON.parse(nostr);
        const tags = nostr?.tags;

        if (tags) {
          tags.push(["splitbox", name]);
        }
        console.log(nostr);
      } catch (error) {}
      nostr = encodeURI(JSON.stringify(nostr));
    }
    console.log(nostr);

    // Update the file with the new entry
    const newEntry = { callBackName: name, amount, nostr };
    data.push(newEntry);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // Send the queries to the external API
    const response = await axios.get(
      "https://getalby.com/lnurlp/prism/callback",
      { params: { amount, comment, nostr } }
    );

    // Return the response from the external API
    res.json(response.data);

    // const response = await fetch(
    //   `https://getalby.com/lnurlp/prism/callback?amount=${amount}&nostr=${nostr}`
    // );

    // const invoice = await response.json();

    // console.log(invoice);
    // return invoice;
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`The Split Box is running on http://localhost:${PORT}`);
});

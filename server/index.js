import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors"; // Import the CORS package

import albyRoutes from "./routes/alby/albyRoutes.js";
import albyHubRoutes from "./routes/albyhub/albyHubRoutes.js";
import splitBoxRouter from "./routes/splitbox/router.js";
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
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      optionsSuccessStatus: 200
    })
  );

  // Add global preflight handling
  app.options('*', cors());

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
// Only mount Alby routes if credentials are properly configured
if (process.env.ALBY_JWT && process.env.ALBY_JWT !== "this is a random 36 character string to encode the alby refresh token") {
  app.use("/alby", albyRoutes(tempTokens));
} else {
  console.log("⚠️  Alby routes not mounted - credentials not configured");
}

app.use("/albyhub", albyHubRoutes());

app.use("/.well-known", cors({ origin: "*" }), wellknownRoutes);

app.use("/", splitBoxRouter);
app.use("/prism", prismRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`The Split Box is running on http://localhost:${PORT}`);
});

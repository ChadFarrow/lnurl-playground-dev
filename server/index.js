import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors"; // Import the CORS package

import albyRoutes from "./routes/alby/albyRoutes.js";
import splitBoxRouter from "./routes/splitbox/router.js";

const PORT = 3000; // Server port
const app = express();

dotenv.config();

app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  // Enable CORS for localhost:5173
  app.use(
    cors({
      origin: "http://localhost:5173", // Allow only this origin
      methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed methods
      credentials: true, // Allow credentials (cookies, headers, etc.)
    })
  );

  // Serve static files from 'public' folder
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

app.use("/", splitBoxRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`The Split Box is running on http://localhost:${PORT}`);
});

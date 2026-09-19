// ─── Netlify Serverless Function Handler: /api/* ─────────────────────────────
import express from "express";
import serverless from "serverless-http";
import mongoose from "mongoose";
import cors from "cors";
import routes, { seedColleges, seedAdmin, seedSkills } from "../../server/routes.js";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let isConnected = false;
let isSeeded = false;

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Please add it to your Netlify Environment Variables.");
  }
  await mongoose.connect(uri);
  isConnected = true;

  if (!isSeeded) {
    try {
      await Promise.allSettled([seedSkills(), seedColleges(), seedAdmin()]);
      isSeeded = true;
    } catch (e) {
      console.warn("[Netlify Serverless] Background seed notice:", e.message);
    }
  }
}

// Ensure database connection before routing any request
app.use(async (req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[Netlify Function DB Error]", err.message);
    next(err);
  }
});

// Health check endpoint for monitoring
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({
    status: "ok",
    environment: "netlify-serverless",
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
  });
});

// Mount routes on both /api and / so path rewrites work seamlessly
app.use("/api", routes);
app.use("/", routes);

// Global JSON error handler
app.use((err, _req, res, _next) => {
  console.error("[Netlify API Error]:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error occurred.",
  });
});

export const handler = serverless(app);

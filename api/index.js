// ─── Vercel Serverless Function Handler: /api/* ───────────────────────────────
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import routes, { seedColleges, seedAdmin, seedSkills } from "../server/routes.js";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let cachedConn = null;
let isSeeded = false;

async function connectDB() {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined.");
  }

  cachedConn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    maxPoolSize: 10,
  });

  if (!isSeeded) {
    isSeeded = true;
    Promise.allSettled([seedSkills(), seedColleges(), seedAdmin()]).catch((e) => {
      console.warn("[Vercel Serverless] Seed notice:", e?.message);
    });
  }

  return cachedConn;
}

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[DB Connection Error]:", err.message);
    _res.status(503).json({
      error: `Database unavailable: ${err.message}. Please verify MONGODB_URI.`,
    });
  }
});

// Health check endpoint
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({
    status: "ok",
    environment: "vercel-serverless",
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
  });
});

app.use("/api", routes);
app.use("/", routes);

app.use((err, _req, res, _next) => {
  console.error("[API Error]:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error occurred.",
  });
});

export default app;

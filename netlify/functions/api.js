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

let cachedConn = null;
let isSeeded = false;

async function connectDB() {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined in Netlify site settings.");
  }

  cachedConn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    maxPoolSize: 10,
  });

  if (!isSeeded) {
    isSeeded = true;
    Promise.allSettled([seedSkills(), seedColleges(), seedAdmin()]).catch((e) => {
      console.warn("[Netlify Serverless] Seed notice:", e?.message);
    });
  }

  return cachedConn;
}

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

const serverlessHandler = serverless(app, {
  binary: ["application/pdf", "image/*", "application/octet-stream"],
});

export const handler = async (event, context) => {
  // CRITICAL: Tells AWS Lambda not to wait for open Mongoose TCP sockets before freezing
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  try {
    await connectDB();
  } catch (err) {
    console.error("[Netlify DB Connection Error]:", err.message);
    return {
      statusCode: 503,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        error: `Database unavailable: ${err.message}. Please ensure MONGODB_URI is added in Netlify and MongoDB Atlas allows Network Access from 0.0.0.0/0.`,
      }),
    };
  }

  return await serverlessHandler(event, context);
};

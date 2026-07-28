// ─── TimeBank — Express Server ───────────────────────────────────────────────
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import routes, { seedSkills, seedAdmin } from "./routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes — all prefixed with /api
app.use("/api", routes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Connect to MongoDB then start server
async function start() {
  try {
    console.log("\n  TimeBank Server");
    console.log("  ───────────────────────────────");
    console.log("  Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("  ✓ MongoDB connected");

    // Seed default data
    await seedSkills();
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`  ✓ Server running on http://localhost:${PORT}`);
      console.log("  ───────────────────────────────\n");
    });
  } catch (err) {
    console.error("  ✗ Failed to start:", err.message);
    process.exit(1);
  }
}

start();

// ─── TimeBank — Express + Socket.io Server ──────────────────────────────────
import dns from "dns";
try { dns.setDefaultResultOrder?.("ipv4first"); } catch (e) {}
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { initSocket, getIO } from "./sockets.js";
import routes, { seedSkills, seedAdmin, seedColleges } from "./routes.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io server with JWT authentication and push channels
const io = initSocket(httpServer);

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rate-limit auth endpoints — 30 requests per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// API routes — all prefixed with /api
app.use("/api", routes);

// Root route
app.get("/", (_req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding: 4rem 2rem; background: #080b12; color: #fff; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 3rem; border-radius: 12px; max-width: 480px;">
        <h1 style="color: #00c27a; margin-bottom: 1rem; font-size: 28px; font-family: system-ui, sans-serif;">TimeBank API Server</h1>
        <p style="color: #94a3b8; margin-bottom: 2rem; font-size: 15px; line-height: 1.6;">The API backend is running successfully with Socket.io real-time support.</p>
        <a href="http://localhost:5173/" style="display: inline-block; background: #00c27a; color: #080b12; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; transition: all 0.2s;">Go to TimeBank Web App</a>
      </div>
    </div>
  `);
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), socketConnections: io ? io.engine.clientsCount : 0 });
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
    await seedColleges();

    httpServer.listen(PORT, () => {
      console.log(`  ✓ Server running on http://localhost:${PORT}`);
      console.log("  ✓ Socket.io ready for real-time connections");
      console.log("  ───────────────────────────────\n");
    });
  } catch (err) {
    console.error("  ✗ Failed to start:", err.message);
    process.exit(1);
  }
}

start();

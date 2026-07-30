// ─── TimeBank — Express + Socket.io Server ──────────────────────────────────
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import routes, { seedSkills, seedAdmin } from "./routes.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:4173"],
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
  res.json({ status: "ok", timestamp: new Date().toISOString(), socketConnections: io.engine.clientsCount });
});

// ─── SOCKET.IO EVENT HANDLING ────────────────────────────────────────────────
const onlineUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {
  // User joins with their userId
  socket.on("join", (userId) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    socket.join(`user:${userId}`);

    // Broadcast online status
    io.emit("user_online", { userId });
  });

  // Real-time chat message
  socket.on("send_message", (data) => {
    const { chatId, senderId, recipientId, text } = data;
    // Emit to the recipient
    io.to(`user:${recipientId}`).emit("new_message", {
      chatId, senderId, text, createdAt: new Date().toISOString(),
    });
  });

  // Typing indicator
  socket.on("typing", (data) => {
    const { chatId, recipientId, isTyping } = data;
    io.to(`user:${recipientId}`).emit("user_typing", {
      chatId, userId: socket.userId, isTyping,
    });
  });

  // Read receipt
  socket.on("read_messages", (data) => {
    const { chatId, senderId } = data;
    io.to(`user:${senderId}`).emit("messages_read", {
      chatId, readBy: socket.userId,
    });
  });

  // Push notification to specific user
  socket.on("push_notification", (data) => {
    const { targetUserId, notification } = data;
    io.to(`user:${targetUserId}`).emit("notification", notification);
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("user_offline", { userId: socket.userId });
    }
  });
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

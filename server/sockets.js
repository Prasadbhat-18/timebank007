// ─── TimeBank — Socket.io & Real-Time Push Service ───────────────────────────
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Notification } from "./models.js";

const JWT_SECRET = process.env.JWT_SECRET || "timebank_super_secret_key";
const userSockets = new Map(); // userId -> Set of socketIds
let ioInstance = null;

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:4173", "http://localhost:3000", "*"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  // Authentication Middleware for Sockets
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, "");
      if (token) {
        const payload = jwt.verify(token, JWT_SECRET);
        socket.userId = payload.id;
        socket.userRole = payload.role;
        socket.userCollege = payload.college;
      }
      // Allow connection even if token not provided initially (guest / landing)
      next();
    } catch {
      // If token was invalid, continue without userId or let connection proceed
      next();
    }
  });

  io.on("connection", (socket) => {
    // Authenticated user register or explicit join
    const registerUserSocket = (uid) => {
      if (!uid) return;
      socket.userId = uid;
      if (!userSockets.has(String(uid))) {
        userSockets.set(String(uid), new Set());
      }
      userSockets.get(String(uid)).add(socket.id);
      socket.join(`user:${uid}`);
      io.emit("user_online", { userId: uid });
    };

    if (socket.userId) {
      registerUserSocket(socket.userId);
    }

    socket.on("join", (userId) => {
      registerUserSocket(userId);
    });

    // Real-time chat message
    socket.on("send_message", (data) => {
      const { chatId, senderId, recipientId, text } = data;
      io.to(`user:${recipientId}`).emit("new_message", {
        chatId,
        senderId,
        text,
        createdAt: new Date().toISOString(),
      });
    });

    // Typing indicator
    socket.on("typing", (data) => {
      const { chatId, recipientId, isTyping } = data;
      io.to(`user:${recipientId}`).emit("user_typing", {
        chatId,
        userId: socket.userId,
        isTyping,
      });
    });

    // Read receipt
    socket.on("read_messages", (data) => {
      const { chatId, senderId } = data;
      io.to(`user:${senderId}`).emit("messages_read", {
        chatId,
        readBy: socket.userId,
      });
    });

    // Custom push notification emit from client
    socket.on("push_notification", (data) => {
      const { targetUserId, notification } = data;
      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit("notification", notification);
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      if (socket.userId) {
        const uidStr = String(socket.userId);
        const set = userSockets.get(uidStr);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            userSockets.delete(uidStr);
            io.emit("user_offline", { userId: socket.userId });
          }
        }
      }
    });
  });

  ioInstance = io;
  return io;
}

export function getIO() {
  return ioInstance;
}

/**
 * Persists a Notification in MongoDB and pushes real-time event to user's connected socket(s)
 */
export async function pushNotification(userId, { type, title, body, message, data = {} }) {
  try {
    if (!userId) return null;
    const bodyText = body || message || "";
    const msgText = message || body || "";
    
    const notif = await Notification.create({
      userId,
      user: userId,
      type,
      title,
      body: bodyText,
      message: msgText,
      data,
      read: false,
    });

    if (ioInstance) {
      ioInstance.to(`user:${userId}`).emit("notification", {
        _id: notif._id,
        userId: notif.userId,
        user: notif.user,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        message: notif.message,
        data: notif.data,
        read: notif.read,
        createdAt: notif.createdAt,
      });
    }

    return notif;
  } catch (err) {
    console.error("Error pushing notification:", err);
    return null;
  }
}

/**
 * Broadcasts an event to all connected sockets in real-time
 */
export function broadcastRealtimeEvent(event, data) {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
}

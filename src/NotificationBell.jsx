import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import * as api from "./api.js";

const NOTIF_ICONS = {
  verification_decision: "🛡️",
  transaction_confirmed: "💸",
  match_request: "🤝",
  match_accepted: "✅",
  flagged_review: "⚠️",
  low_balance: "⏳",
  level_up: "🌟",
  badge: "🏆",
  welcome: "🎉",
  booking: "📅",
  review: "⭐",
  dispute: "⚖️",
  completion: "🏁",
  restriction: "🚫",
};

export default function NotificationBell({ user, notify }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef(null);

  const token = localStorage.getItem("token");
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load existing notifications on mount & user change
  useEffect(() => {
    if (!user?._id) return;
    setLoading(true);
    api.fetchNotifications(user._id)
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch((e) => console.error("Failed to load notifications:", e))
      .finally(() => setLoading(false));

    // Connect to Socket.io
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.emit("join", user._id);

    socket.on("notification", (newNotif) => {
      setNotifications((prev) => {
        // Prevent duplicate items
        if (prev.some((n) => n._id === newNotif._id)) return prev;
        return [newNotif, ...prev];
      });

      if (notify) {
        notify(`🔔 ${newNotif.title}: ${newNotif.body || newNotif.message || ""}`, "info");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id, token, notify]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead(user?._id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="notif-bell-wrapper" ref={bellRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          position: "relative",
          background: open ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.04)",
          border: "1px solid var(--border)",
          borderRadius: "50%",
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
          color: "var(--text)",
        }}
        aria-label="Notifications"
      >
        <span style={{ fontSize: 16 }}>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              background: "#ef4444",
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 800,
              minWidth: 17,
              height: 17,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #080b12",
              boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
              padding: "0 2px",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              right: 0,
              top: 44,
              width: 340,
              maxHeight: 440,
              background: "rgba(12, 16, 26, 0.98)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 14,
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.1)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: "#fff" }}>Notifications</span>
                {unreadCount > 0 && (
                  <span className="tag tg" style={{ fontSize: 10, padding: "2px 6px" }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--em)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", maxHeight: 360, padding: 6 }}>
              {loading && notifications.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  Loading alerts...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#fff", marginBottom: 2 }}>All caught up!</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                    You have no new alerts or activity notifications.
                  </div>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={(e) => !n.read && handleMarkRead(n._id, e)}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      marginBottom: 4,
                      background: n.read ? "transparent" : "rgba(16, 185, 129, 0.06)",
                      border: n.read ? "1px solid transparent" : "1px solid rgba(16, 185, 129, 0.2)",
                      cursor: n.read ? "default" : "pointer",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        flexShrink: 0,
                      }}
                    >
                      {NOTIF_ICONS[n.type] || "🔔"}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <div
                          style={{
                            fontWeight: n.read ? 600 : 700,
                            fontSize: 12.5,
                            color: n.read ? "var(--text)" : "#fff",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {n.title}
                        </div>
                        {!n.read && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              onClick={(e) => handleMarkRead(n._id, e)}
                              style={{
                                background: "rgba(16, 185, 129, 0.15)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                color: "var(--em)",
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                cursor: "pointer",
                                fontWeight: 700,
                              }}
                              title="Mark as read"
                            >
                              ✓ Mark read
                            </button>
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "var(--em)",
                                flexShrink: 0,
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {(n.body || n.message) && (
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-secondary)",
                            marginTop: 2,
                            lineHeight: 1.35,
                          }}
                        >
                          {n.body || n.message}
                        </div>
                      )}

                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

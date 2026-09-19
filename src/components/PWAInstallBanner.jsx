import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setDeferredPrompt(null);
      console.log("[PWA] App was successfully installed!");
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (installed || dismissed || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          width: "calc(100% - 32px)",
          maxWidth: 480,
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(6, 78, 59, 0.95))",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: 14,
          padding: "12px 16px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#0b0f17",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>
              Install TimeBank App
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>
              Add to home screen for 1-tap access & offline alerts
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleInstall}
            style={{
              background: "#fff",
              color: "#064e3b",
              fontWeight: 700,
              fontSize: 12,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: "transparent",
              color: "rgba(255, 255, 255, 0.7)",
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              padding: "4px",
            }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

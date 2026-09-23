import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  handleClearCacheAndReload = async () => {
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
    } catch (e) {
      console.warn("Cache clear error:", e);
    }
    window.location.href = window.location.origin;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#05070c",
            color: "#e2e8f0",
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: "100%",
              background: "rgba(12, 16, 26, 0.95)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
              borderRadius: 16,
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚡</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
              Something interrupted TimeBank
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
              A rendering update was interrupted. You can quickly refresh the app or reset your cached session below.
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: "#fca5a5",
                  marginBottom: "1.5rem",
                  wordBreak: "break-word",
                  textAlign: "left",
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: "#00c27a",
                  color: "#05070c",
                  fontWeight: 600,
                  fontSize: 13,
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 18px",
                  cursor: "pointer",
                }}
              >
                🔄 Refresh Page
              </button>
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#fff",
                  fontWeight: 500,
                  fontSize: 13,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 8,
                  padding: "9px 18px",
                  cursor: "pointer",
                }}
              >
                🧹 Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

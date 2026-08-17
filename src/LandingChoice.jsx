import { motion } from "framer-motion";

export default function LandingChoice({ onSelectRole, onBackToLogin }) {
  return (
    <div className="landing-choice-container" style={{ maxWidth: 520, margin: "0 auto", padding: "1.5rem 1rem", textAlign: "center" }}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            margin: "0 auto 1.25rem",
          }}
        >
          ⏱️
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", marginBottom: 8 }}>
          How would you like to continue?
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: 1.5 }}>
          Choose your account type to personalize your skill exchange and verification workflow.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", marginBottom: "1.75rem" }}>
          {/* Student Card */}
          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole("student")}
            style={{
              background: "rgba(16, 185, 129, 0.04)",
              border: "1.5px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 14,
              padding: "1.25rem 1.5rem",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: "1.25rem",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--em)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.3)")}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              🎓
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>I'm a Student</div>
                <span className="tag tg" style={{ fontSize: 10, padding: "2px 8px" }}>AICTE Enabled</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                College email verification, ID card match & automatic AICTE activity point accreditation with QR-verifiable certificates.
              </div>
            </div>
          </motion.button>

          {/* General User Card */}
          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole("general_user")}
            style={{
              background: "rgba(139, 92, 246, 0.04)",
              border: "1.5px solid rgba(139, 92, 246, 0.3)",
              borderRadius: 14,
              padding: "1.25rem 1.5rem",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: "1.25rem",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--purple)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)")}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(139, 92, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              ⚡
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>I'm a General User</div>
                <span className="tag tp" style={{ fontSize: 10, padding: "2px 8px" }}>Instant Access</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                Quick signup with live face scan. Full access to skill exchanges, wallet credits, peer reviews, and escrow sessions.
              </div>
            </div>
          </motion.button>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem", display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            className="btn btn-o btn-sm"
            onClick={onBackToLogin}
            style={{ color: "var(--text-secondary)", border: "none", background: "transparent" }}
          >
            ← Already have an account? Sign In
          </button>
        </div>
      </motion.div>
    </div>
  );
}

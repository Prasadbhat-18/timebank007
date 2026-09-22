import { useState } from "react";
import "./components/wizard/registrationTheme.css";

export default function LandingChoice({ onSelectRole, onBackToLogin, onBackToHome }) {
  const [selectedRole, setSelectedRole] = useState(null); // 'student' | 'general'
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
  };

  const handleProceed = (role) => {
    const target = role || selectedRole;
    if (target === "student") {
      onSelectRole("student");
    } else if (target === "general" || target === "general_user") {
      onSelectRole("general_user");
    }
  };

  const handleCardKeydown = (e, role) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectRole(role);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      {/* Ambient Pulsing Background Orbs */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div
          className="reg-orb-1"
          style={{
            position: "absolute",
            top: "-6rem",
            left: "20%",
            width: "520px",
            height: "520px",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(59, 130, 246, 0.12) 40%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(60px)",
            opacity: 0.75,
          }}
        />
        <div
          className="reg-orb-2"
          style={{
            position: "absolute",
            top: "30%",
            right: "20%",
            width: "560px",
            height: "560px",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(99, 102, 241, 0.1) 45%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(70px)",
            opacity: 0.7,
          }}
        />
      </div>

      {/* Top Header Navigation */}
      <header
        style={{
          width: "100%",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(12px)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35)",
              color: "#05070c",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            ⏱
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            TimeBank
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: 13.5,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                padding: "6px 10px",
                borderRadius: 8,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              <span>Back to home</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#cbd5e1",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              padding: "5px 12px",
              borderRadius: 8,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#cbd5e1";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
            }}
          >
            Help
          </button>
        </div>
      </header>

      {/* Main Role Selection Area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.25rem", position: "relative", zIndex: 10, width: "100%", maxWidth: 940, margin: "0 auto" }}>
        
        {/* Header Introduction Section */}
        <div style={{ textAlign: "center", maxWidth: 620, padding: "0 1rem", marginBottom: "2rem" }}>
          <div
            className="animate-hero-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 9999,
              background: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.28)",
              color: "#c7d2fe",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "1.25rem",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981", display: "inline-block" }} />
            <span>Get Started with TimeBank</span>
          </div>

          <h1
            className="animate-hero-title"
            style={{
              fontSize: "clamp(26px, 4vw, 36px)",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              margin: "0 0 12px",
            }}
          >
            How would you like to join?
          </h1>

          <p
            className="animate-hero-desc"
            style={{
              fontSize: 15,
              color: "#94a3b8",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Choose the account type that best matches how you plan to exchange skills and earn time credits.
          </p>
        </div>

        {/* 2-Column Grid: Selectable Role Tiles */}
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {/* Tile 1: Student Account */}
          <div
            id="card-student"
            role="button"
            tabIndex={0}
            aria-pressed={selectedRole === "student"}
            className={`reg-role-card animate-card-1 ${selectedRole === "student" ? "is-active" : ""}`}
            onClick={() => handleSelectRole("student")}
            onKeyDown={(e) => handleCardKeydown(e, "student")}
            style={{
              borderColor: selectedRole === "student" ? "#6366f1" : "rgba(255, 255, 255, 0.08)",
            }}
          >
            {/* Top indicator highlight bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: selectedRole === "student" ? "#6366f1" : "transparent",
                transition: "background 0.3s ease",
              }}
            />

            {/* Active Checkmark Badge */}
            <div
              className="selection-check"
              style={{
                display: selectedRole === "student" ? "flex" : "none",
                background: "#6366f1",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontWeight: 700 }}>
                check
              </span>
            </div>

            <div>
              {/* Top Row: Icon Container & Trailing Arrow */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: selectedRole === "student" ? "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" : "rgba(99, 102, 241, 0.15)",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: selectedRole === "student" ? "#ffffff" : "#818cf8",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                    school
                  </span>
                </div>

                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: selectedRole === "student" ? "#6366f1" : "rgba(255, 255, 255, 0.05)",
                    color: selectedRole === "student" ? "#ffffff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    arrow_forward
                  </span>
                </div>
              </div>

              {/* Main Info */}
              <div style={{ marginTop: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                    I'm a Student
                  </h2>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 9999,
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "#34d399",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    Campus &amp; AICTE
                  </span>
                </div>

                <p style={{ fontSize: 13.5, color: "#94a3b8", margin: "8px 0 0", lineHeight: 1.55 }}>
                  Verify with your college email &amp; ID for campus-scoped exchanges, collegiate circles, and AICTE point accreditation.
                </p>
              </div>

              {/* Feature Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "1.25rem" }}>
                <span className="reg-feature-pill">
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#818cf8" }}>
                    domain
                  </span>
                  Campus directory
                </span>
                <span className="reg-feature-pill">
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#34d399" }}>
                    account_balance_wallet
                  </span>
                  AICTE points ledger
                </span>
                <span className="reg-feature-pill">
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#38bdf8" }}>
                    verified_user
                  </span>
                  Verified peer network
                </span>
              </div>
            </div>

            {/* Foot Action Button */}
            <div
              style={{
                marginTop: "1.75rem",
                paddingTop: selectedRole === "student" ? "0" : "1rem",
                borderTop: selectedRole === "student" ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {selectedRole === "student" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProceed("student");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 18px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                    border: "none",
                    borderRadius: 12,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: "0 8px 24px -4px rgba(79, 70, 229, 0.5)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div className="btn-shine-overlay" />
                  <span>Continue as Student →</span>
                  <span style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 500 }}>College ID &amp; OTP</span>
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#94a3b8" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>Select Student Profile</span>
                  <span style={{ fontSize: 12, opacity: 0.7, display: "flex", alignItems: "center", gap: 3 }}>
                    Institutional sign-on
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tile 2: General User Account */}
          <div
            id="card-general"
            role="button"
            tabIndex={0}
            aria-pressed={selectedRole === "general"}
            className={`reg-role-card animate-card-2 ${selectedRole === "general" ? "is-active" : ""}`}
            onClick={() => handleSelectRole("general")}
            onKeyDown={(e) => handleCardKeydown(e, "general")}
            style={{
              borderColor: selectedRole === "general" ? "#6366f1" : "rgba(255, 255, 255, 0.08)",
            }}
          >
            {/* Top indicator highlight bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: selectedRole === "general" ? "#6366f1" : "transparent",
                transition: "background 0.3s ease",
              }}
            />

            {/* Active Checkmark Badge */}
            <div
              className="selection-check"
              style={{
                display: selectedRole === "general" ? "flex" : "none",
                background: "#6366f1",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontWeight: 700 }}>
                check
              </span>
            </div>

            <div>
              {/* Top Row: Icon Container & Trailing Arrow */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: selectedRole === "general" ? "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" : "rgba(99, 102, 241, 0.15)",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: selectedRole === "general" ? "#ffffff" : "#818cf8",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                    public
                  </span>
                </div>

                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: selectedRole === "general" ? "#6366f1" : "rgba(255, 255, 255, 0.05)",
                    color: selectedRole === "general" ? "#ffffff" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    arrow_forward
                  </span>
                </div>
              </div>

              {/* Main Info */}
              <div style={{ marginTop: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                    I'm a General User
                  </h2>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 9999,
                      background: "rgba(139, 92, 246, 0.15)",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      color: "#c084fc",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    Global
                  </span>
                </div>

                <p style={{ fontSize: 13.5, color: "#94a3b8", margin: "8px 0 0", lineHeight: 1.55 }}>
                  Sign up with email OTP and live facial biometric verification to start trading skills across global community circles.
                </p>
              </div>

              {/* Feature Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "1.25rem" }}>
                <span className="reg-feature-pill">
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#818cf8" }}>
                    language
                  </span>
                  Global skill swaps
                </span>
                <span className="reg-feature-pill">
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#c084fc" }}>
                    verified
                  </span>
                  Biometric Face Auth
                </span>
                <span className="reg-feature-pill">
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#38bdf8" }}>
                    swap_horiz
                  </span>
                  Decentralized ledger
                </span>
              </div>
            </div>

            {/* Foot Action Button */}
            <div
              style={{
                marginTop: "1.75rem",
                paddingTop: selectedRole === "general" ? "0" : "1rem",
                borderTop: selectedRole === "general" ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {selectedRole === "general" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProceed("general");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 18px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                    border: "none",
                    borderRadius: 12,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: "0 8px 24px -4px rgba(79, 70, 229, 0.5)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div className="btn-shine-overlay" />
                  <span>Continue as General User →</span>
                  <span style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 500 }}>Face Scan &amp; OTP</span>
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#94a3b8" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>Select General Profile</span>
                  <span style={{ fontSize: 12, opacity: 0.7, display: "flex", alignItems: "center", gap: 3 }}>
                    Instant Access
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>bolt</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Guidance Note Callout with Accordion Micro-interaction */}
        <div className="animate-accordion" style={{ width: "100%", maxWidth: 680, marginTop: "0.5rem" }}>
          <div
            style={{
              borderRadius: 16,
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(12px)",
              overflow: "hidden",
              transition: "border-color 0.25s ease",
            }}
          >
            {/* Header Clickable / Interactive */}
            <button
              type="button"
              aria-controls="compare-accordion"
              aria-expanded={accordionOpen}
              onClick={() => setAccordionOpen(!accordionOpen)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                background: "transparent",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                color: "#e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#818cf8" }}>
                  info
                </span>
                <p style={{ fontSize: 13, color: "#cbd5e1", margin: 0, lineHeight: 1.4 }}>
                  <strong style={{ color: "#ffffff", fontWeight: 600 }}>Not sure?</strong> Students get access to campus point exchanges and verified AICTE trust scores.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#818cf8", paddingLeft: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {accordionOpen ? "Hide Compare" : "Quick Compare"}
                </span>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 20,
                    transform: accordionOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s ease",
                  }}
                >
                  expand_more
                </span>
              </div>
            </button>

            {/* Expanded Comparison Content */}
            <div
              id="compare-accordion"
              className="reg-accordion-content"
              style={{
                maxHeight: accordionOpen ? 300 : 0,
                opacity: accordionOpen ? 1 : 0,
                overflow: "hidden",
                padding: accordionOpen ? "0 1.25rem 1.25rem" : "0 1.25rem",
              }}
            >
              <div
                style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  paddingTop: "1rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <div style={{ padding: "12px", borderRadius: 12, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
                    Verification
                  </span>
                  <p style={{ fontSize: 12.5, color: "#ffffff", fontWeight: 600, margin: "4px 0 0" }}>
                    College Email &amp; ID Card
                    <span style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 400, marginTop: 2 }}>
                      vs. Instant Biometric &amp; OTP
                    </span>
                  </p>
                </div>

                <div style={{ padding: "12px", borderRadius: 12, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
                    Trade Network
                  </span>
                  <p style={{ fontSize: 12.5, color: "#ffffff", fontWeight: 600, margin: "4px 0 0" }}>
                    Campus &amp; Collegiate Hubs
                    <span style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 400, marginTop: 2 }}>
                      vs. Global Reciprocal Community
                    </span>
                  </p>
                </div>

                <div style={{ padding: "12px", borderRadius: 12, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
                    Welcome Bonus
                  </span>
                  <p style={{ fontSize: 12.5, color: "#ffffff", fontWeight: 600, margin: "4px 0 0" }}>
                    10 Starter Credits + AICTE Points
                    <span style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 400, marginTop: 2 }}>
                      vs. 10 Starter Time Credits
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Returning Users Action */}
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={onBackToLogin}
              style={{
                background: "transparent",
                border: "none",
                color: "#10b981",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                textDecoration: "underline",
                textUnderlineOffset: 4,
                marginLeft: 4,
              }}
            >
              <span>Log In</span>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_right_alt</span>
            </button>
          </p>
        </div>

        {/* Trust & Stability Bar */}
        <div
          style={{
            marginTop: "2.5rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem 1.5rem",
            color: "#64748b",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#818cf8" }}>
              lock
            </span>
            <span>256-bit encrypted</span>
          </div>
          <span>•</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#10b981" }}>
              verified
            </span>
            <span>Bilateral verified time credits</span>
          </div>
          <span>•</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#f59e0b" }}>
              volunteer_activism
            </span>
            <span>Zero fees • AICTE recognized</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          width: "100%",
          padding: "1.25rem 1.5rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(8px)",
          position: "relative",
          zIndex: 10,
          fontSize: 12,
          color: "#64748b",
        }}
      >
        <div>
          © 2026 TimeBank Inc. Reciprocal value through human exchange.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ cursor: "pointer", color: "#94a3b8" }} onClick={() => setShowHelpModal(true)}>Privacy</span>
          <span style={{ cursor: "pointer", color: "#94a3b8" }} onClick={() => setShowHelpModal(true)}>Terms</span>
          <span style={{ cursor: "pointer", color: "#94a3b8" }} onClick={() => setShowHelpModal(true)}>Trust &amp; Safety</span>
        </div>
      </footer>

      {/* Quick Help Modal */}
      {showHelpModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 18,
              padding: "1.75rem",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>
                About TimeBank Registration
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13.5, color: "#94a3b8", lineHeight: 1.6, margin: "0 0 1rem" }}>
              TimeBank is a non-monetary skill exchange network where <strong>1 Hour = 1 Time Credit</strong>.
            </p>
            <ul style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, paddingLeft: "1.25rem", margin: "0 0 1.25rem" }}>
              <li><strong>Students:</strong> Register with your college email &amp; ID card to participate in campus exchanges and earn verifiable AICTE activity points.</li>
              <li><strong>General Users:</strong> Quick registration with email and facial biometrics for community-wide skill trading.</li>
              <li>Every user receives <strong>10 Starter Time Credits</strong> upon verification.</li>
            </ul>
            <button
              type="button"
              className="btn btn-p"
              onClick={() => setShowHelpModal(false)}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

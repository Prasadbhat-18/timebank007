import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as api from "./api.js";

export default function AICTEProgress({ user, notify, onOpenVerify }) {
  const [stats, setStats] = useState({
    totalHours: 0,
    activityPoints: 0,
    exchangeCount: 0,
  });
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestModal, setRequestModal] = useState(false);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [isRequesting, setIsRequesting] = useState(false);

  const loadData = useCallback(() => {
    if (!user?._id) return;
    setLoading(true);
    Promise.all([
      api.fetchAicteActivityPoints().catch(() => ({ totalHours: 0, activityPoints: 0, exchangeCount: 0 })),
      api.fetchUserCertificates(user._id).catch(() => []),
    ])
      .then(([ptsData, certs]) => {
        if (ptsData) setStats(ptsData);
        if (Array.isArray(certs)) setCertificates(certs);
      })
      .finally(() => setLoading(false));
  }, [user?._id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestCertificate = async () => {
    if (!periodStart || !periodEnd) {
      notify("Please select both start and end dates.", "error");
      return;
    }
    setIsRequesting(true);
    try {
      const res = await api.requestAicteCertificate(periodStart, periodEnd);
      notify(res.message || "Certificate request forwarded to your Institution Administrator! 📜", "success");
      setRequestModal(false);
    } catch (err) {
      notify(err.message || "Failed to submit certificate request", "error");
    } finally {
      setIsRequesting(false);
    }
  };

  const copyVerifyLink = (certId) => {
    const url = `${window.location.origin}/#verify/${certId}`;
    navigator.clipboard.writeText(url);
    notify("Public verification link copied to clipboard! 📋", "success");
  };

  return (
    <div className="aicte-progress-wrapper" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Hero Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)",
          border: "1.5px solid rgba(16, 185, 129, 0.3)",
          borderRadius: 16,
          padding: "1.75rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🎓</span>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>
                AICTE Activity Point Accreditation
              </h2>
              <span className="tag tg" style={{ fontSize: 11, padding: "2px 8px" }}>Official Scheme</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 500 }}>
              Peer-to-peer technical exchanges and campus service hours converted to certified AICTE Activity Points.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <span className="tag tg" style={{ fontSize: 11, padding: "4px 10px" }}>
              🏛️ Issued Exclusively by {user?.college || "Institution Admin"}
            </span>
            <button
              type="button"
              className="btn btn-o btn-sm"
              onClick={() => setRequestModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}
            >
              <span>📨</span> Request Certificate from Admin
            </button>
          </div>
        </div>

        {/* Big Numbers Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "1rem",
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Activity Points
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--em)", lineHeight: 1.2, marginTop: 4 }}>
              {loading ? "..." : stats.activityPoints}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              1 Point / Hour Exchanged
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Service Hours
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#60a5fa", lineHeight: 1.2, marginTop: 4 }}>
              {loading ? "..." : stats.totalHours}h
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Confirmed P2P time
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Confirmed Exchanges
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#c084fc", lineHeight: 1.2, marginTop: 4 }}>
              {loading ? "..." : stats.exchangeCount}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Mutual confirmations
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Institution
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginTop: 8 }}>
              {user?.college || user?.institution || user?.almaMater || "Independent Scholar"}
            </div>
            <div style={{ fontSize: 11, color: "var(--em)", marginTop: 2 }}>
              {user?.college ? "✓ Scoped Institute" : "Independent Scholar"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Generated Certificates Ledger */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>
              Issued Certificates & Blockchain Credentials ({certificates.length})
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>
              Each certificate is cryptographically hashed with SHA-256 and verified via Polygon QR code.
            </p>
          </div>
        </div>

        {certificates.length === 0 ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", background: "rgba(255, 255, 255, 0.02)", borderRadius: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
            <div style={{ fontWeight: 600, color: "#fff", fontSize: 14, marginBottom: 4 }}>No Accredited Certificates Issued Yet</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", maxWidth: 420, margin: "0 auto 1.25rem", lineHeight: 1.45 }}>
              Official accredited certificates are reviewed, cryptographically anchored, and issued exclusively by your Institution Administrator ({user?.college || "College Admin"}).
            </div>
            <button type="button" className="btn btn-o btn-sm" onClick={() => setRequestModal(true)}>
              📨 Request Certificate from Admin
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {certificates.map((cert) => {
              return (
                <div
                  key={cert._id || cert.certId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    padding: "1rem 1.25rem",
                    background: "rgba(255, 255, 255, 0.025)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>
                        AICTE Certificate · {cert.activityPoints} Points
                      </span>
                      <span className="tag tg" style={{ fontSize: 10 }}>✓ Institution Admin Verified</span>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                      Period: {new Date(cert.periodStart).toLocaleDateString()} – {new Date(cert.periodEnd).toLocaleDateString()} · {cert.totalHours} hrs · {cert.exchangeCount} exchanges
                    </div>

                    <div style={{ fontSize: 10.5, fontFamily: "monospace", color: "var(--text-muted)", marginTop: 4 }}>
                      ID: {cert.certId} · Hash: {cert.integrityHash ? cert.integrityHash.slice(0, 16) : ""}...
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <a
                      href={api.getCertificateDownloadUrl(cert.certId)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-p btn-sm"
                      style={{ fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      📄 Download PDF
                    </a>
                    <button
                      type="button"
                      className="btn btn-o btn-sm"
                      onClick={() => onOpenVerify && onOpenVerify(cert.certId)}
                      style={{ fontSize: 12 }}
                    >
                      🔍 View Proof
                    </button>
                    <button
                      type="button"
                      className="btn btn-o btn-sm"
                      onClick={() => copyVerifyLink(cert.certId)}
                      style={{ fontSize: 12 }}
                    >
                      📋 Copy Link
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Request Certificate from Admin */}
      <AnimatePresence>
        {requestModal && (
          <div className="overlay" onClick={(e) => e.target.className === "overlay" && setRequestModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mo-box"
              style={{ maxWidth: 480 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📨</span> Request Official AICTE Certificate
                </h3>
                <button
                  type="button"
                  onClick={() => setRequestModal(false)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 12.5,
                  color: "#d1fae5",
                  marginBottom: "1.25rem",
                  lineHeight: 1.45,
                }}
              >
                <strong>🏛️ Institutional Authority Policy:</strong> Official AICTE certificates cannot be self-issued by students. Submitting this request forwards your confirmed hours ({stats.totalHours} hrs) and activity points ({stats.activityPoints} pts) to the Administrator of <strong>{user?.college || "your institution"}</strong> for review and Polygon Amoy cryptographic anchoring.
              </div>

              <div className="field">
                <label>Assessment Period Start</label>
                <input
                  type="date"
                  className="fi"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Assessment Period End</label>
                <input
                  type="date"
                  className="fi"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: "1.5rem" }}>
                <button
                  type="button"
                  className="btn btn-p"
                  onClick={handleRequestCertificate}
                  disabled={isRequesting}
                  style={{ flex: 1, fontWeight: 700 }}
                >
                  {isRequesting ? "Forwarding Request..." : "Send Request to College Admin"}
                </button>
                <button
                  type="button"
                  className="btn btn-o"
                  onClick={() => setRequestModal(false)}
                  disabled={isRequesting}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

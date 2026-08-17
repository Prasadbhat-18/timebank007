import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as api from "./api.js";

export default function VerifyCertificate({ certId: propCertId, onClose }) {
  const [certId, setCertId] = useState(propCertId || "");
  const [inputVal, setInputVal] = useState(propCertId || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkCertificate = async (idToCheck) => {
    if (!idToCheck || !idToCheck.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.verifyCertificatePublic(idToCheck.trim());
      setResult(data);
      if (!data.valid && !data.studentName) {
        setError(data.message || "Certificate not found in TimeBank official records.");
      }
    } catch (err) {
      setError(err.message || "Failed to verify certificate.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propCertId) {
      setCertId(propCertId);
      setInputVal(propCertId);
      checkCertificate(propCertId);
    }
  }, [propCertId]);

  return (
    <div
      className="verify-cert-container"
      style={{
        maxWidth: 580,
        margin: "0 auto",
        padding: "1.5rem 1rem",
        textAlign: "center",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card"
        style={{
          background: "rgba(12, 16, 26, 0.95)",
          border: result?.valid ? "1.5px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border)",
          borderRadius: 16,
          padding: "2rem 1.5rem",
          boxShadow: result?.valid ? "0 0 30px rgba(16, 185, 129, 0.15)" : "none",
        }}
      >
        {/* Top Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: result?.valid ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.1)",
              border: `1.5px solid ${result?.valid ? "var(--em)" : "rgba(59, 130, 246, 0.3)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              margin: "0 auto 1rem",
            }}
          >
            {result?.valid ? "✓" : "🔍"}
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
            AICTE Certificate Verification Portal
          </h2>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0 }}>
            Public cryptographic authenticity check for TimeBank Activity Credentials.
          </p>
        </div>

        {/* Input Bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
          <input
            type="text"
            className="fi"
            placeholder="Enter Certificate UUID (e.g. 550e8400-e29b...)"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkCertificate(inputVal)}
            style={{ margin: 0, fontSize: 13 }}
          />
          <button
            type="button"
            className="btn btn-p"
            onClick={() => checkCertificate(inputVal)}
            disabled={loading || !inputVal.trim()}
          >
            {loading ? "Checking..." : "Verify"}
          </button>
        </div>

        {/* Status Display */}
        {loading && (
          <div style={{ padding: "2rem", color: "var(--text-secondary)", fontSize: 13 }}>
            Querying cryptographic ledger and validating SHA-256 hash...
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 10,
              padding: "1rem",
              color: "#f87171",
              fontSize: 13,
              marginBottom: "1rem",
            }}
          >
            <strong>Verification Result:</strong> {error}
          </div>
        )}

        {result && result.valid && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "left" }}
          >
            <div
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 12,
                padding: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="tag tg" style={{ fontSize: 11, padding: "3px 10px" }}>
                  ✓ Cryptographically Authentic Record
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Issued: {new Date(result.issuedAt).toLocaleDateString()}
                </span>
              </div>

              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginTop: 6 }}>
                {result.studentName}
              </div>
              <div style={{ fontSize: 13, color: "var(--em)", fontWeight: 600, marginTop: 2 }}>
                🏛️ {result.college}
              </div>
              {result.studentEmail && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  ✉️ {result.studentEmail}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  marginTop: "1rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Points</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--em)" }}>{result.activityPoints}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Hours</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#60a5fa" }}>{result.totalHours}h</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Exchanges</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#c084fc" }}>{result.exchangeCount}</div>
                </div>
              </div>
            </div>

            {/* Technical Verification Meta */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 11,
                fontFamily: "monospace",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div><strong>Certificate ID:</strong> {result.certId}</div>
              <div><strong>SHA-256 Hash:</strong> {result.integrityHash}</div>
              {result.txHash && <div><strong>Blockchain Tx:</strong> {result.txHash.slice(0, 22)}... (Polygon Amoy)</div>}
              <div><strong>Integrity Check:</strong> 100% Match (No tampering detected)</div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <a
                href={api.getCertificateDownloadUrl(result.certId)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-p"
                style={{ flex: 1, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <span>⬇</span> Download Official PDF
              </a>
              {onClose && (
                <button type="button" className="btn btn-o" onClick={onClose}>
                  Close
                </button>
              )}
            </div>
          </motion.div>
        )}

        {result && !result.valid && !loading && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 12,
              padding: "1.25rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>⚠️</div>
            <div style={{ fontWeight: 700, color: "#f87171", fontSize: 15, marginBottom: 4 }}>
              Invalid or Tampered Certificate
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
              The computed SHA-256 hash does not match the registered ledger record. This credential may have been altered or revoked.
            </div>
          </div>
        )}

        {onClose && (!result || !result.valid) && (
          <div style={{ marginTop: "1rem" }}>
            <button type="button" className="btn btn-o btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

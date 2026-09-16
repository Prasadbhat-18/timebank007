import { useState, useRef, useCallback } from "react";

export default function IDCardUpload({ onSelect }) {
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileSize, setFileSize] = useState("");
  const inputRef = useRef(null);

  const processFile = useCallback((file) => {
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please upload an image under 5MB.");
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(0) + " KB");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result; // data URI string
      if (file.type.startsWith("image/")) {
        setPreview(base64);
      } else {
        setPreview(null); // PDF — no preview
      }
      // Pass base64 data URI up to parent
      if (onSelect) onSelect(base64);
    };
    reader.readAsDataURL(file);
  }, [onSelect]);

  const handleFileInput = (e) => processFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "rgba(16,185,129,0.6)" : preview ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 14,
        padding: preview ? "12px" : "2rem 1rem",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "rgba(16,185,129,0.06)" : preview ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileInput}
        accept="image/*,.pdf"
        style={{ display: "none" }}
      />

      {preview ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", width: "100%" }}>
            <img
              src={preview}
              alt="ID Card Preview"
              style={{
                maxHeight: 160, maxWidth: "100%", borderRadius: 10,
                objectFit: "contain",
                border: "1px solid rgba(16,185,129,0.25)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              }}
            />
            <div style={{
              position: "absolute", top: 6, right: 6,
              background: "rgba(16,185,129,0.9)", borderRadius: 20,
              padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#fff",
            }}>
              ✓ Uploaded
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>
              {fileName}
            </span>
            <span style={{ fontSize: 11, color: "#475569" }}>({fileSize})</span>
          </div>
          <span style={{ fontSize: 11, color: "#64748b" }}>Click or drop to replace</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>
            🪪
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
              {dragging ? "Drop your ID card here" : "Upload College ID Card"}
            </div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>
              Drag & drop or click to browse · PNG, JPG or PDF · Max 5MB
            </div>
          </div>
          <div style={{
            display: "flex", gap: 8, marginTop: 4,
          }}>
            <div style={{
              padding: "5px 14px", borderRadius: 8,
              background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
              color: "#10b981", fontSize: 11.5, fontWeight: 700,
            }}>
              Browse Files
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

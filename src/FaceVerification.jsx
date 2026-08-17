// ─── FaceVerification — Cross-device face capture component ──────────────────
// Works on desktop (webcam), mobile (front camera), and fallback (photo upload)
import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";

const MODEL_URL = "/models";

export default function FaceVerification({ onCaptured }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | scanning | captured | error | no-camera
  const [error, setError] = useState("");
  const [hasCamera, setHasCamera] = useState(true);
  const streamRef = useRef(null);

  // Load face-api models on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setError("Failed to load face recognition models.");
          setStatus("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Start camera only after user explicitly clicks "Open Camera"
  const startCamera = async () => {
    setError("");
    setStatus("loading");
    try {
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 480 },
          height: { ideal: 360 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraActive(true);
      setStatus("idle");
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      setHasCamera(false);
      setCameraActive(false);
      setStatus("no-camera");
      setError("Camera permission denied or camera unavailable. Please upload a photo instead.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Detect face from a video or image element
  const detectFace = useCallback(async (input) => {
    const detection = await faceapi
      .detectSingleFace(input)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection;
  }, []);

  // Capture from webcam
  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current) return;
    setStatus("scanning");
    setError("");

    try {
      const detection = await detectFace(videoRef.current);
      if (!detection) {
        setStatus("error");
        setError("No face detected — please look directly into the camera in good lighting.");
        return;
      }
      setStatus("captured");
      stopCamera();
      onCaptured(Array.from(detection.descriptor));
    } catch {
      setStatus("error");
      setError("Face detection failed. Please try again.");
    }
  }, [detectFace, onCaptured]);

  // Capture from uploaded photo
  const captureFromPhoto = useCallback(async (file) => {
    if (!file) return;
    setStatus("scanning");
    setError("");

    try {
      const img = await faceapi.bufferToImage(file);

      // Draw image onto a canvas so face-api can process it
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const detection = await detectFace(canvas);
      if (!detection) {
        setStatus("error");
        setError("No face detected in the photo. Please upload a clear selfie.");
        return;
      }
      setStatus("captured");
      stopCamera();
      onCaptured(Array.from(detection.descriptor));
    } catch {
      setStatus("error");
      setError("Could not process the photo. Try a different image.");
    }
  }, [detectFace, onCaptured]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) captureFromPhoto(file);
  };

  const statusColors = {
    idle: "var(--text-secondary)",
    loading: "var(--text-secondary)",
    scanning: "#f59e0b",
    captured: "#10b981",
    error: "#ef4444",
    "no-camera": "var(--text-secondary)",
  };

  const statusText = {
    idle: cameraActive ? "Position your face in the frame and click Capture" : "Click below to enable camera or upload a photo",
    loading: "Accessing camera…",
    scanning: "Scanning face biometrics…",
    captured: "Face biometric profile enrolled successfully ✓",
    error: error,
    "no-camera": "Camera not available — please upload a selfie photo",
  };

  return (
    <div className="face-verify-wrap" style={{ background: "rgba(0, 0, 0, 0.25)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 14, padding: "14px 16px" }}>
      <div className="face-verify-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: "#fff" }}>
          <span>🔐</span>
          <span>Live Face Verification</span>
        </div>
        <span className="face-verify-badge" style={{ fontSize: 11, background: status === "captured" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)", color: status === "captured" ? "var(--em)" : "var(--text-muted)", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
          {status === "captured" ? "Enrolled ✓" : "Mandatory"}
        </span>
      </div>

      {/* Active Camera view */}
      {cameraActive && (
        <div className="face-verify-video-wrap" style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000", marginBottom: 12 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="face-verify-video"
            style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }}
          />
          {status === "scanning" && <div className="face-verify-scanner" />}
        </div>
      )}

      {/* Captured Badge Preview */}
      {status === "captured" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--em)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 800, fontSize: 14 }}>
            ✓
          </div>
          <div style={{ flex: 1, fontSize: 12.5, color: "#e2e8f0", fontWeight: 600 }}>
            Biometric Profile Verified (128-D Vector)
          </div>
        </div>
      )}

      {/* Hidden canvas for photo processing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Status message */}
      <div className="face-verify-status" style={{ color: statusColors[status] || "var(--text-secondary)", fontSize: 12, marginBottom: 10, textAlign: "center" }}>
        {!ready && status !== "error" ? "Loading face recognition models…" : statusText[status]}
      </div>

      {/* Action Buttons */}
      <div className="face-verify-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!cameraActive && status !== "captured" && (
          <button
            type="button"
            disabled={!ready}
            onClick={startCamera}
            className="face-verify-btn primary"
            style={{ flex: 1, height: 38, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 8, color: "var(--em)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
          >
            📷 Enable Camera & Scan Face
          </button>
        )}

        {cameraActive && (
          <>
            <button
              type="button"
              disabled={!ready || status === "scanning"}
              onClick={captureFromCamera}
              className="face-verify-btn primary"
              style={{ flex: 1, height: 38, background: "var(--em)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {status === "scanning" ? "Scanning…" : "📸 Capture Face Now"}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              style={{ padding: "0 12px", height: 38, background: "rgba(255, 255, 255, 0.08)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
            >
              Cancel
            </button>
          </>
        )}

        {status === "captured" && (
          <button
            type="button"
            disabled={!ready}
            onClick={startCamera}
            style={{ flex: 1, height: 36, background: "rgba(255, 255, 255, 0.08)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
          >
            🔄 Recapture Face
          </button>
        )}

        {/* Upload selfie option */}
        <button
          type="button"
          disabled={!ready || status === "scanning"}
          onClick={() => fileRef.current?.click()}
          style={{ padding: "0 14px", height: 38, background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
        >
          📁 Upload Selfie
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}

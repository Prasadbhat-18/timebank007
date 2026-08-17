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
  const [status, setStatus] = useState("idle"); // idle | loading | scanning | captured | error | no-camera
  const [error, setError] = useState("");
  const [hasCamera, setHasCamera] = useState(true);
  const streamRef = useRef(null);

  // Load face-api models
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

  // Start camera once models are ready
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    (async () => {
      try {
        // Try front camera first (mobile-friendly), fall back to any camera
        const constraints = {
          video: {
            facingMode: "user",
            width: { ideal: 480 },
            height: { ideal: 360 },
          },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) {
          setHasCamera(false);
          setStatus("no-camera");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [ready]);

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
        setError("No face detected — face the camera in good light and try again.");
        return;
      }
      setStatus("captured");
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
        setError("No face detected in the photo. Please upload a clear, well-lit photo of your face.");
        return;
      }
      setStatus("captured");
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
    idle: "Position your face in the frame",
    loading: "Loading models…",
    scanning: "Scanning face…",
    captured: "Face captured successfully ✓",
    error: error,
    "no-camera": "Camera not available — please upload a photo",
  };

  return (
    <div className="face-verify-wrap">
      <div className="face-verify-header">
        <span className="face-verify-icon">🔐</span>
        <span>Face Verification</span>
        <span className="face-verify-badge">Required</span>
      </div>

      {/* Camera view */}
      {hasCamera && (
        <div className="face-verify-video-wrap">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="face-verify-video"
          />
          {status === "scanning" && <div className="face-verify-scanner" />}
          {status === "captured" && (
            <div className="face-verify-check">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="#10b981" strokeWidth="3" fill="rgba(16,185,129,0.1)" />
                <path d="M14 24l7 7 13-13" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Hidden canvas for photo processing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Status message */}
      <div className="face-verify-status" style={{ color: statusColors[status] || "var(--text-secondary)" }}>
        {!ready && status !== "error" ? "Loading face recognition models…" : statusText[status]}
      </div>

      {/* Buttons */}
      <div className="face-verify-actions">
        {hasCamera && (
          <button
            type="button"
            disabled={!ready || status === "scanning"}
            onClick={captureFromCamera}
            className="face-verify-btn primary"
          >
            {status === "scanning" ? (
              <><span className="face-verify-spinner" /> Scanning…</>
            ) : status === "captured" ? (
              "Recapture Face"
            ) : !ready ? (
              "Loading Models…"
            ) : (
              "📸 Capture Face"
            )}
          </button>
        )}

        {/* Upload fallback — always available */}
        <button
          type="button"
          disabled={!ready || status === "scanning"}
          onClick={() => fileRef.current?.click()}
          className={`face-verify-btn ${hasCamera ? "secondary" : "primary"}`}
        >
          📁 Upload Photo
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

      {/* Cross-device hint */}
      <div className="face-verify-hint">
        Works on mobile, tablet & desktop. {hasCamera ? "Use camera or upload a photo." : "Upload a clear selfie."}
      </div>
    </div>
  );
}

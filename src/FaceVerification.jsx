// ─── FaceVerification — Professional Real-Time Face Scan ──────────────────────
import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";

const MODEL_URL = "/models";

export default function FaceVerification({ onCaptured, mode = "capture" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const detectionLoopRef = useRef(null);
  const stableCountRef = useRef(0);
  const autoCaptureFiredRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | scanning | face_detected | capturing | captured | error
  const [error, setError] = useState("");
  const [faceBox, setFaceBox] = useState(null); // { x, y, w, h } normalized 0-1

  // ── Load face-api models ──────────────────────────────────────────────────
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

  // ── Stop camera + loops ───────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setFaceBox(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Draw real-time overlay onto canvas ────────────────────────────────────
  const drawOverlay = useCallback((detection, videoEl, canvasEl) => {
    if (!canvasEl || !videoEl) return;
    const displaySize = { width: videoEl.videoWidth, height: videoEl.videoHeight };
    if (!displaySize.width) return;
    faceapi.matchDimensions(canvasEl, displaySize);

    const ctx = canvasEl.getContext("2d");
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    if (!detection) {
      setFaceBox(null);
      return;
    }

    const resized = faceapi.resizeResults(detection, displaySize);
    const box = resized.detection.box;

    // Normalize to 0-1 for CSS positioning
    setFaceBox({
      x: box.x / displaySize.width,
      y: box.y / displaySize.height,
      w: box.width / displaySize.width,
      h: box.height / displaySize.height,
    });

    // Draw landmark dots
    if (resized.landmarks) {
      const pts = resized.landmarks.positions;
      ctx.fillStyle = "rgba(16, 185, 129, 0.85)";
      pts.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw landmark connections (eyes, nose bridge, jaw)
      ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
      ctx.lineWidth = 1;
      const drawPath = (indices) => {
        ctx.beginPath();
        indices.forEach((i, j) => {
          const p = pts[i];
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      };
      // Jaw
      drawPath([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
      // Left eyebrow
      drawPath([17,18,19,20,21]);
      // Right eyebrow
      drawPath([22,23,24,25,26]);
      // Nose bridge
      drawPath([27,28,29,30]);
      // Nose base
      drawPath([31,32,33,34,35]);
      // Left eye
      drawPath([36,37,38,39,40,41,36]);
      // Right eye
      drawPath([42,43,44,45,46,47,42]);
      // Outer lips
      drawPath([48,49,50,51,52,53,54,55,56,57,58,59,48]);
    }
  }, []);

  // ── Real-time detection loop ───────────────────────────────────────────────
  const startDetectionLoop = useCallback(() => {
    if (detectionLoopRef.current) clearInterval(detectionLoopRef.current);
    stableCountRef.current = 0;
    autoCaptureFiredRef.current = false;

    detectionLoopRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = overlayRef.current;
      if (!video || !ready || video.readyState < 2) return;

      try {
        const detection = await faceapi
          .detectSingleFace(video)
          .withFaceLandmarks()
          .withFaceDescriptor();

        drawOverlay(detection, video, canvas);

        if (detection) {
          stableCountRef.current++;
          setStatus("face_detected");

          // Auto-capture after face stable for 3 ticks (~1.5s)
          if (stableCountRef.current >= 3 && !autoCaptureFiredRef.current) {
            autoCaptureFiredRef.current = true;
            setStatus("capturing");
            clearInterval(detectionLoopRef.current);
            detectionLoopRef.current = null;
            stopCamera();
            onCaptured(Array.from(detection.descriptor));
            setStatus("captured");
          }
        } else {
          stableCountRef.current = 0;
          if (status !== "face_detected") setStatus("scanning");
        }
      } catch (e) {
        // silently continue
      }
    }, 500);
  }, [ready, drawOverlay, stopCamera, onCaptured, status]);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError("");
    setStatus("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setStatus("scanning");
      // Attach stream to video
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => startDetectionLoop();
      }
    } catch {
      setStatus("error");
      setError("Camera permission denied or unavailable. Please upload a selfie photo.");
    }
  }, [startDetectionLoop]);

  // ── Capture from uploaded photo ───────────────────────────────────────────
  const captureFromPhoto = useCallback(async (file) => {
    if (!file) return;
    setStatus("scanning");
    setError("");
    try {
      const img = await faceapi.bufferToImage(file);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const detection = await faceapi.detectSingleFace(canvas).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        setStatus("error");
        setError("No face detected in the photo. Please upload a clear, well-lit selfie.");
        return;
      }
      setStatus("captured");
      onCaptured(Array.from(detection.descriptor));
    } catch {
      setStatus("error");
      setError("Could not process the photo. Please try a different image.");
    }
  }, [onCaptured]);

  const statusConfig = {
    idle: { color: "#64748b", text: "Click below to start face scan" },
    loading: { color: "#64748b", text: "Accessing camera…" },
    scanning: { color: "#f59e0b", text: "Scanning… Center your face in the frame" },
    face_detected: { color: "#10b981", text: "Face detected — hold still…" },
    capturing: { color: "#10b981", text: "Capturing biometrics…" },
    captured: { color: "#10b981", text: "Biometric profile enrolled ✓" },
    error: { color: "#ef4444", text: error },
  };
  const sc = statusConfig[status] || statusConfig.idle;

  return (
    <div style={{
      background: "rgba(0,0,0,0.3)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: "16px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: status === "captured" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${status === "captured" ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)"}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
          }}>
            {status === "captured" ? "✓" : "🔐"}
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>Biometric Face Scan</span>
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 700,
          background: status === "captured" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
          color: status === "captured" ? "#10b981" : "#94a3b8",
          padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          {status === "captured" ? "Enrolled" : "Required"}
        </span>
      </div>

      {/* Camera view */}
      {cameraActive && (
        <div style={{
          position: "relative", borderRadius: 12, overflow: "hidden",
          background: "#000", marginBottom: 12,
          border: `2px solid ${status === "face_detected" ? "rgba(16,185,129,0.7)" : "rgba(255,255,255,0.08)"}`,
          transition: "border-color 0.3s ease",
          boxShadow: status === "face_detected" ? "0 0 20px rgba(16,185,129,0.25)" : "none",
        }}>
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }}
          />
          {/* Real-time landmark overlay canvas */}
          <canvas
            ref={overlayRef}
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
              pointerEvents: "none",
            }}
          />

          {/* Corner bracket decorations */}
          {["tl","tr","bl","br"].map((pos) => (
            <div key={pos} style={{
              position: "absolute",
              top: pos.startsWith("t") ? 8 : "auto",
              bottom: pos.startsWith("b") ? 8 : "auto",
              left: pos.endsWith("l") ? 8 : "auto",
              right: pos.endsWith("r") ? 8 : "auto",
              width: 18, height: 18,
              borderTop: pos.startsWith("t") ? `2px solid ${status === "face_detected" ? "#10b981" : "rgba(255,255,255,0.4)"}` : "none",
              borderBottom: pos.startsWith("b") ? `2px solid ${status === "face_detected" ? "#10b981" : "rgba(255,255,255,0.4)"}` : "none",
              borderLeft: pos.endsWith("l") ? `2px solid ${status === "face_detected" ? "#10b981" : "rgba(255,255,255,0.4)"}` : "none",
              borderRight: pos.endsWith("r") ? `2px solid ${status === "face_detected" ? "#10b981" : "rgba(255,255,255,0.4)"}` : "none",
              transition: "border-color 0.3s ease",
            }} />
          ))}

          {/* Status overlay badge */}
          <div style={{
            position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
            borderRadius: 20, padding: "3px 12px",
            fontSize: 11, fontWeight: 700,
            color: sc.color,
            border: `1px solid ${sc.color}40`,
            whiteSpace: "nowrap",
          }}>
            {status === "face_detected" && (
              <span style={{
                display: "inline-block", width: 6, height: 6,
                borderRadius: "50%", background: "#10b981",
                marginRight: 6, verticalAlign: "middle",
                animation: "pulse 1s infinite",
              }} />
            )}
            {sc.text}
          </div>
        </div>
      )}

      {/* Captured state */}
      {status === "captured" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: 10, padding: "12px 14px", marginBottom: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>✓</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>Face Enrolled</div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>128-dimensional biometric vector captured</div>
          </div>
        </div>
      )}

      {/* Hidden canvas for photo processing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Status message (when camera not active) */}
      {!cameraActive && status !== "captured" && (
        <div style={{
          textAlign: "center", fontSize: 12, color: sc.color,
          marginBottom: 10, minHeight: 18,
        }}>
          {!ready && status !== "error" ? "Loading face recognition models…" : sc.text}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        {!cameraActive && status !== "captured" && (
          <button
            type="button"
            disabled={!ready}
            onClick={startCamera}
            style={{
              flex: 1, height: 40,
              background: ready ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${ready ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 10, color: ready ? "#10b981" : "#64748b",
              fontWeight: 700, fontSize: 12.5, cursor: ready ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 0.2s",
            }}
          >
            <span>📷</span>
            <span>{ready ? "Start Camera Scan" : "Loading models…"}</span>
          </button>
        )}

        {status === "captured" && (
          <button
            type="button"
            disabled={!ready}
            onClick={() => { setStatus("idle"); setFaceBox(null); autoCaptureFiredRef.current = false; startCamera(); }}
            style={{
              flex: 1, height: 36,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, color: "#94a3b8", fontSize: 12, cursor: "pointer",
            }}
          >
            🔄 Rescan Face
          </button>
        )}

        <button
          type="button"
          disabled={!ready || status === "scanning" || status === "loading"}
          onClick={() => fileRef.current?.click()}
          style={{
            padding: "0 14px", height: 40,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, color: "#64748b", fontSize: 12, cursor: "pointer",
            flexShrink: 0,
          }}
        >
          📁 Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) captureFromPhoto(f); }}
          style={{ display: "none" }}
        />
      </div>

      {/* Auto-capture hint */}
      {cameraActive && status !== "captured" && (
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#475569" }}>
          Face will be captured automatically when detected
        </div>
      )}
    </div>
  );
}

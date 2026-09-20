import React, { useState, useEffect, useRef } from "react";
import * as api from "./api.js";

/**
 * Web Audio API Acoustic Siren Controller
 * Produces an authentic dual-tone emergency alert siren (850Hz / 550Hz)
 * without needing any external audio assets, functioning 100% in all modern browsers.
 */
class BrowserSiren {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.interval = null;
    this.running = false;
  }

  start() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();

      this.osc.type = "sawtooth";
      this.osc.frequency.setValueAtTime(750, this.ctx.currentTime);
      this.gain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.osc.start();
      this.running = true;

      let high = false;
      this.interval = setInterval(() => {
        if (!this.osc || !this.ctx || this.ctx.state === "closed") return;
        high = !high;
        this.osc.frequency.setValueAtTime(high ? 880 : 580, this.ctx.currentTime);
      }, 350);

      return true;
    } catch (e) {
      console.warn("BrowserSiren error:", e);
      return false;
    }
  }

  stop() {
    try {
      if (this.interval) clearInterval(this.interval);
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
      }
      if (this.gain) this.gain.disconnect();
      if (this.ctx && this.ctx.state !== "closed") {
        this.ctx.close();
      }
    } catch (e) {}
    this.running = false;
  }
}

/**
 * Clean phone number for tel: protocol
 */
export function sanitizePhoneNumber(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^0-9+]/g, "");
  return cleaned;
}

/**
 * Format phone for WhatsApp API (defaults to India 91 if 10-digit number)
 */
export function formatWhatsAppPhone(phone) {
  const digits = (phone || "").replace(/[^0-9]/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Comprehensive Real-Time Emergency SOS Modal
 */
export default function SosModal({ emergency = [], user, close, notify, onContactAdded }) {
  const [contacts, setContacts] = useState(emergency);
  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState(null);
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [alertDispatched, setAlertDispatched] = useState(false);
  const [activeTab, setActiveTab] = useState("call"); // "call" | "browser" | "helpline"
  const [copied, setCopied] = useState(false);

  // Quick-add contact state
  const [showAddContact, setShowAddContact] = useState(emergency.length === 0);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addRelation, setAddRelation] = useState("Parent");
  const [addingContact, setAddingContact] = useState(false);

  const sirenRef = useRef(null);

  if (!sirenRef.current) {
    sirenRef.current = new BrowserSiren();
  }

  // 1. On Mount: Auto-redirect to call tab with primary emergency contact
  useEffect(() => {
    if (contacts.length > 0) {
      const primary = contacts[0];
      const cleanPhone = sanitizePhoneNumber(primary.phone);
      if (cleanPhone) {
        try {
          // Direct real-time redirection to device call tab / dialer
          window.location.href = `tel:${cleanPhone}`;
        } catch (err) {
          console.warn("[SOS] tel: protocol redirect prevented:", err);
        }
      }
    }
  }, []);

  // 2. On Mount: Acquire Live Geolocation & Broadcast to Server in Real Time
  useEffect(() => {
    let active = true;

    const sendBroadcast = (coords = null) => {
      if (!user?._id) return;
      api.triggerSosAlert({
        userId: user._id,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        accuracy: coords?.accuracy ? Math.round(coords.accuracy) : null,
        contacts,
      })
        .then(() => {
          if (active) setAlertDispatched(true);
        })
        .catch((e) => console.warn("[SOS] Broadcast failed:", e));
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!active) return;
          const { latitude, longitude, accuracy } = pos.coords;
          const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setLocation({
            lat: latitude,
            lng: longitude,
            acc: Math.round(accuracy),
            mapsUrl,
          });
          setLocLoading(false);
          sendBroadcast(pos.coords);
        },
        (err) => {
          if (!active) return;
          console.warn("[SOS] Geolocation error:", err);
          setLocLoading(false);
          setLocError("Location permission not granted or unavailable.");
          sendBroadcast(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocLoading(false);
      setLocError("Geolocation not supported by this browser.");
      sendBroadcast(null);
    }

    return () => {
      active = false;
      if (sirenRef.current) {
        sirenRef.current.stop();
      }
    };
  }, [user?._id]);

  // Handle siren audio toggle
  const toggleSiren = () => {
    if (sirenPlaying) {
      sirenRef.current.stop();
      setSirenPlaying(false);
    } else {
      const started = sirenRef.current.start();
      if (started) {
        setSirenPlaying(true);
      } else {
        notify("Audio blocked by browser. Click to interact first.", "warning");
      }
    }
  };

  // Trigger manual call to a specific phone number
  const handleCall = (phone) => {
    const clean = sanitizePhoneNumber(phone);
    if (!clean) {
      notify("Invalid phone number", "error");
      return;
    }
    window.location.href = `tel:${clean}`;
    notify(`Dialing ${clean} in call tab...`);
  };

  // Generate WhatsApp SOS distress text
  const getDistressMessage = (contactName = "") => {
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const locationStr = location?.mapsUrl
      ? `\n📍 *Live Location:* ${location.mapsUrl} (±${location.acc}m)`
      : "";
    return `🚨 *EMERGENCY SOS ALERT* 🚨\n\nHello${contactName ? ` ${contactName}` : ""}, this is *${user?.name || "TimeBank User"}*.\nI have triggered an emergency SOS signal on TimeBank and need urgent assistance!\n\n⏰ *Time:* ${timeStr}${locationStr}\n\nPlease call me back or notify emergency services immediately!`;
  };

  // Open WhatsApp with pre-filled SOS distress message
  const handleWhatsApp = (phone, contactName = "") => {
    const waPhone = formatWhatsAppPhone(phone);
    if (!waPhone) {
      notify("Invalid phone number for WhatsApp", "error");
      return;
    }
    const message = getDistressMessage(contactName);
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    notify("Opening WhatsApp SOS dispatch...");
  };

  // Copy distress message & location to clipboard
  const handleCopyDistress = () => {
    const msg = getDistressMessage();
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      notify("Emergency message & coordinates copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      notify("Failed to copy", "error");
    });
  };

  // Quick-Add emergency contact on the spot
  const handleSaveContact = async () => {
    if (!addName.trim() || !addPhone.trim()) {
      notify("Please enter contact name and phone", "error");
      return;
    }
    setAddingContact(true);
    try {
      const created = await api.addEmergencyContact({
        userId: user._id,
        name: addName.trim(),
        phone: addPhone.trim(),
        relation: addRelation,
      });
      const updatedList = [...contacts, created];
      setContacts(updatedList);
      if (onContactAdded) onContactAdded(created);
      setShowAddContact(false);
      setAddName("");
      setAddPhone("");
      notify("Emergency contact added! Dialing now...");
      // Immediately trigger call tab with new contact
      handleCall(created.phone);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setAddingContact(false);
    }
  };

  return (
    <div style={{ maxHeight: "82vh", overflowY: "auto", paddingRight: 4 }}>
      {/* Flashing Emergency Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%)",
          borderRadius: 14,
          padding: "16px 18px",
          color: "#fff",
          marginBottom: 16,
          boxShadow: "0 8px 30px rgba(239, 68, 68, 0.35)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          position: "relative"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                animation: "pulse 1.5s infinite"
              }}
            >
              🚨
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                EMERGENCY SOS ACTIVE
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, opacity: 0.9 }}>
                {contacts.length > 0
                  ? "Dialer launched for primary contact · Real-time channels ready"
                  : "Immediate emergency response tools"}
              </p>
            </div>
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: 20,
              background: alertDispatched ? "rgba(16, 185, 129, 0.3)" : "rgba(0, 0, 0, 0.25)",
              border: alertDispatched ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fff"
            }}
          >
            {alertDispatched ? "✓ Network Alert Dispatched" : "Broadcasting..."}
          </span>
        </div>
      </div>

      {/* Navigation Tab Bar (Call / Browser Alternatives / Helplines) */}
      <div className="tab-bar" style={{ marginBottom: 14 }}>
        <button
          className={`tb-btn${activeTab === "call" ? " on" : ""}`}
          onClick={() => setActiveTab("call")}
          style={{ flex: 1 }}
        >
          📞 Emergency Contacts ({contacts.length})
        </button>
        <button
          className={`tb-btn${activeTab === "browser" ? " on" : ""}`}
          onClick={() => setActiveTab("browser")}
          style={{ flex: 1 }}
        >
          🌐 Browser Tools & GPS
        </button>
        <button
          className={`tb-btn${activeTab === "helpline" ? " on" : ""}`}
          onClick={() => setActiveTab("helpline")}
          style={{ flex: 1 }}
        >
          🛡️ National Helplines
        </button>
      </div>

      {/* ─── TAB 1: EMERGENCY CONTACTS & DIRECT DIAL ───────────────────────── */}
      {activeTab === "call" && (
        <div>
          {contacts.length === 0 ? (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px dashed rgba(239, 68, 68, 0.4)",
                borderRadius: 12,
                padding: "20px 16px",
                textAlign: "center",
                marginBottom: 16
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <h4 style={{ color: "#fff", margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>
                No Emergency Contacts Listed
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 14px", lineHeight: 1.4 }}>
                Add a contact below to dial immediately, or call the 112 National Emergency Helpline.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  className="btn btn-d btn-sm"
                  onClick={() => handleCall("112")}
                  style={{ fontWeight: 800, padding: "8px 18px" }}
                >
                  📞 Dial 112 (National Emergency)
                </button>
                <button
                  className="btn btn-o btn-sm"
                  onClick={() => setShowAddContact(true)}
                  style={{ padding: "8px 14px" }}
                >
                  + Add Contact Now
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {contacts.map((c, index) => {
                const isPrimary = index === 0;
                return (
                  <div
                    key={c._id || index}
                    style={{
                      background: isPrimary ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.025)",
                      border: isPrimary ? "1.5px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(255, 255, 255, 0.07)",
                      borderRadius: 12,
                      padding: "12px 14px"
                    }}
                  >
                    <div className="btwn" style={{ flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: isPrimary ? "#ef4444" : "var(--bg-card-hover)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 14
                          }}
                        >
                          {c.name[0]?.toUpperCase() || "E"}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <strong style={{ color: "#fff", fontSize: 14 }}>{c.name}</strong>
                            {isPrimary && (
                              <span style={{ fontSize: 10, padding: "1px 6px", background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", borderRadius: 4, fontWeight: 700 }}>
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                            {c.phone} · <span style={{ color: "var(--text-muted)" }}>{c.relation}</span>
                          </div>
                        </div>
                      </div>

                      {/* Phone Dialer Action Button */}
                      <button
                        className="btn btn-d btn-sm"
                        onClick={() => handleCall(c.phone)}
                        style={{ fontWeight: 800, padding: "6px 14px", fontSize: 12.5 }}
                      >
                        📞 Call Tab (Dial)
                      </button>
                    </div>

                    {/* Browser Alternatives per contact: WhatsApp & Direct Copy */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <button
                        type="button"
                        className="btn btn-g btn-sm"
                        onClick={() => handleWhatsApp(c.phone, c.name)}
                        style={{ fontSize: 11.5, padding: "5px 10px", background: "#059669", borderColor: "#10b981", flex: 1, justifyContent: "center" }}
                        title="Send SOS via WhatsApp Web / Desktop"
                      >
                        💬 WhatsApp SOS
                      </button>
                      <button
                        type="button"
                        className="btn btn-o btn-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(c.phone);
                          notify(`Copied ${c.name}'s phone: ${c.phone}`);
                        }}
                        style={{ fontSize: 11.5, padding: "5px 10px" }}
                        title="Copy Phone Number"
                      >
                        📋 Copy Phone
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick-Add Emergency Contact Toggle & Form */}
          {!showAddContact ? (
            <button
              type="button"
              className="btn btn-o btn-sm"
              onClick={() => setShowAddContact(true)}
              style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}
            >
              + Quick-Add Another Emergency Contact
            </button>
          ) : (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                padding: "14px",
                marginBottom: 14
              }}
            >
              <div className="btwn mb1">
                <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>Add Emergency Contact</span>
                {contacts.length > 0 && (
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                    onClick={() => setShowAddContact(false)}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="field">
                <label style={{ fontSize: 12 }}>Name</label>
                <input
                  className="fi"
                  placeholder="e.g. Mom, Dad, Roommate"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  style={{ fontSize: 13, padding: "8px 10px" }}
                />
              </div>
              <div className="field">
                <label style={{ fontSize: 12 }}>Phone Number</label>
                <input
                  className="fi"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  style={{ fontSize: 13, padding: "8px 10px" }}
                />
              </div>
              <div className="field">
                <label style={{ fontSize: 12 }}>Relationship</label>
                <select
                  className="fi"
                  value={addRelation}
                  onChange={(e) => setAddRelation(e.target.value)}
                  style={{ fontSize: 13, padding: "8px 10px" }}
                >
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Friend">Friend / Roommate</option>
                  <option value="Campus Security">Campus Security</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <button
                type="button"
                className="btn btn-d btn-sm"
                onClick={handleSaveContact}
                disabled={addingContact}
                style={{ width: "100%", justifyContent: "center", fontWeight: 700 }}
              >
                {addingContact ? "Saving..." : "Save Contact & Call"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: BROWSER ALTERNATIVES & LIVE GPS ────────────────────────── */}
      {activeTab === "browser" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          {/* Geolocation Card */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 12,
              padding: "14px"
            }}
          >
            <div className="btwn mb1">
              <span style={{ fontWeight: 700, fontSize: 13, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                <span>📍</span> Live GPS Coordinates
              </span>
              <span style={{ fontSize: 11, color: location ? "var(--em)" : "var(--amber)" }}>
                {locLoading ? "Detecting location..." : location ? `±${location.acc}m accuracy` : "Unavailable"}
              </span>
            </div>

            {location ? (
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 13, color: "#fff", background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 6, marginBottom: 10 }}>
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a
                    href={location.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-g btn-sm"
                    style={{ flex: 1, justifyContent: "center", textDecoration: "none", fontSize: 12 }}
                  >
                    🗺️ Open in Google Maps ↗
                  </a>
                  <button
                    type="button"
                    className="btn btn-o btn-sm"
                    onClick={handleCopyDistress}
                    style={{ flex: 1, justifyContent: "center", fontSize: 12 }}
                  >
                    {copied ? "✓ Copied!" : "📋 Copy SOS Message"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "0 0 8px" }}>
                  {locError || "Detecting your device coordinates..."}
                </p>
                <button
                  type="button"
                  className="btn btn-o btn-sm"
                  onClick={handleCopyDistress}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {copied ? "✓ Copied Distress Text!" : "📋 Copy Distress Text Without GPS"}
                </button>
              </div>
            )}
          </div>

          {/* Browser Web Audio Alarm / Siren */}
          <div
            style={{
              background: sirenPlaying ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.03)",
              border: sirenPlaying ? "1.5px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 12,
              padding: "14px",
              transition: "all 0.3s ease"
            }}
          >
            <div className="btwn" style={{ flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🔊</span> Web Audio Alarm / Siren
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  Blasts a high-frequency emergency alarm through your computer speakers.
                </div>
              </div>

              <button
                type="button"
                className={`btn ${sirenPlaying ? "btn-d" : "btn-o"} btn-sm`}
                onClick={toggleSiren}
                style={{ fontWeight: 800, padding: "8px 16px", minWidth: 120, justifyContent: "center" }}
              >
                {sirenPlaying ? "⏹️ Stop Siren" : "🔊 Sound Siren"}
              </button>
            </div>
          </div>

          {/* WhatsApp Web Direct Dispatch */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 12,
              padding: "14px"
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span>💬</span> WhatsApp Desktop / Web SOS
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.4 }}>
              When using a computer browser, WhatsApp Web opens with your distress message and live coordinates pre-filled.
            </p>
            {contacts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {contacts.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className="btn btn-g btn-sm"
                    onClick={() => handleWhatsApp(c.phone, c.name)}
                    style={{ justifyContent: "flex-start", fontSize: 12, padding: "6px 12px" }}
                  >
                    💬 Message {c.name} ({c.phone})
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-o btn-sm"
                onClick={() => setShowAddContact(true)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                + Add Contact to Enable WhatsApp SOS
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: NATIONAL EMERGENCY HELPLINES ─────────────────────────────── */}
      {activeTab === "helpline" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 4 }}>
            Official emergency responders available 24/7 across India & worldwide:
          </div>

          {[
            { num: "112", label: "National Emergency Response (All-in-One)", desc: "Police, Fire, and Ambulance unified helpline" },
            { num: "100", label: "Police Emergency", desc: "Local police dispatch & crime emergency" },
            { num: "1091", label: "Women Safety Helpline", desc: "Immediate assistance for female safety & distress" },
            { num: "108", label: "Medical Ambulance Helpline", desc: "Urgent medical transportation & paramedics" },
          ].map((h) => (
            <div
              key={h.num}
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#ef4444" }}>{h.num}</span>
                  <strong style={{ color: "#fff", fontSize: 13 }}>{h.label}</strong>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{h.desc}</div>
              </div>
              <button
                type="button"
                className="btn btn-d btn-sm"
                onClick={() => handleCall(h.num)}
                style={{ fontWeight: 800, padding: "6px 12px", fontSize: 12 }}
              >
                📞 Dial {h.num}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dismiss / Close Action */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-o"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => {
            if (sirenRef.current) sirenRef.current.stop();
            close();
          }}
        >
          Close SOS Center
        </button>
      </div>
    </div>
  );
}

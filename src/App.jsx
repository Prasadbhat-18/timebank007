import { useState, useEffect, useRef, useCallback, cloneElement, isValidElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { io } from "socket.io-client";
import { AICTE_CFG } from "./store.js";
import * as api from "./api.js";
import * as chain from "./blockchain.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import FaceVerification from "./FaceVerification.jsx";
import { getDeviceFingerprint } from "./fingerprint.js";
import LandingChoice from "./LandingChoice.jsx";
import NotificationBell from "./NotificationBell.jsx";
import AICTEProgress from "./AICTEProgress.jsx";
import VerifyCertificate from "./VerifyCertificate.jsx";

// ─── STYLISH SVG ICONS ────────────────────────────────────────────────────────
export function ClockIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function ChainIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function AicteIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}

export function ChatIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function BookingIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function SosIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function LockIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function StarIcon({ size = 16, color = "currentColor", fill = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function FaceVerifyIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function ShieldIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const FALLBACK_COLLEGES = [
  { name: "National Institute of Technology Karnataka (NITK)", emailDomain: "nitk.edu.in", code: "NITK" },
  { name: "Indian Institute of Technology Bombay (IITB)", emailDomain: "iitb.ac.in", code: "IITB" },
  { name: "BITS Pilani", emailDomain: "bits-pilani.ac.in", code: "BITS" },
  { name: "Delhi Technological University (DTU)", emailDomain: "dtu.ac.in", code: "DTU" },
  { name: "PES University", emailDomain: "pes.edu", code: "PESU" },
  { name: "RV College of Engineering", emailDomain: "rvce.edu.in", code: "RVCE" },
  { name: "Global Academy of Technology", emailDomain: "global.edu.in", code: "GAT" },
  { name: "Stanford University", emailDomain: "stanford.edu", code: "STAN" },
  { name: "Massachusetts Institute of Technology (MIT)", emailDomain: "mit.edu", code: "MIT" },
  { name: "Harvard University", emailDomain: "harvard.edu", code: "HARV" },
];

function CollegeAutocomplete({ value, onChange, onSelectCollege, placeholder }) {
  const [show, setShow] = useState(false);
  const [collegeList, setCollegeList] = useState(FALLBACK_COLLEGES);

  useEffect(() => {
    api.fetchColleges()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCollegeList(data);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = collegeList.filter((c) =>
    c.name.toLowerCase().includes((value || "").toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes((value || "").toLowerCase())) ||
    (c.emailDomain && c.emailDomain.toLowerCase().includes((value || "").toLowerCase()))
  );

  return (
    <div style={{ position: "relative" }}>
      <input 
        className="fi" 
        value={value} 
        onChange={(e) => { onChange(e.target.value); setShow(true); }} 
        onFocus={() => setShow(true)} 
        onBlur={() => setTimeout(() => setShow(false), 250)}
        placeholder={placeholder || "Search your college..."} 
      />
      <AnimatePresence>
        {show && filtered.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            style={{ 
              position: "absolute", top: "100%", left: 0, right: 0, 
              background: "rgba(12, 16, 26, 0.98)", border: "1px solid var(--border)", 
              borderRadius: 8, zIndex: 100, maxHeight: 180, overflowY: "auto",
              marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" 
            }}>
            {filtered.map((c) => (
              <div 
                key={c._id || c.name} 
                style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }} 
                onMouseDown={() => {
                  onChange(c.name);
                  if (onSelectCollege) onSelectCollege(c);
                  setShow(false);
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: "#fff" }}>{c.name}</div>
                {c.emailDomain && (
                  <div style={{ fontSize: 11, color: "var(--em)" }}>
                    Email domain: @{c.emailDomain}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, delay, ease: [0.25, 0.1, 0.25, 1] } },
});
const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
const cardHover = { whileHover: { y: -3, transition: { duration: 0.2 } } };
const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.12 } },
};
const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ─── ROOT APP ────────────────────────────────────────────────────────────────

export function WelcomeBonusModal({ user, close }) {
  return (
    <div style={{ textAlign: "center", padding: "1rem" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
      <h2 style={{ color: "var(--green)", marginBottom: "1rem" }}>Welcome to TimeBank!</h2>
      <p style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>
        As a special welcome gift, you've received <strong>10 Time Credits</strong> to get started!
      </p>
      <div className="card mb2" style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
        <p className="text-s" style={{ margin: 0, color: "var(--green)" }}>
          <span style={{ fontWeight: 600 }}>Ledger Entry Created:</span> 10 credits minted directly to your account on the blockchain.
        </p>
      </div>
      <button className="btn btn-p" style={{ width: "100%", justifyContent: "center" }} onClick={close}>Awesome, let's go!</button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null); // { provider, signer, address, balance }
  const [page, setPage] = useState("landing");
  const [notifs, setNotifs] = useState([]);
  const [modal, setModal] = useState(null);
  const [clockAngle, setClockAngle] = useState({ h: 0, m: 0 });
  const [verifyCertId, setVerifyCertId] = useState(null);

  // Shared data cache
  const [skills, setSkills] = useState([]);
  const [users, setUsers] = useState([]);

  const [autofillOtpData, setAutofillOtpData] = useState(null);

  // Check URL hash for public certificate verification /#verify/:certId or magic login /#magic-login/:token
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash || "";
      if (hash.startsWith("#verify/")) {
        const id = hash.replace("#verify/", "").trim();
        if (id) {
          setVerifyCertId(id);
        }
      } else if (hash.startsWith("#magic-login/")) {
        const token = hash.replace("#magic-login/", "").trim();
        if (token) {
          doMagicLogin(token);
        }
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Check for welcome bonus on login
  useEffect(() => {
    if (user && user.role === "user" && user.welcomeShown === false) {
      setModal(
        <WelcomeBonusModal 
          user={user} 
          close={() => {
            setModal(null);
            setUser(prev => ({ ...prev, welcomeShown: true }));
            api.markWelcomeShown(user._id).catch(console.error);
          }} 
        />
      );
    }
  }, [user, setModal]);

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClockAngle({
        h: (now.getHours() % 12) * 30 + now.getMinutes() * 0.5,
        m: now.getMinutes() * 6,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const loadSkills = useCallback(() => {
    api.fetchSkills().then(setSkills).catch(() => {});
  }, []);

  // Load skills on mount
  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // Load all users when logged in
  useEffect(() => {
    if (user) api.fetchUsers().then(setUsers).catch(() => {});
  }, [user]);

  const notify = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setNotifs((n) => [...n, { id, msg, type }]);
    setTimeout(() => setNotifs((n) => n.filter((x) => x.id !== id)), 3500);
  }, []);

  const nav = (pg) => { setPage(pg); setModal(null); };

  const getU = useCallback((id) => users.find((u) => u._id === id), [users]);
  const getSk = useCallback((id) => skills.find((s) => s._id === id), [skills]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const u = await api.fetchUser(user._id);
      setUser(u);
    } catch {}
  }, [user]);

  // Auto-connect wallet hook when user is logged in
  useEffect(() => {
    if (user && !wallet) {
      chain.connectWallet(user.email).then(async (w) => {
        const balance = await chain.getBalance(w.provider, w.address);
        setWallet({ ...w, balance });
        if (user.wallet !== w.address) {
          await api.updateUser(user._id, { wallet: w.address });
          refreshUser();
        }
      }).catch(() => {});
    }
  }, [user, wallet, refreshUser]);

  // Wallet connection
  const connectWallet = useCallback(async (email) => {
    try {
      const targetEmail = email || user?.email || "default";
      const w = await chain.connectWallet(targetEmail);
      const balance = await chain.getBalance(w.provider, w.address);
      setWallet({ ...w, balance });
      if (user) {
        await api.updateUser(user._id, { wallet: w.address });
        await refreshUser();
      }
      notify(w.isInbuilt ? "Inbuilt Web Wallet activated! 🚀" : "MetaMask connected successfully! 🦊");
    } catch (e) {
      notify(e.message || "Failed to connect wallet", "error");
    }
  }, [user, notify, refreshUser]);

  // Login
  const doLogin = async (email, pass) => {
    try {
      const deviceFingerprint = await getDeviceFingerprint();
      const { token, user: u, newDevice } = await api.login(email, pass, null, deviceFingerprint);
      localStorage.setItem("token", token);
      setUser(u);
      if (u.role === "websiteAdmin" || u.role === "super_admin") {
        nav("website-admin");
      } else if (u.role === "collegeAdmin" || u.role === "institute_admin") {
        nav("college-admin");
      } else {
        nav("dashboard");
      }
      if (newDevice) {
        notify("Login from a new device detected 🔔", "warning");
      }
      notify(`Welcome back, ${u.name.split(" ")[0]}!`);
    } catch (e) {
      notify(e.message || "Failed to sign in", "error");
      throw e;
    }
  };

  // Magic Login (1-click link from college email)
  const doMagicLogin = async (magicToken) => {
    try {
      const res = await api.magicLogin(magicToken);
      if (res.token && res.user) {
        localStorage.setItem("token", res.token);
        setUser(res.user);
        if (res.user.role === "websiteAdmin" || res.user.role === "super_admin") {
          nav("website-admin");
        } else if (res.user.role === "collegeAdmin" || res.user.role === "institute_admin") {
          nav("college-admin");
        } else {
          nav("dashboard");
        }
        notify(res.message || `Welcome, ${res.user.name}! 🚀`);
        window.location.hash = "";
      }
    } catch (e) {
      notify(e.message || "Magic login link expired or invalid", "error");
    }
  };

  // Real-Time College Email OTP Verification & Login
  const doLoginWithOtp = async (email, otp) => {
    try {
      const deviceFingerprint = await getDeviceFingerprint();
      const res = await api.verifyOtp(email, otp, deviceFingerprint);
      if (res.token && res.user) {
        localStorage.setItem("token", res.token);
        setUser(res.user);
        if (res.user.role === "websiteAdmin" || res.user.role === "super_admin") {
          nav("website-admin");
        } else if (res.user.role === "collegeAdmin" || res.user.role === "institute_admin") {
          nav("college-admin");
        } else {
          nav("dashboard");
        }
        if (res.newDevice) {
          notify("Login from a new device detected 🔔", "warning");
        }
        notify(`Welcome back, ${res.user.name.split(" ")[0]}! 🎉`);
      }
      return res;
    } catch (e) {
      notify(e.message || "Failed to verify code", "error");
      throw e;
    }
  };

  const doWebsiteAdminLogin = async (email, pass) => {
    try {
      const { token, user: u } = await api.websiteAdminLogin(email, pass);
      localStorage.setItem("token", token);
      setUser(u);
      nav("website-admin");
      notify(`Welcome, Website Admin`);
    } catch (e) { notify(e.message, "error"); }
  };

  const doCollegeAdminLogin = async (email, pass) => {
    try {
      const { token, user: u } = await api.collegeAdminLogin(email, pass);
      localStorage.setItem("token", token);
      setUser(u);
      nav("college-admin");
      notify(`Welcome, College Admin`);
    } catch (e) { notify(e.message, "error"); }
  };

  // Dual Registration: Handles student & general_user
  const doRegister = async (roleOrData, optionalData) => {
    try {
      let role = "student";
      let regData = {};

      if (typeof roleOrData === "string") {
        role = roleOrData;
        regData = optionalData || {};
      } else {
        regData = roleOrData || {};
        role = regData.role || (regData.college ? "student" : "general_user");
      }

      const { faceDescriptor } = regData;
      if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
        notify("Live face verification is required to complete registration.", "error");
        return;
      }

      let rc = localStorage.getItem("referralCode") || undefined;
      const deviceFingerprint = await getDeviceFingerprint();
      const payload = { ...regData, referralCode: rc, deviceFingerprint };

      let res;
      if (role === "student") {
        res = await api.registerStudent(payload);
      } else {
        res = await api.registerGeneral(payload);
      }

      const { token, user: u, message } = res;
      localStorage.setItem("token", token);
      
      const keyName = "tb_key_" + u._id;
      let privateKey = localStorage.getItem(keyName);
      let walletAddr = "";
      if (!privateKey) {
        const w = ethers.Wallet.createRandom();
        localStorage.setItem(keyName, w.privateKey);
        walletAddr = w.address;
      } else {
        walletAddr = new ethers.Wallet(privateKey).address;
      }

      const updatedUser = await api.updateUser(u._id, { wallet: walletAddr });
      setUser(updatedUser);
      nav("dashboard");
      notify(message || (role === "student" ? "Welcome! Student account & AICTE tracking active 🎓" : "Welcome! Account created successfully 🎉"));
    } catch (e) {
      notify(e.message, "error");
      throw e;
    }
  };

  // Logout
  const doLogout = () => { localStorage.removeItem("token"); setUser(null); setWallet(null); nav("landing"); };

  const handleSetModal = (fnOrNode) => {
    if (typeof fnOrNode === "function") {
      setModal(() => fnOrNode);
    } else {
      setModal(fnOrNode);
    }
  };

  const pageProps = {
    user, wallet, setWallet, skills, users, notify, nav, getU, getSk,
    setModal: handleSetModal, refreshUser, connectWallet, doLogout,
    loadSkills, setVerifyCertId,
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {(page === "landing" || page === "auth") && <BlockchainBg isBlurred={page === "auth"} />}
      <Nav user={user} page={page} nav={nav} clockAngle={clockAngle} doLogout={doLogout} notify={notify} />
      <NotifStack notifs={notifs} />
      
      {/* Public QR Certificate Verification Modal */}
      {verifyCertId && (
        <div className="overlay" style={{ zIndex: 99999 }} onClick={(e) => e.target.className === "overlay" && setVerifyCertId(null)}>
          <div className="mo-box" style={{ maxWidth: 620, width: "95%", position: "relative" }}>
            <button
              onClick={() => {
                setVerifyCertId(null);
                if (window.location.hash.startsWith("#verify/")) {
                  window.location.hash = "";
                }
              }}
              style={{ position: "absolute", top: 15, right: 15, background: "transparent", border: "none", color: "#888", fontSize: 20, cursor: "pointer", zIndex: 10 }}
            >
              ✕
            </button>
            <VerifyCertificate
              certId={verifyCertId}
              onClose={() => {
                setVerifyCertId(null);
                if (window.location.hash.startsWith("#verify/")) {
                  window.location.hash = "";
                }
              }}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target.className === "overlay" && setModal(null)}>
            <div className="mo-box" style={{ position: "relative" }}>
              <button onClick={() => setModal(null)} style={{ position: "absolute", top: 15, right: 15, background: "transparent", border: "none", color: "#888", fontSize: 20, cursor: "pointer", zIndex: 10 }}>✕</button>
              {isValidElement(modal) ? cloneElement(modal, { 
                close: (...args) => {
                  if (modal.props.close) modal.props.close(...args);
                  setModal(null);
                }
              }) : modal}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div key={page} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ position: "relative", zIndex: 1 }}>
          {page === "landing" && <Landing nav={nav} />}
          {page === "auth" && (
            <Auth
              doLogin={doLogin}
              doLoginWithOtp={doLoginWithOtp}
              doRegister={doRegister}
              clockAngle={clockAngle}
              autofillOtpData={autofillOtpData}
              notify={notify}
            />
          )}
          {page === "website-admin-login" && <WebsiteAdminLogin doLogin={doWebsiteAdminLogin} />}
          {page === "college-admin-login" && <CollegeAdminLogin doLogin={doCollegeAdminLogin} />}
          {page === "dashboard" && user && <Dashboard {...pageProps} />}
          {page === "services" && user && <Services {...pageProps} />}
          {page === "bookings" && user && <Bookings {...pageProps} />}
          {page === "wallet" && user && <Wallet {...pageProps} />}
          {page === "aicte" && user && user.role === "student" && <AICTEPage {...pageProps} />}
          {page === "chat" && user && <ChatPage {...pageProps} />}
          {page === "profile" && user && <Profile {...pageProps} />}
          {page === "website-admin" && (user?.role === "websiteAdmin" || user?.role === "super_admin") && <Admin prefix="website-admin" {...pageProps} />}
          {page === "college-admin" && (user?.role === "collegeAdmin" || user?.role === "institute_admin") && <Admin prefix="college-admin" {...pageProps} />}
        </motion.div>
      </AnimatePresence>

      {user && <AiChatWidget user={user} />}
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({ user, page, nav, clockAngle, doLogout, notify }) {
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  
  // AICTE tab is exclusively available for Students
  const isStudent = user?.role === "student";
  const userPages = isStudent
    ? ["dashboard", "services", "bookings", "wallet", "aicte", "chat", "profile"]
    : ["dashboard", "services", "bookings", "wallet", "chat", "profile"];

  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => nav(user ? "dashboard" : "landing")}>
        <svg className="nav-clock" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="#00c27a" strokeWidth="1.5" />
          <line x1="14" y1="14" x2={14 + 9 * Math.sin((clockAngle.h * Math.PI) / 180)} y2={14 - 9 * Math.cos((clockAngle.h * Math.PI) / 180)} stroke="#00c27a" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="14" x2={14 + 11 * Math.sin((clockAngle.m * Math.PI) / 180)} y2={14 - 11 * Math.cos((clockAngle.m * Math.PI) / 180)} stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="14" cy="14" r="1.5" fill="#00c27a" />
        </svg>
        TimeBank
      </div>
      {user ? (
        <>
          {(user.role === "websiteAdmin" || user.role === "super_admin") ? (
            <button className={`nl${page === "website-admin" ? " act" : ""}`} onClick={() => nav("website-admin")}>Platform Admin</button>
          ) : (user.role === "collegeAdmin" || user.role === "institute_admin") ? (
            <button className={`nl${page === "college-admin" ? " act" : ""}`} onClick={() => nav("college-admin")}>Institution Admin ({user.college || "Institute"})</button>
          ) : (
            userPages.map((p) => (
              <button key={p} className={`nl${page === p ? " act" : ""}`} onClick={() => nav(p)}>
                {p === "aicte" ? "AICTE Points 🎓" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span className="nav-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <ClockIcon size={13} color="var(--em)" />
              <span>{user.credits} cr</span>
            </span>

            {/* Real-time Notification Bell */}
            <NotificationBell user={user} notify={notify} />

            <div className="nav-av" onClick={() => nav(user.role?.includes("Admin") || user.role === "super_admin" || user.role === "institute_admin" ? (user.role === "websiteAdmin" || user.role === "super_admin" ? "website-admin" : "college-admin") : "profile")}>
              {user.avatar}
            </div>
            <button className="nl" onClick={doLogout}>Sign out</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ position: "relative", marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <button className="nl" onClick={() => nav("landing")}>Home</button>
            <button className="nav-cta" onClick={() => nav("auth")}>User Login</button>
            
            <div 
              style={{ position: "relative" }} 
              onMouseEnter={() => setAdminMenuOpen(true)} 
              onMouseLeave={() => setAdminMenuOpen(false)}
            >
              <button className="nl" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: 6 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              
              {adminMenuOpen && (
                <div style={{ position: "absolute", top: "100%", right: 0, paddingTop: 8, minWidth: 200, zIndex: 100 }}>
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                    <button className="nl" style={{ width: "100%", textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border)", borderRadius: 0 }} onClick={() => nav("college-admin-login")}>Institution Admin</button>
                    <button className="nl" style={{ width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 0 }} onClick={() => nav("website-admin-login")}>Platform Admin</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

// ─── NOTIFS ──────────────────────────────────────────────────────────────────
function NotifStack({ notifs }) {
  const cols = { success: "#00c27a", error: "#dc2626", info: "#2563eb", warning: "#d97706" };
  return (
    <div className="notif-stack">
      <AnimatePresence>
        {notifs.map((n) => (
          <motion.div key={n.id} className="notif"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.25 }}>
            <div className="ndot" style={{ background: cols[n.type] || cols.success }} />
            {n.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── BLOCKCHAIN NETWORK CANVAS VISUALIZATION ─────────────────────────────────
export function BlockchainBg({ isBlurred }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Responsive setup
    const isMobile = width < 768;
    const nodeCount = isMobile ? 8 : 26;
    const connectionDist = isMobile ? 0 : 135;

    // Prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Create isolated nodes
    const nodes = [];
    const names = [
      "P2P Node", "Credits Ledger", "AICTE Verifier", "Smart Contract", 
      "Alice", "Bob", "Charlie", "Dev", "Priya", "Aman", "Siddharth",
      "Spanish Class", "React Mentorship", "UI Design Core", "Blockchain DB"
    ];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 3 + 2,
        label: i < names.length ? names[i] : `Node #${i}`,
        type: i % 4 === 0 ? "contract" : "user",
      });
    }

    // Active credit transfer transactions
    const txParticles = [];
    const skillList = ["Coding Tutoring", "UX Prototype", "Graphic Designing", "Guitar Lessons", "Language Help"];

    const addRandomTx = () => {
      if (nodes.length < 2) return;
      const fromIdx = Math.floor(Math.random() * nodes.length);
      let toIdx = Math.floor(Math.random() * nodes.length);
      while (toIdx === fromIdx) {
        toIdx = Math.floor(Math.random() * nodes.length);
      }
      const skill = skillList[Math.floor(Math.random() * skillList.length)];
      const credits = Math.floor(Math.random() * 3) + 1;

      txParticles.push({
        from: nodes[fromIdx],
        to: nodes[toIdx],
        progress: 0,
        speed: 0.005 + Math.random() * 0.005,
        skill,
        credits,
      });
    };

    // Spawn regular transactions
    const txInterval = setInterval(() => {
      if (txParticles.length < 5) {
        addRandomTx();
      }
    }, 4500);

    // Floating notifications
    const alerts = [];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle background data grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw connections (ambient network mesh)
      if (connectionDist > 0) {
        ctx.lineWidth = 0.8;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < connectionDist) {
              const alpha = (1 - dist / connectionDist) * 0.07;
              ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
            }
          }
        }
      }

      // 3. Draw nodes
      nodes.forEach((n) => {
        // Draw glow aura
        ctx.fillStyle = n.type === "contract" ? "rgba(139, 92, 246, 0.12)" : "rgba(16, 185, 129, 0.12)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw core node
        ctx.fillStyle = n.type === "contract" ? "#8b5cf6" : "#10b981";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
        ctx.font = "9px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y - n.r - 8);

        // Move nodes (only if reduced motion is disabled)
        if (!prefersReducedMotion) {
          n.x += n.vx;
          n.y += n.vy;

          // Bounce walls
          if (n.x < 0 || n.x > width) n.vx *= -1;
          if (n.y < 0 || n.y > height) n.vy *= -1;
        }
      });

      // 4. Draw transaction credit flow particles
      if (!prefersReducedMotion) {
        for (let i = txParticles.length - 1; i >= 0; i--) {
          const p = txParticles[i];
          p.progress += p.speed;

          if (p.progress >= 1) {
            // Transaction complete: spawn floating text alert at destination node
            alerts.push({
              x: p.to.x,
              y: p.to.y - 15,
              text: `+${p.credits} cr · ${p.skill}`,
              opacity: 1,
              life: 1.0,
            });
            txParticles.splice(i, 1);
            continue;
          }

          // Calculate particle coordinates along the path
          const currX = p.from.x + (p.to.x - p.from.x) * p.progress;
          const currY = p.from.y + (p.to.y - p.from.y) * p.progress;

          // Particle draw
          ctx.fillStyle = "#34d399";
          ctx.beginPath();
          ctx.arc(currX, currY, 4, 0, Math.PI * 2);
          ctx.fill();

          // Tiny credits identifier text next to particle
          ctx.fillStyle = "rgba(16, 185, 129, 0.75)";
          ctx.font = "8px 'Space Grotesk', monospace";
          ctx.fillText(`+${p.credits} cr`, currX, currY - 6);
        }
      }

      // 5. Draw floating notifications (alerts)
      for (let i = alerts.length - 1; i >= 0; i--) {
        const a = alerts[i];
        a.y -= 0.6; // float up
        a.life -= 0.012;
        a.opacity = Math.max(0, a.life);

        if (a.life <= 0) {
          alerts.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `rgba(52, 211, 153, ${a.opacity})`;
        ctx.font = "bold 10px 'Urbanist', sans-serif";
        ctx.fillText(a.text, a.x, a.y);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    // Window resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(txInterval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`blockchain-canvas${isBlurred ? " blurred" : ""}`}
    />
  );
}

// ─── INTERACTIVE FEATURE SHOWCASE ────────────────────────────────────────────
export function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      title: "Time Credit Wallet",
      icon: <ClockIcon size={16} color="var(--em)" />,
      desc: "Track credit balances, earnings timeline, and view cryptographic logs in real-time.",
      mockup: (
        <div className="showcase-mock-wallet">
          <div className="showcase-mock-grid">
            <div className="showcase-mock-box">
              <div className="showcase-mock-title">Time Credit Balance</div>
              <div className="showcase-mock-val" style={{ color: "var(--em)" }}>14.50 hrs</div>
            </div>
            <div className="showcase-mock-box">
              <div className="showcase-mock-title">Trust Tier</div>
              <div className="showcase-mock-val" style={{ color: "var(--purple)" }}>Gold</div>
            </div>
          </div>
          <div style={{ height: 110, position: "relative", marginTop: 4 }}>
            <svg viewBox="0 0 400 100" width="100%" height="100%" preserveAspectRatio="none">
              <defs>
                <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--em)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--em)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 80 Q 80 40 160 65 T 320 20 T 400 35 L 400 100 L 0 100 Z" fill="url(#glow)" />
              <path d="M 0 80 Q 80 40 160 65 T 320 20 T 400 35" fill="none" stroke="var(--em)" strokeWidth="2.5" />
              <circle cx="320" cy="20" r="5" fill="#fff" stroke="var(--em)" strokeWidth="2" />
            </svg>
          </div>
          <div className="showcase-mock-tx-list">
            <div className="showcase-mock-tx">
              <span>Coding Session (from Prof. Dev)</span>
              <span className="text-g fw7">+2.0 cr</span>
            </div>
            <div className="showcase-mock-tx">
              <span>Spanish Mentorship (to Alice)</span>
              <span className="text-red fw7">-1.5 cr</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Skill Exchange Flow",
      icon: <ChainIcon size={16} color="var(--purple)" />,
      desc: "Direct P2P trading where 1 hour of your skills matches exactly 1 credit hour.",
      mockup: (
        <div>
          <div className="showcase-mock-flow">
            <div className="showcase-mock-user">
              <div className="av" style={{ background: "var(--purple-bg)", color: "var(--purple)", border: "1px solid var(--purple)" }}>AP</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>Aman</div>
              <div className="tag tp" style={{ fontSize: 9, padding: "2px 8px" }}>Wants coding</div>
            </div>
            
            <div className="showcase-mock-arrow"></div>
            
            <div className="showcase-mock-user">
              <div className="av" style={{ background: "var(--em-bg)", color: "var(--em)", border: "1px solid var(--em)" }}>PD</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>Priya</div>
              <div className="tag tg" style={{ fontSize: 9, padding: "2px 8px" }}>Offers React</div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span className="tag tg" style={{ padding: "6px 14px" }}>On-Chain Session Confirmed · Block #4562015 mined ✓</span>
          </div>
        </div>
      )
    },
    {
      title: "AICTE Points & Verification",
      icon: <AicteIcon size={16} color="var(--blue)" />,
      desc: "Academically integrated activities verified by administrators to unlock college points.",
      mockup: (
        <div>
          <div className="showcase-mock-tx-list" style={{ gap: 10 }}>
            <div className="showcase-mock-tx" style={{ borderLeft: "3px solid var(--em)", background: "rgba(16, 185, 129, 0.02)" }}>
              <div>
                <strong style={{ display: "block", color: "#fff", fontSize: 13 }}>Smart India Hackathon 2026</strong>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>VTU VT4812 · Student Submission</span>
              </div>
              <span className="tag tg">Approved</span>
            </div>
            <div className="showcase-mock-tx" style={{ borderLeft: "3px solid var(--purple)" }}>
              <div>
                <strong style={{ display: "block", color: "#fff", fontSize: 13 }}>Web Development Workshop</strong>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Organizer: IEEE Club</span>
              </div>
              <span className="tag tp">Pending Approval</span>
            </div>
          </div>
          <div className="row mt2" style={{ justifyContent: "space-between", background: "rgba(255,255,255,0.02)", padding: "12px 18px", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>AICTE POINTS ACQUIRED</div>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 800, color: "var(--blue)" }}>180 Points</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>BONUS CREDITS</div>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 800, color: "var(--em)" }}>+4.0 cr</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Direct Messaging & Chat",
      icon: <ChatIcon size={16} color="var(--teal)" />,
      desc: "Negotiate schedules, plan locations, and communicate directly through clean chat threads.",
      mockup: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 8 }}>
          <div className="bbl bbl-t" style={{ alignSelf: "flex-start", maxWidth: "80%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", fontSize: 12.5 }}>
            Hello Aman! I can help you with your React UI bugs tomorrow evening.
          </div>
          <div className="bbl bbl-m" style={{ alignSelf: "flex-end", maxWidth: "80%", padding: "10px 14px", borderRadius: 12, background: "var(--em)", color: "var(--bg)", fontSize: 12.5, fontWeight: 600 }}>
            That's awesome! I have 2 credits to trade for your time.
          </div>
          <div className="bbl bbl-t" style={{ alignSelf: "flex-start", maxWidth: "80%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", fontSize: 12.5 }}>
            Perfect, I've accepted your booking request. Talk tomorrow!
          </div>
        </div>
      )
    },
    {
      title: "Biometric Face Verification",
      icon: <FaceVerifyIcon size={16} color="var(--em)" />,
      desc: "Client-side 128-dim facial embedding verification to eliminate duplicate accounts and identity fraud.",
      mockup: (
        <div style={{ padding: "16px", background: "rgba(16, 185, 129, 0.03)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: 12 }}>
          <div className="row mb2" style={{ gap: 14, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--em-bg)", border: "1px solid var(--em)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaceVerifyIcon size={22} color="var(--em)" />
            </div>
            <div>
              <strong style={{ display: "block", color: "#fff", fontSize: 13 }}>Biometric Identity Verified</strong>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>128-dim Facial Descriptor Match · Zero-Knowledge Storage</span>
            </div>
            <span className="tag tg" style={{ marginLeft: "auto" }}>Verified ✓</span>
          </div>
          <div className="showcase-mock-tx-list">
            <div className="showcase-mock-tx">
              <span>Facial Embedding Verification</span>
              <span className="text-g fw7">Euclidean Distance ≤ 0.6 (Unique User)</span>
            </div>
            <div className="showcase-mock-tx">
              <span>Device Fingerprint Security</span>
              <span className="text-g fw7">Trusted Visitor ID Verified</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Reputation & Safety Shield",
      icon: <SosIcon size={16} color="var(--red)" />,
      desc: "Verified student trust indexes, double review loops, and emergency SOS safeguard options.",
      mockup: (
        <div>
          <div className="row mb2" style={{ background: "rgba(16, 185, 129, 0.03)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: 12, padding: "12px 18px", gap: 14 }}>
            <div className="av" style={{ background: "var(--em)", color: "var(--bg)", fontSize: 14, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>98%</div>
            <div>
              <strong style={{ display: "block", color: "#fff", fontSize: 13 }}>Trust & Safety Verification</strong>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Highly Rated Member · 12 successful reviews</span>
            </div>
          </div>
          <div className="row mb2" style={{ background: "rgba(239, 68, 68, 0.03)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: 12, padding: "12px 18px", gap: 14 }}>
            <div className="av" style={{ background: "var(--red)", color: "#fff", fontSize: 14, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SosIcon size={20} color="#fff" />
            </div>
            <div>
              <strong style={{ display: "block", color: "#fff", fontSize: 13 }}>Safety Shield Active</strong>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Emergency SOS triggers notification broadcast instantly.</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="showcase-wrap">
      <div className="showcase-tabs">
        {features.map((f, i) => (
          <button key={f.title} className={`showcase-tab${activeTab === i ? " active" : ""}`} onClick={() => setActiveTab(i)}>
            <div className="showcase-tab-title">
              {f.icon}
              {f.title}
            </div>
            <div className="showcase-tab-desc">{f.desc}</div>
          </button>
        ))}
      </div>
      <div className="showcase-content">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
            {features[activeTab].mockup}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── DASHBOARD REAL-TIME CREDIT TIMELINE CHART (SVG BASED) ───────────────────
export function CreditTimelineChart({ txs, userId }) {
  if (!txs || txs.length === 0) {
    return <div className="text-m" style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>No transaction history to plot.</div>;
  }

  // Sort transactions chronologically
  const sorted = [...txs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  let bal = 2.0;
  
  // Starting point
  const data = [{
    time: "Start",
    balance: bal,
    date: sorted.length > 0 ? new Date(sorted[0].createdAt).toLocaleDateString() : ""
  }];

  sorted.forEach((tx) => {
    const inc = tx.toId === userId;
    if (inc) {
      bal += tx.amount;
    } else {
      bal = Math.max(0, bal - tx.amount);
    }
    const d = new Date(tx.createdAt);
    data.push({
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: d.toLocaleDateString(),
      balance: parseFloat(bal.toFixed(1)),
      type: tx.type
    });
  });

  return (
    <div className="chart-container" style={{ width: "100%", height: 200, paddingRight: 20, paddingTop: 10 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--em)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--em)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} tickLine={false} axisLine={false} tickFormatter={v => v + "h"} />
          <Tooltip 
            contentStyle={{ backgroundColor: "var(--bg)", border: "1px solid var(--em-border)", borderRadius: 8, fontSize: 12 }} 
            itemStyle={{ color: "var(--em)", fontWeight: "bold" }}
            labelStyle={{ color: "rgba(255,255,255,0.7)", marginBottom: 4 }}
            formatter={(value) => [`${value} hrs`, "Balance"]}
          />
          <Line type="monotone" dataKey="balance" stroke="var(--em)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--em)", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#fff", stroke: "var(--em)", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── DASHBOARD CONCENTRIC EARNED VS SPENT GAUGE (SVG BASED) ──────────────────
export function EarnedSpentGauge({ user }) {
  const earned = user.earned || 0;
  const spent = user.spent || 0;
  
  const radiusOuter = 40;
  const circOuter = 2 * Math.PI * radiusOuter;
  const valOuter = Math.min(earned, 20);
  const strokeDashOuter = circOuter - (valOuter / 20) * circOuter;

  const radiusInner = 30;
  const circInner = 2 * Math.PI * radiusInner;
  const valInner = Math.min(spent, 20);
  const strokeDashInner = circInner - (valInner / 20) * circInner;

  return (
    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", justifyContent: "space-around", minHeight: 140 }}>
      <svg className="gauge-svg" viewBox="0 0 100 100">
        <circle className="gauge-bg" cx="50" cy="50" r={radiusOuter} fill="none" strokeWidth="6" />
        <circle className="gauge-bg" cx="50" cy="50" r={radiusInner} fill="none" strokeWidth="6" />

        <circle
          className="gauge-fill-earned"
          cx="50" cy="50" r={radiusOuter}
          fill="none" strokeWidth="6"
          strokeDasharray={circOuter}
          strokeDashoffset={strokeDashOuter}
          transform="rotate(-90 50 50)"
        />

        <circle
          className="gauge-fill-spent"
          cx="50" cy="50" r={radiusInner}
          fill="none" strokeWidth="6"
          strokeDasharray={circInner}
          strokeDashoffset={strokeDashInner}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, background: "var(--em)", borderRadius: "50%" }}></span>
          <span style={{ color: "var(--text-secondary)" }}>Hours Earned:</span>
          <strong style={{ color: "#fff" }}>{earned} hrs</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, background: "var(--red)", borderRadius: "50%" }}></span>
          <span style={{ color: "var(--text-secondary)" }}>Hours Spent:</span>
          <strong style={{ color: "#fff" }}>{spent} hrs</strong>
        </div>
      </div>
    </div>
  );
}

// ─── LANDING ─────────────────────────────────────────────────────────────────
function Landing({ nav }) {
  const howSteps = [
    { n: 1, t: "Biometric face verification", d: "Scan your face to prevent duplicate accounts and secure your identity, receiving 10 starter credits." },
    { n: 2, t: "List your expertise", d: "Post the skills you can offer — teaching, coding, design, music, or anything else." },
    { n: 3, t: "Book and exchange", d: "Find a skill you need, book a session, and complete it. Credits transfer on-chain." },
    { n: 4, t: "Earn AICTE points", d: "Submit verified activities for admin approval and earn bonus credits and recognition." },
  ];

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div className="hero" style={{ background: "transparent" }}>
        <motion.div className="hero-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}>
          <motion.div className="hero-eyebrow" {...fadeUp(0.1)}>
            <span style={{ width: 6, height: 6, background: "#00c27a", borderRadius: "50%" }} />
            P2P Skill Exchange · Biometric Face ID · Polygon Amoy Verified
          </motion.div>
          <motion.h1 className="hero-title" {...fadeUp(0.2)}>
            Where your time<br />becomes <span>currency</span>
          </motion.h1>
          <motion.p className="hero-sub" {...fadeUp(0.3)}>
            TimeBank is a decentralized peer-to-peer network where 1 hour of your skills matches exactly 1 time credit. Protected by biometric face verification, share your expertise and track verifications on the ledger.
          </motion.p>
          <motion.div className="hero-btns" {...fadeUp(0.4)}>
            <button className="btn-hp btn-hp-p" onClick={() => nav("auth")}>Start exchanging</button>
            <button className="btn-hp btn-hp-s" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              Explore features ↓
            </button>
          </motion.div>
          
          <motion.div className="hero-stats" {...fadeUp(0.5)}>
            {[{ n: "1 hr", l: "= 1 credit always" }, { n: "Face ID", l: "Anti-fraud biometrics" }, { n: "Polygon", l: "Secure testnet logs" }, { n: "AICTE", l: "Integrated recognition" }].map((s) => (
              <div key={s.l}><div className="hstat-num">{s.n}</div><div className="hstat-lbl">{s.l}</div></div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="feat-section" id="features" style={{ background: "rgba(12, 15, 23, 0.6)", backdropFilter: "blur(8px)" }}>
        <div className="inner" style={{ maxWidth: 1040, margin: "0 auto", padding: "4rem 2rem" }}>
          <div className="showcase-title-area">
            <div className="sec-eyebrow">Interactive Showcase</div>
            <h2 className="sec-title">Explore TimeBank's Ecosystem</h2>
            <p className="sec-sub" style={{ margin: "0.5rem auto 0", maxWidth: 600 }}>Explore our decentralized network features and watch the live mock ledger visualisations in action.</p>
          </div>
          <FeatureShowcase />
        </div>
      </div>

      <div className="how-section" style={{ background: "transparent" }}>
        <div className="how-inner">
          <motion.div {...fadeUp()} viewport={{ once: true }} whileInView="animate" initial="initial">
            <div className="sec-eyebrow">How it works</div>
            <h2 className="sec-title" style={{ marginBottom: "2.5rem" }}>Four steps to your first exchange</h2>
          </motion.div>
          <motion.div className="steps" variants={stagger} initial="initial" whileInView="animate" viewport={{ once: true }}>
            {howSteps.map((s, i) => (
              <motion.div key={s.n} className="step" variants={fadeUp(i * 0.08)}>
                <div className="step-num">{s.n}</div>
                <div className="step-t">{s.t}</div>
                <div className="step-d">{s.d}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="cta-band" style={{ background: "rgba(12, 15, 23, 0.6)", borderTop: "1px solid var(--border)" }}>
        <motion.div {...fadeUp()} viewport={{ once: true }} whileInView="animate" initial="initial">
          <h2>Ready to trade your first hour?</h2>
          <p>Join TimeBank — the blockchain-verified skill economy for students and professionals.</p>
          <button className="btn-white" onClick={() => nav("auth")}>Get started for free</button>
        </motion.div>
      </div>

      <footer className="footer" style={{ background: "rgba(5, 7, 12, 0.95)" }}>
        <div className="footer-inner">
          <p>TimeBank © {new Date().getFullYear()} · Polygon Amoy · AICTE integrated</p>
        </div>
      </footer>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function Auth({ doLogin, doLoginWithOtp, doRegister, clockAngle, autofillOtpData, notify }) {
  const [tab, setTab] = useState("login"); // login, register, forgot
  const [regRole, setRegRole] = useState(null); // null | 'student' | 'general_user'
  
  // Login states
  const [signInMethod, setSignInMethod] = useState("otp"); // 'otp' | 'password'
  const [le, setLe] = useState(""), [lp, setLp] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginCountdown, setLoginCountdown] = useState(0);

  // Student Registration states
  const [rn, setRn] = useState(""), [re, setRe] = useState(""), [rp, setRp] = useState(""), [rb, setRb] = useState(""), [rc, setRc] = useState("");
  const [selectedCollegeDoc, setSelectedCollegeDoc] = useState(null);
  const [rphone, setRphone] = useState(""), [rpin, setRpin] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regCountdown, setRegCountdown] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [faceDescriptor, setFaceDescriptor] = useState(null);

  // Listen to autofill trigger from Real-time College Email Inbox modal
  useEffect(() => {
    if (autofillOtpData && autofillOtpData.code) {
      if (tab === "login") {
        if (autofillOtpData.email) setLe(autofillOtpData.email);
        setLoginOtp(autofillOtpData.code);
        setSignInMethod("otp");
        setLoginOtpSent(true);
      } else if (tab === "register") {
        if (autofillOtpData.email) setRe(autofillOtpData.email);
        setRegOtp(autofillOtpData.code);
        setRegOtpSent(true);
      }
    }
  }, [autofillOtpData, tab]);

  // Login countdown timer
  useEffect(() => {
    if (loginCountdown <= 0) return;
    const timer = setInterval(() => setLoginCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [loginCountdown]);

  // Register countdown timer
  useEffect(() => {
    if (regCountdown <= 0) return;
    const timer = setInterval(() => setRegCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [regCountdown]);

  const cx = 34, cy = 34;
  const hx = cx + 14 * Math.sin((clockAngle.h * Math.PI) / 180);
  const hy = cy - 14 * Math.cos((clockAngle.h * Math.PI) / 180);
  const mx = cx + 18 * Math.sin((clockAngle.m * Math.PI) / 180);
  const my = cy - 18 * Math.cos((clockAngle.m * Math.PI) / 180);

  // Send Login OTP
  const handleSendLoginOtp = async () => {
    if (!le || !le.includes("@")) {
      setError("Please enter a valid college / account email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.sendOtp(le, "login");
      setLoginOtpSent(true);
      setLoginCountdown(60);
      if (notify) notify(`Verification code dispatched to ${le} 📬`);
    } catch (e) {
      setError(e.message || "Failed to dispatch verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Verify Login OTP
  const handleVerifyLoginOtp = async () => {
    if (!le || !loginOtp) {
      setError("Please enter your email and the 6-digit verification code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (doLoginWithOtp) {
        await doLoginWithOtp(le, loginOtp);
      }
    } catch (e) {
      setError(e.message || "Verification failed. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  // Send Registration Email OTP
  const handleSendRegOtp = async () => {
    if (!re || !re.includes("@")) {
      setError("Please enter a valid college email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.sendOtp(re, "register");
      setRegOtpSent(true);
      setRegCountdown(60);
      if (notify) notify(`Real-time verification code dispatched to ${re} 📬`);
    } catch (e) {
      setError(e.message || "Failed to dispatch verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Verify Registration Email OTP
  const handleVerifyRegOtp = async () => {
    if (!re || !regOtp) {
      setError("Please enter the 6-digit code received.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.verifyOtp(re, regOtp);
      if (res.verified || res.success) {
        setEmailVerified(true);
        if (notify) notify("College email verified successfully! ✓");
      }
    } catch (e) {
      setError(e.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async () => {
    if (!le || !lp) { setError("Please enter your email and password."); return; }
    setError("");
    setLoading(true);
    try {
      await doLogin(le, lp);
    } catch (e) {
      setError(e.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentRegister = async () => {
    if (!rn || !re) {
      setError("Full legal name and college email are required.");
      return;
    }
    if (!rc) {
      setError("Please select your college/institution.");
      return;
    }
    if (!faceDescriptor) {
      setError("Live face scan is mandatory to enroll your biometric profile.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await doRegister("student", {
        name: rn,
        email: re,
        bio: rb,
        college: rc,
        collegeId: selectedCollegeDoc?._id || null,
        collegeIdNumber: rpin,
        phone: rphone,
        faceDescriptor,
        otp: regOtp || undefined,
      });
    } catch (e) {
      setError(e.message || "Failed to create student account.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneralRegister = async () => {
    if (!rn || !re) {
      setError("Full name and email address are required.");
      return;
    }
    if (!faceDescriptor) {
      setError("Live face scan is mandatory to enroll your biometric profile.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await doRegister("general_user", {
        name: rn,
        email: re,
        bio: rb,
        phone: rphone,
        faceDescriptor,
        otp: regOtp || undefined,
      });
    } catch (e) {
      setError(e.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap" style={{ background: "transparent", position: "relative", zIndex: 2, padding: "2.5rem 1rem", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: tab === "register" && regRole ? 560 : 440, margin: "0 auto" }}>
        
        {/* Auth Card */}
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "rgba(18, 24, 38, 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 20,
            padding: "2.25rem 2rem",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            width: "100%",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: 20, padding: "4px 12px", color: "var(--em)", fontSize: 11.5, fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              <span>⚡</span> TimeBank Verified
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
              {tab === "login" ? "Welcome Back" : tab === "register" && !regRole ? "Get Started" : regRole === "student" ? "Student Registration" : "Create Account"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              {tab === "login" ? "Sign in with One-Time Email Code & Face Scan" : "Join the decentralized skill exchange network"}
            </p>
          </div>
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                color: "#f87171",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 12.5,
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚠️</span>
              <span style={{ flex: 1 }}>{error}</span>
            </motion.div>
          )}

          {/* Primary Tabs (Sign in / Sign up) */}
          {tab !== "forgot" && !regRole && (
            <div style={{ display: "flex", background: "rgba(0, 0, 0, 0.3)", borderRadius: 12, padding: 4, marginBottom: "1.5rem", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <button
                type="button"
                className={`atab${tab === "login" ? " on" : ""}`}
                onClick={() => { setTab("login"); setRegRole(null); setError(""); }}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "none",
                  background: tab === "login" ? "var(--em)" : "transparent",
                  color: tab === "login" ? "#000" : "var(--text-secondary)",
                  fontWeight: tab === "login" ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`atab${tab === "register" ? " on" : ""}`}
                onClick={() => { setTab("register"); setError(""); }}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "none",
                  background: tab === "register" ? "var(--em)" : "transparent",
                  color: tab === "register" ? "#000" : "var(--text-secondary)",
                  fontWeight: tab === "register" ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* ─── SIGN IN TAB ─── */}
          {tab === "login" && (
            <div>
              {/* Method Switcher */}
              <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.03)", borderRadius: 10, padding: 3, marginBottom: "1.25rem", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <button
                  type="button"
                  onClick={() => { setSignInMethod("otp"); setError(""); }}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: 7,
                    border: "none",
                    background: signInMethod === "otp" ? "rgba(16, 185, 129, 0.2)" : "transparent",
                    color: signInMethod === "otp" ? "#34d399" : "var(--text-secondary)",
                    fontWeight: signInMethod === "otp" ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  ⚡ One-Time Code / Magic Link
                </button>
                <button
                  type="button"
                  onClick={() => { setSignInMethod("password"); setError(""); }}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: 7,
                    border: "none",
                    background: signInMethod === "password" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                    color: signInMethod === "password" ? "#fff" : "var(--text-secondary)",
                    fontWeight: signInMethod === "password" ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  🔑 Password
                </button>
              </div>

              {/* METHOD 1: REAL EMAIL OTP / MAGIC LINK */}
              {signInMethod === "otp" && (
                <div>
                  <div className="field" style={{ marginBottom: "1.25rem" }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                      Email Address
                    </label>
                    <input
                      className="fi"
                      type="email"
                      value={le}
                      onChange={(e) => setLe(e.target.value)}
                      placeholder="yourname@college.edu.in or your@email.com"
                      onKeyDown={(e) => e.key === "Enter" && !loginOtpSent && handleSendLoginOtp()}
                      style={{ height: 44, fontSize: 14 }}
                    />
                  </div>

                  {!loginOtpSent ? (
                    <button
                      className="btn btn-p"
                      onClick={handleSendLoginOtp}
                      disabled={loading || !le}
                      style={{ width: "100%", height: 44, justifyContent: "center", fontSize: 14, fontWeight: 700 }}
                    >
                      {loading ? "Dispatching Code..." : "Send Verification Code ⚡"}
                    </button>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: "1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--em)" }}>📬 Verification Code Dispatched</span>
                          <button
                            type="button"
                            onClick={() => { setLoginOtpSent(false); setLoginOtp(""); }}
                            style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}
                          >
                            Change email
                          </button>
                        </div>
                        <div style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.45 }}>
                          Code & 1-click link sent to <b style={{ color: "#fff" }}>{le}</b>. Check your inbox and spam folder.
                        </div>
                      </div>

                      <div className="field" style={{ marginBottom: "1.25rem" }}>
                        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block", textAlign: "center" }}>
                          Enter 6-Digit Code
                        </label>
                        <input
                          className="fi"
                          value={loginOtp}
                          onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="• • • • • •"
                          maxLength={6}
                          style={{ textAlign: "center", letterSpacing: 10, fontSize: 22, fontWeight: 800, height: 48 }}
                          onKeyDown={(e) => e.key === "Enter" && loginOtp.length === 6 && handleVerifyLoginOtp()}
                          autoFocus
                        />
                      </div>

                      <button
                        className="btn btn-p"
                        onClick={handleVerifyLoginOtp}
                        disabled={loading || loginOtp.length < 6}
                        style={{ width: "100%", height: 44, justifyContent: "center", fontSize: 14, fontWeight: 700, marginBottom: "0.75rem" }}
                      >
                        {loading ? "Verifying..." : "Verify Code & Sign In 🚀"}
                      </button>

                      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={handleSendLoginOtp}
                          disabled={loading || loginCountdown > 0}
                          style={{ background: "none", border: "none", color: loginCountdown > 0 ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 12, cursor: loginCountdown > 0 ? "default" : "pointer" }}
                        >
                          {loginCountdown > 0 ? `Resend code in ${loginCountdown}s` : "Didn't receive email? Click to Resend"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* METHOD 2: STANDARD PASSWORD */}
              {signInMethod === "password" && (
                <div>
                  <div className="field" style={{ marginBottom: "1rem" }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Email Address</label>
                    <input className="fi" value={le} onChange={(e) => setLe(e.target.value)} placeholder="your@email.com" style={{ height: 44 }} />
                  </div>
                  <div className="field" style={{ marginBottom: "0.5rem" }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Password</label>
                    <input className="fi" type="password" value={lp} onChange={(e) => setLp(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handleLoginSubmit()} style={{ height: 44 }} />
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.25rem" }}>
                    <button type="button" style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }} onClick={() => { setTab("forgot"); setError(""); }}>
                      Forgot Password?
                    </button>
                  </div>

                  <button className="btn btn-p" onClick={handleLoginSubmit} disabled={loading} style={{ width: "100%", height: 44, justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                    {loading ? "Signing in..." : "Sign in with Password"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── SIGN UP: ROLE PICKER ─── */}
          {tab === "register" && !regRole && (
            <LandingChoice
              onSelectRole={(r) => { setRegRole(r); setError(""); }}
              onBackToLogin={() => { setTab("login"); setRegRole(null); setError(""); }}
            />
          )}

          {/* ─── SIGN UP: STUDENT FLOW (OTP + LIVE FACE) ─── */}
          {tab === "register" && regRole === "student" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", padding: "10px 14px", background: "rgba(16, 185, 129, 0.08)", borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13.5, color: "var(--em)" }}>
                  <span>🎓</span> Student Registration
                </div>
                <button
                  type="button"
                  onClick={() => { setRegRole(null); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                >
                  Change role
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Full Legal Name</label>
                  <input className="fi" value={rn} onChange={(e) => setRn(e.target.value)} placeholder="e.g. Alex Kumar" style={{ height: 42 }} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>College / Roll ID</label>
                  <input className="fi" value={rpin} onChange={(e) => setRpin(e.target.value)} placeholder="Enter College ID / USN" style={{ height: 42 }} />
                </div>
              </div>

              <div className="field" style={{ marginBottom: "1rem" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>College / Institution</label>
                <CollegeAutocomplete
                  value={rc}
                  onChange={(val) => { setRc(val); }}
                  onSelectCollege={(doc) => { setSelectedCollegeDoc(doc); }}
                  placeholder="Search and select your college..."
                />
              </div>

              {/* College Email & OTP Verification */}
              <div className="field" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>College / Student Email</label>
                  {emailVerified ? (
                    <span style={{ fontSize: 11.5, color: "var(--em)", fontWeight: 700 }}>✓ Email Verified</span>
                  ) : regOtpSent ? (
                    <span style={{ fontSize: 11.5, color: "#34d399", fontWeight: 600 }}>Code Sent 📬</span>
                  ) : null}
                </div>
                
                <input
                  className="fi"
                  type="email"
                  value={re}
                  onChange={(e) => { setRe(e.target.value); setEmailVerified(false); }}
                  placeholder="yourname@college.edu.in"
                  style={{ width: "100%", height: 44, fontSize: 14 }}
                />

                {!emailVerified && !regOtpSent && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={handleSendRegOtp}
                      disabled={loading || !re || !re.includes("@")}
                      style={{
                        width: "100%",
                        height: 38,
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        borderRadius: 8,
                        color: "var(--em)",
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {loading ? "Sending Verification Code..." : "⚡ Send Verification Code to Email"}
                    </button>
                  </div>
                )}

                {/* OTP Input block for registration */}
                {!emailVerified && regOtpSent && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 10, background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                        Enter 6-digit code sent to <b style={{ color: "#fff" }}>{re}</b>
                      </span>
                      <button
                        type="button"
                        onClick={handleSendRegOtp}
                        disabled={regCountdown > 0}
                        style={{ background: "none", border: "none", color: regCountdown > 0 ? "var(--text-muted)" : "var(--em)", fontSize: 11, cursor: regCountdown > 0 ? "default" : "pointer" }}
                      >
                        {regCountdown > 0 ? `Resend (${regCountdown}s)` : "Resend code"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="fi"
                        placeholder="• • • • • •"
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        style={{ flex: 1, height: 38, textAlign: "center", letterSpacing: 6, fontSize: 16, fontWeight: 800 }}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyRegOtp}
                        disabled={loading || regOtp.length < 6}
                        style={{
                          padding: "0 16px",
                          height: 38,
                          borderRadius: 8,
                          border: "none",
                          background: "var(--em)",
                          color: "#000",
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Verify OTP ✓
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Phone Number</label>
                  <input className="fi" value={rphone} onChange={(e) => setRphone(e.target.value)} placeholder="10-digit mobile number" style={{ height: 42 }} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Skills & Department</label>
                  <input className="fi" value={rb} onChange={(e) => setRb(e.target.value)} placeholder="e.g. CS, Python, AI" style={{ height: 42 }} />
                </div>
              </div>
              
              {/* Mandatory Live Biometric Verification */}
              <div style={{ marginBottom: "1.25rem" }}>
                <FaceVerification onCaptured={(desc) => setFaceDescriptor(desc)} />
              </div>

              <button
                className="btn btn-p"
                onClick={handleStudentRegister}
                disabled={loading || !faceDescriptor}
                style={{ width: "100%", height: 44, justifyContent: "center", fontSize: 14, fontWeight: 700 }}
              >
                {loading ? "Creating student account..." : !faceDescriptor ? "Live face scan required to register" : "Complete Student Registration & Sign In 🎓"}
              </button>

              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => { setRegRole("general_user"); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
                >
                  Not a student? Switch to General User signup →
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── SIGN UP: GENERAL USER FLOW (OTP + LIVE FACE) ─── */}
          {tab === "register" && regRole === "general_user" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", padding: "10px 14px", background: "rgba(139, 92, 246, 0.08)", borderRadius: 12, border: "1px solid rgba(139, 92, 246, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13.5, color: "var(--purple)" }}>
                  <span>⚡</span> General User Registration
                </div>
                <button
                  type="button"
                  onClick={() => { setRegRole(null); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                >
                  Change role
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Full Name</label>
                  <input className="fi" value={rn} onChange={(e) => setRn(e.target.value)} placeholder="Your full name" style={{ height: 42 }} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Phone Number</label>
                  <input className="fi" value={rphone} onChange={(e) => setRphone(e.target.value)} placeholder="10-digit mobile number" style={{ height: 42 }} />
                </div>
              </div>

              {/* Email & OTP Verification */}
              <div className="field" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Email Address</label>
                  {emailVerified ? (
                    <span style={{ fontSize: 11.5, color: "var(--em)", fontWeight: 700 }}>✓ Email Verified</span>
                  ) : regOtpSent ? (
                    <span style={{ fontSize: 11.5, color: "#34d399", fontWeight: 600 }}>Code Sent 📬</span>
                  ) : null}
                </div>
                
                <input
                  className="fi"
                  type="email"
                  value={re}
                  onChange={(e) => { setRe(e.target.value); setEmailVerified(false); }}
                  placeholder="your@email.com"
                  style={{ width: "100%", height: 44, fontSize: 14 }}
                />

                {!emailVerified && !regOtpSent && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={handleSendRegOtp}
                      disabled={loading || !re || !re.includes("@")}
                      style={{
                        width: "100%",
                        height: 38,
                        background: "rgba(139, 92, 246, 0.12)",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        borderRadius: 8,
                        color: "var(--purple)",
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {loading ? "Sending Verification Code..." : "⚡ Send Verification Code to Email"}
                    </button>
                  </div>
                )}

                {!emailVerified && regOtpSent && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 10, background: "rgba(139, 92, 246, 0.06)", border: "1px solid rgba(139, 92, 246, 0.2)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                        Enter 6-digit code sent to <b style={{ color: "#fff" }}>{re}</b>
                      </span>
                      <button
                        type="button"
                        onClick={handleSendRegOtp}
                        disabled={regCountdown > 0}
                        style={{ background: "none", border: "none", color: regCountdown > 0 ? "var(--text-muted)" : "var(--purple)", fontSize: 11, cursor: regCountdown > 0 ? "default" : "pointer" }}
                      >
                        {regCountdown > 0 ? `Resend (${regCountdown}s)` : "Resend code"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="fi"
                        placeholder="• • • • • •"
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        style={{ flex: 1, height: 38, textAlign: "center", letterSpacing: 6, fontSize: 16, fontWeight: 800 }}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyRegOtp}
                        disabled={loading || regOtp.length < 6}
                        style={{
                          padding: "0 16px",
                          height: 38,
                          borderRadius: 8,
                          border: "none",
                          background: "var(--purple)",
                          color: "#fff",
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Verify OTP ✓
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="field" style={{ marginBottom: "1.25rem" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Bio & Skills Offered</label>
                <input className="fi" value={rb} onChange={(e) => setRb(e.target.value)} placeholder="Skills offered / skills needed..." style={{ height: 42 }} />
              </div>
              
              {/* Mandatory Live Face Verification */}
              <div style={{ marginBottom: "1.25rem" }}>
                <FaceVerification onCaptured={(desc) => setFaceDescriptor(desc)} />
              </div>

              <button
                className="btn btn-p"
                onClick={handleGeneralRegister}
                disabled={loading || !faceDescriptor}
                style={{ width: "100%", height: 44, justifyContent: "center", fontSize: 14, fontWeight: 700 }}
              >
                {loading ? "Creating account..." : !faceDescriptor ? "Live face scan required to register" : "Complete Registration & Sign In ⚡"}
              </button>

              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => { setRegRole("student"); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
                >
                  Are you a student? Switch to Student signup →
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── FORGOT PASSWORD ─── */}
          {tab === "forgot" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                  Enter your email address to receive password reset instructions.
                </p>
              </div>
              <div className="field" style={{ marginBottom: "1.25rem" }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Email Address</label>
                <input className="fi" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="your@email.com" style={{ height: 44 }} />
              </div>
              <button className="btn btn-p" onClick={() => { setError(""); alert("Reset instructions dispatched to " + forgotEmail); setTab("login"); }} style={{ marginBottom: "0.75rem", width: "100%", height: 44, justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                Send Reset Link
              </button>
              <button className="btn btn-o" onClick={() => { setTab("login"); setError(""); }} style={{ width: "100%", height: 44, justifyContent: "center", fontSize: 14 }}>
                Back to Sign In
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function WebsiteAdminLogin({ doLogin }) {
  const [ae, setAe] = useState("admin@timebank.com"), [ap, setAp] = useState("admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdminSubmit = async () => {
    if (!ae || !ap) { setError("Fill admin credentials"); return; }
    setError("");
    setLoading(true);
    try {
      await doLogin(ae, ap);
    } catch (e) {
      setError(e.message || "Website Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap" style={{ background: "transparent", position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", justifyContent: "center", width: "100%", margin: "0 auto" }}>
        <motion.div className="auth-card" style={{ width: "100%", maxWidth: 340 }} {...fadeUp(0.2)}>
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--purple-bg)", color: "var(--purple)", border: "1px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", fontSize: 18 }}>🌐</div>
            <h2 className="auth-title" style={{ fontSize: 18 }}>Website Admin Portal</h2>
            <p className="auth-sub" style={{ fontSize: 12 }}>Platform administrative access</p>
          </div>
          {error && (
            <div style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: "1.25rem", textAlign: "center" }}>
              {error}
            </div>
          )}
          <div className="field"><label>Admin Email</label><input className="fi" value={ae} onChange={(e) => setAe(e.target.value)} placeholder="admin@timebank.com" /></div>
          <div className="field"><label>Password</label><input className="fi" type="password" value={ap} onChange={(e) => setAp(e.target.value)} placeholder="Admin password" onKeyDown={(e) => e.key === "Enter" && handleAdminSubmit()} /></div>
          <button className="btn btn-p" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid var(--purple)", color: "#fff", boxShadow: "none" }} onClick={handleAdminSubmit} disabled={loading}>
            {loading ? "Authenticating..." : "Sign in as Website Admin"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function CollegeAdminLogin({ doLogin }) {
  const [ae, setAe] = useState("college@timebank.com"), [ap, setAp] = useState("admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdminSubmit = async () => {
    if (!ae || !ap) { setError("Fill admin credentials"); return; }
    setError("");
    setLoading(true);
    try {
      await doLogin(ae, ap);
    } catch (e) {
      setError(e.message || "College Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap" style={{ background: "transparent", position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", justifyContent: "center", width: "100%", margin: "0 auto" }}>
        <motion.div className="auth-card" style={{ width: "100%", maxWidth: 340 }} {...fadeUp(0.2)}>
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--purple-bg)", color: "var(--purple)", border: "1px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", fontSize: 18 }}>🏫</div>
            <h2 className="auth-title" style={{ fontSize: 18 }}>College Admin Portal</h2>
            <p className="auth-sub" style={{ fontSize: 12 }}>Institution scoped access</p>
          </div>
          {error && (
            <div style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: "1.25rem", textAlign: "center" }}>
              {error}
            </div>
          )}
          <div className="field"><label>Admin Email</label><input className="fi" value={ae} onChange={(e) => setAe(e.target.value)} placeholder="college@timebank.com" /></div>
          <div className="field"><label>Password</label><input className="fi" type="password" value={ap} onChange={(e) => setAp(e.target.value)} placeholder="Admin password" onKeyDown={(e) => e.key === "Enter" && handleAdminSubmit()} /></div>
          <button className="btn btn-p" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid var(--purple)", color: "#fff", boxShadow: "none" }} onClick={handleAdminSubmit} disabled={loading}>
            {loading ? "Authenticating..." : "Sign in as College Admin"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
function Dashboard({ user, wallet, notify, nav, connectWallet, setModal }) {
  const [bookings, setBookings] = useState([]);
  const [txs, setTxs] = useState([]);
  const [aicte, setAicte] = useState([]);
  const [emergency, setEmergency] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.fetchUserBookings(user._id).then(setBookings).catch(() => {});
    api.fetchUserTransactions(user._id).then(setTxs).catch(() => {});
    api.fetchUserAicte(user._id).then(setAicte).catch(() => {});
    api.fetchEmergencyContacts(user._id).then(setEmergency).catch(() => {});
  }, [user]);

  const pending = bookings.filter((b) => b.status === "pending").length;
  const verifiedAicte = aicte.filter((a) => a.verified);
  const apts = verifiedAicte.reduce((s, a) => s + a.pts, 0);

  const sos = () => {
    if (!emergency.length) { notify("No emergency contacts — add them in Profile", "warning"); return; }
    setModal(<SosModal emergency={emergency} notify={notify} />);
  };

  return (
    <div className="inner">
      <div className="ph">
        <h1>Welcome back, {user.name.split(" ")[0]} 👋</h1>
        <p>{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <motion.div className="g3" variants={stagger} initial="initial" animate="animate">
        {[
          { l: "Time credits", v: user.credits, s: "On-chain balance", c: "text-g", i: <ClockIcon size={16} color="var(--em)" /> },
          { l: "AICTE points", v: apts, s: `${verifiedAicte.length} activities`, c: "text-p", i: <AicteIcon size={16} color="var(--purple)" /> },
          { l: "Pending bookings", v: pending, s: "Awaiting action", c: "", i: <BookingIcon size={16} color="var(--blue)" /> },
          { l: "Reputation", v: user.rep ? user.rep : "—", s: `${user.reviews} reviews`, c: "", i: <StarIcon size={16} color="var(--amber)" fill="var(--amber)" /> },
        ].map((st, i) => (
          <motion.div key={st.l} className="stat" variants={fadeUp(i * 0.06)}>
            <div className="btwn" style={{ marginBottom: "8px", alignItems: "center" }}>
              <div className="stat-l" style={{ margin: 0 }}>{st.l}</div>
              <div style={{ display: "flex", alignItems: "center" }}>{st.i}</div>
            </div>
            <div className={`stat-v ${st.c}`}>{st.v}</div>
            <div className="stat-s">{st.s}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Analytics Grid: Real-Time Charts */}
      <motion.div className="g2" {...fadeUp(0.12)}>
        <div className="card">
          <div className="card-t">Credit balance timeline</div>
          <CreditTimelineChart txs={txs} userId={user._id} />
        </div>
        <div className="card">
          <div className="card-t">Time credits exchange stats</div>
          <EarnedSpentGauge user={user} />
        </div>
      </motion.div>

      <motion.div className="g2" {...fadeUp(0.18)}>
        <div className="card">
          <div className="btwn mb1">
            <span className="card-t" style={{ margin: 0 }}>Blockchain wallet</span>
            <span className={`tag ${wallet?.isInbuilt ? "tp" : "tt"}`}>
              {wallet?.isInbuilt ? "Inbuilt Wallet" : "Polygon Amoy"}
            </span>
          </div>
          {wallet ? (
            <>
              <div className="chash mt1" style={{ wordBreak: "break-all" }}>{wallet.address}</div>
              <div className="btwn mt2"><span className="text-s" style={{ fontSize: 13 }}>POL balance</span><span className="text-g fw7">{parseFloat(wallet.balance).toFixed(4)} POL</span></div>
              <a href={chain.addressLink(wallet.address)} target="_blank" rel="noreferrer" style={{ fontSize: 12, display: "inline-block", marginTop: 6 }}>View on Polygonscan ↗</a>
            </>
          ) : (
            <button className="btn btn-g mt1" onClick={connectWallet}>
              {chain.isMetaMaskInstalled() ? "Connect MetaMask" : "Connect Inbuilt Wallet"}
            </button>
          )}
        </div>
        <div className="card">
          <div className="card-t">Recent transactions</div>
          {txs.slice(0, 4).map((tx) => {
            const inc = tx.toId === user._id;
            return (
              <div key={tx._id} className="btwn" style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <div className="row">
                  <span className={`tag ${tx.type === "aicte_reward" ? "tp" : tx.type === "initial_credits" ? "tb" : tx.type === "gas_faucet_claim" ? "ta" : "tg"}`}>
                    {tx.type === "aicte_reward" ? "AICTE" : tx.type === "initial_credits" ? "Starter" : tx.type === "gas_faucet_claim" ? "Gas Station" : "Transfer"}
                  </span>
                  <span className="text-s">{tx.desc}</span>
                </div>
                <span style={{ fontWeight: 700, color: inc ? "var(--em-dark)" : "var(--red)" }}>
                  {inc ? "+" : "-"}{tx.amount}{tx.type === "gas_faucet_claim" ? " POL" : "h"}
                </span>
              </div>
            );
          })}
          {txs.length === 0 && <div className="text-m" style={{ fontSize: 13 }}>No transactions yet</div>}
          {txs.length > 0 && <button className="btn btn-o btn-sm mt1" onClick={() => nav("wallet")}>View all →</button>}
        </div>
      </motion.div>

      <motion.div className="sos-band" {...fadeUp(0.25)}>
        <div className="btwn">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--red)", fontSize: 14 }}>
              <SosIcon size={16} color="var(--red)" />
              <span>Emergency SOS</span>
            </div>
            <div className="text-s" style={{ fontSize: 13, marginTop: 2 }}>Alert all emergency contacts instantly</div>
          </div>
          <button className="btn btn-d btn-sm" onClick={sos}>Send SOS</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── SERVICES ────────────────────────────────────────────────────────────────
function Services({ user, skills, notify, nav, getU, getSk, setModal, refreshUser, loadSkills }) {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [recommendations, setRecommendations] = useState([]);
  const [mlRecommendations, setMlRecommendations] = useState([]);
  
  const load = useCallback(() => {
    setLoading(true);
    api.fetchServices().then((s) => { setServices(s); setLoading(false); }).catch(() => setLoading(false));
    api.fetchRecommendations().then(r => setRecommendations(r)).catch(console.error);
  }, []);
  useEffect(load, [load]);

  // Debounced search for ML recommendations
  useEffect(() => {
    if (search.trim().length >= 2) {
      const timer = setTimeout(() => {
        api.fetchMLRecommendations(search)
          .then(res => {
            if (res && res.recommendations) {
              setMlRecommendations(res.recommendations.filter(r => r.user_id !== user._id));
            } else {
              setMlRecommendations([]);
            }
          })
          .catch(e => {
            console.error("ML Rec error:", e);
            setMlRecommendations([]);
          });
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setMlRecommendations([]);
    }
  }, [search, user._id]);

  const cats = [...new Set(skills.map((s) => s.category))];
  let svcs = services.filter((s) => s.status === "active");
  if (filter !== "all") svcs = svcs.filter((s) => { const sk = getSk(s.skillId); return sk && sk.category === filter; });
  if (search) svcs = svcs.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()));

  const openDetail = (svc) => {
    const prov = getU(svc.providerId), sk = getSk(svc.skillId), own = svc.providerId === user._id;
    setModal(
      <ServiceDetailModal
        user={user}
        svc={svc}
        prov={prov}
        sk={sk}
        own={own}
        close={() => setModal(null)}
        notify={notify}
        nav={nav}
        refreshUser={refreshUser}
        load={load}
        setModal={setModal}
      />
    );
  };

  const openCreate = () => {
    setModal(
      <OfferSkillModal
        user={user}
        skills={skills}
        notify={notify}
        load={load}
        loadSkills={loadSkills}
      />
    );
  };

  return (
    <div className="inner">
      <div className="btwn mb2"><div className="ph" style={{ margin: 0 }}><h1>Services</h1><p>Browse available skills to book</p></div><button className="btn btn-g" onClick={openCreate}>+ Offer skill</button></div>
      <div className="row mb2" style={{ flexWrap: "wrap", gap: 8 }}>
        <input className="search-fi" value={search} placeholder="Search services..." onChange={(e) => setSearch(e.target.value)} />
        <div className={`chip${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>All</div>
        {cats.map((c) => <div key={c} className={`chip${filter === c ? " on" : ""}`} onClick={() => setFilter(c)}>{c}</div>)}
      </div>
      
      {search && mlRecommendations.length > 0 && (
        <div className="mb2">
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--purple)", fontSize: "1.2rem" }}>✨</span> AI Recommended Matches
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "1rem" }}>
            {mlRecommendations.map((match) => {
              const provServices = services.filter(s => s.providerId === match.user_id && s.status === "active");
              const targetService = provServices.find(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())) || provServices[0];
              const matchPct = (match.match_score * 100).toFixed(0);
              return (
                <motion.div key={match.user_id} className="card" whileHover={{ y: -2 }} onClick={() => targetService ? openDetail(targetService) : notify("User has no active services for this skill", "warning")} style={{ border: "1px solid rgba(139,92,246,0.5)", background: "linear-gradient(to bottom right, rgba(139,92,246,0.08), transparent)", cursor: targetService ? "pointer" : "default" }}>
                  <div className="btwn mb1">
                    <div className="row"><div className="av-sm">{match.avatar || "U"}</div><span style={{ fontWeight: 600 }}>{match.name}</span></div>
                    <div className="tag tp" style={{ fontWeight: "bold" }}>{matchPct}% Match</div>
                  </div>
                  <div className="text-s mb1" style={{ color: "var(--text-m)" }}>
                    <span style={{ color: "var(--yellow)" }}>{"⭐".repeat(Math.round(match.rating) || 1)}</span> ({match.experience_years}y exp)
                  </div>
                  <div className="text-s clamp" style={{ flex: 1, minHeight: 40 }}>
                    Skills: {match.skills.join(", ") || "None"}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {recommendations.length > 0 && filter === "all" && !search && (
        <div className="mb2">
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--purple)", fontSize: "1.2rem" }}>🤖</span> Featured For You
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "1rem" }}>
            {recommendations.map((s) => {
              const prov = getU(s.providerId), sk = getSk(s.skillId);
              return (
                <motion.div key={s._id} className="card" whileHover={{ y: -2 }} onClick={() => openDetail(s)} style={{ border: "1px solid rgba(139,92,246,0.3)", background: "linear-gradient(to bottom right, rgba(139,92,246,0.05), transparent)", cursor: "pointer" }}>
                  <div className="card-tag" style={{ background: "var(--purple-bg)", color: "var(--purple)" }}>{s.category}</div>
                  <h3>{s.title}</h3>
                  <p className="text-s clamp mb1" style={{ flex: 1 }}>{s.description}</p>
                  <div className="btwn" style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                    <div className="row"><div className="av-sm">{prov?.avatar || "U"}</div><span className="text-s">{prov?.name?.split(" ")[0] || "User"}</span></div>
                    <div style={{ fontWeight: 600, color: "var(--purple)" }}>{s.price} cr</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? <div className="empty">Loading...</div> : svcs.length === 0 ? (
        <div className="empty">{services.length === 0 ? "No services yet — be the first to offer a skill!" : "No matches found."}</div>
      ) : (
        <motion.div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "1rem" }} variants={stagger} initial="initial" animate="animate">
          {svcs.map((s) => {
            const prov = getU(s.providerId), sk = getSk(s.skillId);
            return (
              <motion.div key={s._id} className="svc-card" onClick={() => openDetail(s)} variants={fadeUp()} {...cardHover} style={{ cursor: "pointer" }}>
                {s.images && s.images.length > 0 && (
                  <ImageSlider images={s.images} />
                )}
                <div className="btwn mb1"><span className="tag tb">{sk?.name || "Skill"}</span><span className="tag tg">⏱ {s.hours}h</span></div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.title}</div>
                <div className="text-s" style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</div>
                {prov && <div className="row"><div className="av" style={{ width: 26, height: 26, fontSize: 10 }}>{prov.avatar}</div><span className="text-s" style={{ fontSize: 12 }}>{prov.name}</span></div>}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

// ─── BOOKINGS────────────────────────────────────────────────────────────────
function Bookings({ user, wallet, notify, getU, refreshUser, connectWallet }) {
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.fetchUserBookings(user._id).then((b) => { setBookings(b); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);
  useEffect(load, [load]);

  const tabs = ["all", "pending", "confirmed", "completed"];
  const filtered = tab === "all" ? bookings : bookings.filter((b) => b.status === tab);

  const confirm = async (b) => {
    try {
      await api.updateBooking(b._id, { status: "confirmed" });
      notify("Booking confirmed!"); load();
    } catch (e) { notify(e.message, "error"); }
  };

  const cancel = async (b) => {
    try {
      await api.updateBooking(b._id, { status: "cancelled" });
      notify("Booking cancelled"); load();
    } catch (e) { notify(e.message, "error"); }
  };

  const complete = async (b) => {
    let txHash = null, blockNumber = null;
    // Attempt blockchain transfer if both parties have wallets
    const requester = getU(b.requesterId);
    const provider = getU(b.providerId);
    if (wallet && requester?.wallet && provider?.wallet) {
      try {
        notify("Signing blockchain transaction...", "info");
        const result = await chain.sendCredits(wallet.signer, provider._id === user._id ? requester.wallet : provider.wallet, b.hours, wallet.isInbuilt);
        txHash = result.txHash;
        blockNumber = result.blockNumber;
        notify("On-chain transfer confirmed!");
      } catch (e) {
        notify("Blockchain tx failed — completing without on-chain proof", "warning");
      }
    }
    try {
      await api.completeBooking(b._id, txHash, blockNumber);
      notify("Session completed! Credits transferred.");
      load(); refreshUser();
    } catch (e) { notify(e.message, "error"); }
  };

  return (
    <div className="inner">
      <div className="ph"><h1>Bookings</h1><p>Manage your sessions</p></div>
      <div className="tab-bar">
        {tabs.map((t) => <button key={t} className={`tb-btn${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>
      {loading ? <div className="empty">Loading...</div> : filtered.length === 0 ? (
        <div className="empty">No {tab === "all" ? "" : tab + " "}bookings yet.</div>
      ) : (
        <motion.div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} variants={stagger} initial="initial" animate="animate">
          {filtered.map((b) => {
            const isProvider = b.providerId === user._id;
            const other = getU(isProvider ? b.requesterId : b.providerId);
            const statusColors = { pending: "ta", confirmed: "tb", completed: "tg", cancelled: "tr" };
            return (
              <motion.div key={b._id} className="bk-row" variants={fadeUp()}>
                <div className="av" style={{ width: 34, height: 34, fontSize: 11, cursor: "pointer" }} onClick={() => other && setModal(<ProviderProfileModal userId={other._id} notify={notify} close={() => setModal(null)} />)}>{other?.avatar || "?"}</div>
                <div style={{ flex: 1 }}>
                  <div className="btwn">
                    <div style={{ fontWeight: 700, fontSize: 14, cursor: "pointer" }} onClick={() => other && setModal(<ProviderProfileModal userId={other._id} notify={notify} close={() => setModal(null)} />)}>{other?.name || "User"}</div>
                    <span className={`tag ${statusColors[b.status]}`}>{b.status}</span>
                  </div>
                  <div className="text-s" style={{ fontSize: 12, marginTop: 2 }}>
                    {isProvider ? "You are providing" : "You are requesting"} · {b.hours}h · {new Date(b.scheduledStart).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  {b.notes && <div className="text-m" style={{ fontSize: 12, marginTop: 4 }}>"{b.notes}"</div>}
                  {b.txHash && <a href={chain.txLink(b.txHash)} target="_blank" rel="noreferrer" className="chash" style={{ display: "inline-block", marginTop: 4, color: "var(--em)" }}>View on Polygonscan ↗</a>}
                  <div className="row mt1" style={{ gap: 6 }}>
                    {b.status === "pending" && isProvider && <><button className="btn btn-g btn-sm" onClick={() => confirm(b)}>Confirm</button><button className="btn btn-o btn-sm" onClick={() => cancel(b)}>Decline</button></>}
                    {b.status === "confirmed" && isProvider && <button className="btn btn-g btn-sm" onClick={() => complete(b)}>Complete session</button>}
                    {b.status === "pending" && !isProvider && <button className="btn btn-o btn-sm" onClick={() => cancel(b)}>Cancel</button>}
                    {b.status === "completed" && !isProvider && !b.requesterReviewed && (
                      <button className="btn btn-o btn-sm" style={{ color: "var(--yellow)", borderColor: "var(--yellow)" }} onClick={() => setModal(<ReviewModal booking={b} refreshUser={() => { load(); refreshUser(); }} notify={notify} close={() => setModal(null)} />)}>
                        ⭐ Leave Review
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

// ─── WALLET ──────────────────────────────────────────────────────────────────
function Wallet({ user, wallet, setWallet, notify, connectWallet, refreshUser }) {
  const [txs, setTxs] = useState([]);
  const [bcRecords, setBcRecords] = useState([]);
  const [relayerStatus, setRelayerStatus] = useState(null);
  const [claimingGas, setClaimingGas] = useState(false);
  const [refreshingBal, setRefreshingBal] = useState(false);
  const [gasCountdown, setGasCountdown] = useState(0);
  
  const initialPol = Math.max(parseFloat(user?.polBalance || 0), parseFloat(wallet?.balance || 0)).toFixed(4);
  const [livePolBalance, setLivePolBalance] = useState(initialPol);

  // Sync on-chain balance without causing re-render loops
  const syncOnChainBalance = useCallback(async () => {
    if (!wallet?.address) return;
    setRefreshingBal(true);
    try {
      let onChainBal = "0.0";
      if (wallet.provider) {
        onChainBal = await chain.getBalance(wallet.provider, wallet.address);
      } else {
        const tempProvider = new ethers.JsonRpcProvider("https://polygon-amoy-bor-rpc.publicnode.com", 80002);
        onChainBal = await chain.getBalance(tempProvider, wallet.address);
      }
      const onChainNum = parseFloat(onChainBal || 0);
      const userNum = parseFloat(user?.polBalance || 0);
      
      setLivePolBalance((prev) => {
        const prevNum = parseFloat(prev || 0);
        const maxVal = Math.max(onChainNum, userNum, prevNum);
        const formatted = maxVal.toFixed(4);
        if (setWallet) {
          setWallet((w) => w ? ({ ...w, balance: formatted }) : w);
        }
        return formatted;
      });
    } catch (e) {
      console.warn("Sync balance error:", e);
    } finally {
      setRefreshingBal(false);
    }
  }, [wallet?.address, wallet?.provider, setWallet, user?.polBalance]);

  // Sync state if user DB polBalance changes
  useEffect(() => {
    if (user?.polBalance !== undefined) {
      setLivePolBalance((prev) => Math.max(parseFloat(prev || 0), parseFloat(user.polBalance)).toFixed(4));
    }
  }, [user?.polBalance]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (gasCountdown > 0) {
      timer = setTimeout(() => setGasCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [gasCountdown]);

  // Load initial data
  const loadData = useCallback(() => {
    if (!user?._id) return;
    api.fetchUserTransactions(user._id).then(setTxs).catch(() => {});
    api.fetchBlockchainRecords().then(setBcRecords).catch(() => {});
    api.fetchFaucetStatus().then(setRelayerStatus).catch(() => {});
  }, [user?._id]);

  // Real-time socket listeners
  useEffect(() => {
    let socket = null;
    try {
      socket = io(window.location.origin, {
        auth: { token: localStorage.getItem("token") },
        transports: ["websocket", "polling"],
      });

      socket.on("blockchain_ledger_entry", (entry) => {
        if (!entry) return;
        setBcRecords((prev) => [entry, ...prev.filter((x) => x._id !== entry._id)]);
      });

      socket.on("faucet_drip", (data) => {
        if (data?.entry) {
          setBcRecords((prev) => [data.entry, ...prev.filter((x) => x._id !== data.entry._id)]);
        }
        if (data?.polBalance !== undefined) {
          setLivePolBalance(parseFloat(data.polBalance).toFixed(4));
          if (setWallet) {
            setWallet((prev) => prev ? ({ ...prev, balance: parseFloat(data.polBalance).toFixed(4) }) : prev);
          }
        }
        if (data?.claimsRemainingToday !== undefined) {
          setRelayerStatus((prev) => prev ? ({
            ...prev,
            claimsRemainingToday: data.claimsRemainingToday,
            claimsMadeToday: data.claimsMadeToday,
          }) : prev);
        }
      });

      socket.on("wallet_update", (data) => {
        if (data?.polBalance !== undefined) {
          setLivePolBalance(parseFloat(data.polBalance).toFixed(4));
        }
        if (data?.claimsRemainingToday !== undefined) {
          setRelayerStatus((prev) => prev ? ({ ...prev, claimsRemainingToday: data.claimsRemainingToday }) : prev);
        }
      });
    } catch (e) {
      console.warn("Wallet socket listener error:", e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [setWallet]);

  // Initial mount trigger
  useEffect(() => {
    loadData();
    syncOnChainBalance();
  }, [loadData, syncOnChainBalance]);

  // Handle Real-Time 1-Click Gas Claim
  const handleClaimGas = async () => {
    if (!wallet?.address) {
      notify("Please connect your wallet first", "warning");
      return;
    }
    setClaimingGas(true);
    try {
      const res = await api.dripGas(wallet.address);
      setGasCountdown(60);
      
      // Calculate updated balance
      const currentVal = Math.max(parseFloat(livePolBalance || 0), parseFloat(user?.polBalance || 0), parseFloat(wallet?.balance || 0));
      const newBal = (currentVal + 0.05).toFixed(4);
      setLivePolBalance(newBal);
      if (setWallet) {
        setWallet((prev) => prev ? ({ ...prev, balance: newBal }) : prev);
      }

      // Update remaining claims in local state
      if (res.claimsRemainingToday !== undefined) {
        setRelayerStatus((prev) => prev ? ({
          ...prev,
          claimsRemainingToday: res.claimsRemainingToday,
          claimsMadeToday: res.claimsMadeToday,
        }) : prev);
      }

      // Prepend to Blockchain Ledger in UI immediately
      if (res.entry) {
        setBcRecords((prev) => [res.entry, ...prev.filter((x) => x._id !== res.entry._id)]);
      }

      // Prepend to Transaction log in UI immediately
      const dripTx = {
        _id: "drip_" + Date.now(),
        fromId: "SYSTEM",
        toId: user._id,
        amount: 0.05,
        type: "gas_faucet_claim",
        desc: `1-Click Gas Claim — 0.05 POL (Claim ${res.claimsMadeToday || 1}/5)`,
        txHash: res.txHash,
        blockNumber: res.blockNumber,
        createdAt: new Date().toISOString(),
      };
      setTxs((prev) => [dripTx, ...prev]);

      notify(`⛽ +0.05 POL testnet gas dispatched! (${res.claimsRemainingToday !== undefined ? `${res.claimsRemainingToday}/5 claims remaining today` : ""})`);
      
      if (refreshUser) refreshUser();
      loadData();
    } catch (e) {
      notify(e.message || "Failed to claim testnet gas", "error");
    } finally {
      setClaimingGas(false);
    }
  };

  return (
    <div className="inner">
      <div className="ph"><h1>Wallet & Blockchain</h1><p>Real-time on-chain credits, gas station, and immutable ledger</p></div>
      
      {/* Zero-Gas Auto-Relayer Status Banner */}
      <motion.div className="card mb2" style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)", border: "1px solid rgba(16, 185, 129, 0.35)" }} {...fadeUp(0.08)}>
        <div className="btwn" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <span>Gasless Blockchain Engine Active</span>
                <span className="tag tg" style={{ fontSize: 10, padding: "2px 8px" }}>Zero Gas Fees</span>
              </div>
              <div className="text-s" style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 3 }}>
                All Time Credit transfers and AICTE verifications are automatically sponsored on Polygon Amoy. No POL needed to exchange credits!
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--em)", fontWeight: 700 }}>🟢 Polygon Amoy Relayer Online</span>
          </div>
        </div>
      </motion.div>

      <motion.div className="wallet-hero mb2" {...fadeUp(0.1)}>
        <div className="btwn">
          <span style={{ fontSize: 13, opacity: 0.7 }}>TimeBank Credits</span>
          <span className="tag" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            {wallet?.isInbuilt ? "Inbuilt Wallet" : "Polygon Amoy"}
          </span>
        </div>
        <div className="wallet-num">{user.credits}</div>
        <div style={{ display: "flex", gap: "2rem", fontSize: 13, opacity: 0.7, marginBottom: 12 }}>
          <span>Earned: {user.earned}h</span><span>Spent: {user.spent}h</span>
        </div>
        {wallet ? (
          <>
            <div style={{ fontSize: 11, fontFamily: "monospace", opacity: 0.6, wordBreak: "break-all" }}>{wallet.address}</div>
            <div className="btwn mt1" style={{ alignItems: "center" }}>
              <span style={{ fontSize: 13 }}>POL balance</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: parseFloat(livePolBalance) > 0 ? "var(--em)" : "#fff" }}>
                  {livePolBalance} POL
                </span>
                <button
                  onClick={syncOnChainBalance}
                  disabled={refreshingBal}
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 4, color: "#ccc", padding: "2px 6px", fontSize: 11, cursor: "pointer" }}
                  title="Refresh live on-chain balance"
                >
                  {refreshingBal ? "..." : "🔄"}
                </button>
              </div>
            </div>
            <a href={chain.addressLink(wallet.address)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#34d399", display: "inline-block", marginTop: 4 }}>View Wallet on Polygonscan ↗</a>
          </>
        ) : (
          <button className="btn" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", marginTop: 4 }} onClick={connectWallet}>
            {chain.isMetaMaskInstalled() ? "Connect MetaMask" : "Connect Inbuilt Wallet"}
          </button>
        )}
      </motion.div>

      {/* 1-Click Instant Gas Dispenser Card */}
      {wallet && (
        <motion.div className="card mb2" style={{ border: "1px solid rgba(139, 92, 246, 0.35)", background: "rgba(139, 92, 246, 0.05)" }} {...fadeUp(0.15)}>
          <div className="btwn" style={{ flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: "#fff", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span>⛽ 1-Click Instant Testnet Gas Dispenser</span>
                <span className={`tag ${relayerStatus?.claimsRemainingToday === 0 ? "tr" : "tp"}`} style={{ fontSize: 11, padding: "2px 8px" }}>
                  {relayerStatus?.claimsRemainingToday !== undefined
                    ? `${relayerStatus.claimsRemainingToday}/5 claims left today (${relayerStatus.claimsMadeToday || (5 - relayerStatus.claimsRemainingToday)}/5 used)`
                    : "5 claims / day (0.25 POL)"}
                </span>
              </div>
              <div className="text-s" style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
                Dispense 0.05 POL testnet gas directly to your wallet in 1 click (Strict 5 claims / 0.25 POL per day quota).
              </div>
            </div>
            <button
              className="btn btn-p btn-sm"
              onClick={handleClaimGas}
              disabled={claimingGas || gasCountdown > 0 || relayerStatus?.claimsRemainingToday === 0}
              style={{
                padding: "8px 16px",
                fontWeight: 700,
                fontSize: 13,
                height: 38,
                minWidth: 180,
                justifyContent: "center",
                opacity: relayerStatus?.claimsRemainingToday === 0 ? 0.6 : 1,
                cursor: relayerStatus?.claimsRemainingToday === 0 ? "not-allowed" : "pointer"
              }}
            >
              {claimingGas
                ? "Dispensing 0.05 POL..."
                : gasCountdown > 0
                ? `⏳ Cooldown (${gasCountdown}s)`
                : relayerStatus?.claimsRemainingToday === 0
                ? "🚫 Daily Limit Reached (5/5)"
                : "⛽ Claim 0.05 POL Gas"}
            </button>
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 12, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ color: "#aaa", display: "flex", alignItems: "center", gap: 6 }}>
              <span>Need additional Amoy testnet POL?</span>
              <a href="https://faucet.polygon.technology/" target="_blank" rel="noreferrer" style={{ color: "#a78bfa", textDecoration: "underline" }}>Polygon Official Faucet ↗</a>
              <span>•</span>
              <a href="https://www.alchemy.com/faucets/polygon-amoy" target="_blank" rel="noreferrer" style={{ color: "#a78bfa", textDecoration: "underline" }}>Alchemy Faucet ↗</a>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(wallet.address);
                notify("📋 Wallet address copied to clipboard!");
              }}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#ddd", padding: "2px 8px", fontSize: 11, cursor: "pointer" }}
            >
              📋 Copy Wallet Address
            </button>
          </div>
        </motion.div>
      )}

      {/* Transaction History Card */}
      <motion.div className="card mb2" {...fadeUp(0.2)}>
        <div className="card-t">Transaction History</div>
        {txs.length === 0 ? <div className="text-m" style={{ fontSize: 13 }}>No transactions yet</div> : txs.map((tx) => {
          const inc = tx.toId === user._id;
          return (
            <div key={tx._id} className="btwn" style={{ fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--border)", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div className="row" style={{ gap: 10, alignItems: "center" }}>
                <span className={`tag ${tx.type === "aicte_reward" ? "tp" : tx.type === "initial_credits" ? "tb" : tx.type === "gas_faucet_claim" ? "ta" : "tg"}`}>
                  {tx.type === "aicte_reward" ? "AICTE" : tx.type === "initial_credits" ? "Starter" : tx.type === "gas_faucet_claim" ? "Gas Station" : "Transfer"}
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>{tx.desc}</div>
                  {tx.txHash && (
                    <a
                      href={chain.txLink(tx.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--em)", fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 3, marginTop: 2 }}
                    >
                      🔗 Polygonscan ({chain.formatAddress(tx.txHash)}) ↗
                    </a>
                  )}
                </div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 14, color: inc ? "var(--em-dark)" : "var(--red)" }}>
                {inc ? "+" : "-"}{tx.amount}{tx.type === "gas_faucet_claim" ? " POL" : "h"}
              </span>
            </div>
          );
        })}
      </motion.div>

      {/* Immutable Blockchain Ledger Feed */}
      <motion.div className="card" {...fadeUp(0.25)}>
        <div className="btwn mb1" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div className="card-t" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span>⛓️ Immutable Blockchain Ledger (Polygon Amoy)</span>
              <span className="tag tg" style={{ fontSize: 10, padding: "2px 8px" }}>Live Feed</span>
            </div>
            <div className="text-s" style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Real-time blocks minted and anchored on Polygon Amoy testnet. Click any entry to inspect on Polygonscan.
            </div>
          </div>
          <button className="btn btn-o btn-sm" onClick={loadData} style={{ padding: "4px 10px", fontSize: 12 }}>
            🔄 Refresh
          </button>
        </div>

        {bcRecords.length === 0 ? (
          <div className="text-m" style={{ fontSize: 13, padding: "1rem 0" }}>No blockchain ledger records yet. Complete a service or claim gas to see on-chain blocks!</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {bcRecords.map((r) => (
              <div
                key={r._id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className={`tag ${r.type === "AICTE_MINT" || r.type === "MINT" ? "tp" : r.type === "GAS_DRIP" ? "ta" : "tg"}`} style={{ fontWeight: 700, fontSize: 11 }}>
                    {r.type}
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--purple)", fontWeight: 700 }}>
                    Block #{r.block}
                  </span>
                  <span style={{ fontSize: 12.5, color: "#fff", fontWeight: 600 }}>
                    {r.amount} {r.type === "GAS_DRIP" ? "POL" : "Credits"}
                  </span>
                  <span className="text-m" style={{ fontSize: 11.5, fontFamily: "monospace" }}>
                    {chain.formatAddress(r.from)} → {chain.formatAddress(r.to)}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <a
                    href={chain.txLink(r.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--em)",
                      fontWeight: 700,
                      fontSize: 12,
                      background: "rgba(0, 194, 122, 0.1)",
                      border: "1px solid rgba(0, 194, 122, 0.25)",
                      borderRadius: 6,
                      padding: "4px 10px",
                      textDecoration: "none",
                    }}
                  >
                    <span>View on Polygonscan</span> ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── AICTE ───────────────────────────────────────────────────────────────────
function AICTEPage({ user, notify, setModal, refreshUser }) {
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState("verified");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.fetchUserAicte(user._id).then((a) => { setActivities(a); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);
  useEffect(load, [load]);

  const verified = activities.filter((a) => a.verified);
  const pending = activities.filter((a) => !a.verified);
  const shown = tab === "verified" ? verified : pending;
  const totalPts = verified.reduce((s, a) => s + a.pts, 0);
  const totalCr = verified.reduce((s, a) => s + a.credits, 0);

  const openSubmit = () => {
    setModal(<SubmitAicteModal key={Date.now()} user={user} notify={notify} load={load} />);
  };

  return (
    <div className="inner" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Verifiable AICTE Accreditation Hub & Blockchain Certificates */}
      <AICTEProgress
        user={user}
        notify={notify}
        onOpenVerify={(certId) => setModal(<VerifyCertificate certId={certId} onClose={() => setModal(null)} />)}
      />

      {/* Manual Activity Submission Ledger */}
      <div>
        <div className="btwn mb2">
          <div className="ph" style={{ margin: 0 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Institutional Activity Claims</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>Submit external hackathons, workshops, and verified college projects</p>
          </div>
          <button className="btn btn-g" onClick={openSubmit}>+ Submit Activity</button>
        </div>

        <motion.div className="g3 mb2" variants={stagger} initial="initial" animate="animate">
          <motion.div className="stat" variants={fadeUp()}><div className="stat-l">Manual points</div><div className="stat-v text-p">{totalPts}</div></motion.div>
          <motion.div className="stat" variants={fadeUp(0.05)}><div className="stat-l">Bonus credits</div><div className="stat-v text-g">{totalCr}</div></motion.div>
          <motion.div className="stat" variants={fadeUp(0.1)}><div className="stat-l">Pending review</div><div className="stat-v text-a">{pending.length}</div></motion.div>
        </motion.div>
        
        <div className="tab-bar">
          <button className={`tb-btn${tab === "verified" ? " on" : ""}`} onClick={() => setTab("verified")}>Verified ({verified.length})</button>
          <button className={`tb-btn${tab === "pending" ? " on" : ""}`} onClick={() => setTab("pending")}>Pending ({pending.length})</button>
        </div>
        
        {loading ? <div className="empty">Loading activities...</div> : shown.length === 0 ? (
          <div className="empty">No {tab} activities recorded.</div>
        ) : (
          <motion.div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} variants={stagger} initial="initial" animate="animate">
            {shown.map((a) => (
              <motion.div key={a._id} className="ac-card" variants={fadeUp()}>
                <div className="btwn">
                  <div className="row"><span className={`tag ${a.verified ? "tg" : "ta"}`}>{a.verified ? "Verified" : "Pending"}</span><span className="tag tp">{AICTE_CFG[a.type]?.label || a.type}</span></div>
                  <span className="text-m" style={{ fontSize: 12 }}>{a.date}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>{a.title}</div>
                <div className="text-s" style={{ fontSize: 12, marginTop: 2 }}>Organized by {a.organizer}</div>
                <div className="row mt1" style={{ gap: 12, fontSize: 12 }}>
                  <span className="text-p fw7">+{a.pts} pts</span>
                  <span className="text-g fw7">+{a.credits} credits</span>
                  {a.txHash && <a href={chain.txLink(a.txHash)} target="_blank" rel="noreferrer" style={{ color: "var(--em)" }}>Polygonscan ↗</a>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── CHAT ────────────────────────────────────────────────────────────────────
function ChatPage({ user, users, notify, setModal }) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [msg, setMsg] = useState("");
  const msgsEnd = useRef(null);

  const load = useCallback(() => {
    api.fetchUserChats(user._id).then(setChats).catch(() => {});
  }, [user]);
  useEffect(load, [load]);
  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat]);

  const send = async () => {
    if (!msg.trim() || !activeChat) return;
    try {
      const updated = await api.sendMessage(activeChat._id, user._id, msg.trim());
      setActiveChat(updated);
      setChats((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      setMsg("");
    } catch (e) { notify(e.message, "error"); }
  };

  const newChat = () => {
    setModal(<NewChatModal user={user} users={users} load={load} setActiveChat={setActiveChat} notify={notify} />);
  };

  const getOther = (chat) => {
    const otherId = chat.participants.find((p) => p !== user._id);
    return users.find((u) => u._id === otherId);
  };

  return (
    <div className="inner">
      <div className="btwn mb2"><div className="ph" style={{ margin: 0 }}><h1>Messages</h1><p>Chat with other users</p></div><button className="btn btn-g" onClick={newChat}>+ New chat</button></div>
      <div className="g2" style={{ gridTemplateColumns: "280px 1fr", alignItems: "start" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {chats.length === 0 ? <div className="empty" style={{ padding: "2rem 1rem" }}>No conversations yet</div> : chats.map((c) => {
            const other = getOther(c);
            const last = c.messages[c.messages.length - 1];
            const isActive = activeChat?._id === c._id;
            return (
              <div key={c._id} style={{ padding: "0.875rem 1rem", cursor: "pointer", borderBottom: "1px solid var(--border)", background: isActive ? "var(--em-bg)" : "transparent", transition: "background 0.15s" }}
                onClick={() => setActiveChat(c)}>
                <div className="row"><div className="av" style={{ width: 30, height: 30, fontSize: 10 }}>{other?.avatar || "?"}</div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{other?.name || "User"}</div>
                    {last && <div className="text-m" style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last.text}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {activeChat ? (
          <div className="chat-wrap">
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14 }}>{getOther(activeChat)?.name || "Chat"}</div>
            <div className="chat-msgs">
              {activeChat.messages.map((m, i) => (
                <div key={m._id || i} className={`bbl ${m.senderId === user._id ? "bbl-m" : "bbl-t"}`}>{m.text}</div>
              ))}
              <div ref={msgsEnd} />
            </div>
            <div className="chat-inp">
              <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => e.key === "Enter" && send()} />
              <button className="btn btn-g btn-sm" onClick={send}>Send</button>
            </div>
          </div>
        ) : (
          <div className="card empty">Select a conversation or start a new one</div>
        )}
      </div>
    </div>
  );
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
function Profile({ user, wallet, notify, setModal, refreshUser, connectWallet, doLogout }) {
  const [emergency, setEmergency] = useState([]);

  useEffect(() => {
    api.fetchEmergencyContacts(user._id).then(setEmergency).catch(() => {});
  }, [user]);

  const editProfile = () => {
    setModal(<EditProfileModal user={user} refreshUser={refreshUser} close={() => setModal(null)} notify={notify} />);
  };

  const addContact = () => {
    setModal(<AddContactModal user={user} notify={notify} close={() => setModal(null)} setEmergency={setEmergency} />);
  };

  const graduateAccount = () => {
    setModal(<GraduateTransitionModal user={user} refreshUser={refreshUser} close={() => setModal(null)} notify={notify} />);
  };

  const removeContact = async (id) => {
    try {
      await api.removeEmergencyContact(id);
      setEmergency((prev) => prev.filter((c) => c._id !== id));
      notify("Contact removed");
    } catch (e) { notify(e.message, "error"); }
  };

  return (
    <div className="inner">
      <div className="ph"><h1>Profile</h1><p>Manage your account</p></div>
      <motion.div className="g2" {...fadeUp(0.1)}>
        <div className="card">
          {user.isAlumni ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(139, 92, 246, 0.12)", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: 10, padding: "8px 14px", marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>🎓</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--purple)" }}>
                  Verified Alumni · {user.almaMater || user.college || "University Graduate"}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                  {user.graduationYear ? `Class of ${user.graduationYear} · ` : ""}General Account with Academic Credentials
                </div>
              </div>
            </div>
          ) : null}
          <div className="row mb2">
            <div className="av" style={{ width: 54, height: 54, fontSize: 18 }}>{user.avatar}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{user.name}</div>
              <div className="text-s" style={{ fontSize: 13 }}>{user.email}</div>
              {user.collegeEmail && user.collegeEmail !== user.email && (
                <div className="text-m" style={{ fontSize: 11, color: "var(--text-muted)" }}>College Mail: {user.collegeEmail}</div>
              )}
            </div>
          </div>
          {user.college && <div className="text-s mb1" style={{ fontSize: 13, color: "var(--em)", fontWeight: 600 }}>🏛️ {user.college}</div>}
          {user.education && <div className="text-s mb1" style={{ fontSize: 13, color: "var(--purple)" }}>🎓 {user.education}</div>}
          <div className="text-s" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{user.bio || "No bio yet."}</div>
          {user.interests && user.interests.length > 0 && (
            <div className="row mb2" style={{ flexWrap: "wrap", gap: 6 }}>
              {user.interests.map((int, i) => (
                <span key={i} className="tag tp">{int}</span>
              ))}
            </div>
          )}
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <button className="btn btn-o btn-sm" onClick={editProfile}>Edit profile</button>
            {!user.isAlumni && user.role !== "websiteAdmin" && user.role !== "collegeAdmin" && user.role !== "super_admin" && user.role !== "institute_admin" && (
              <button className="btn btn-g btn-sm" onClick={graduateAccount}>🎓 Graduate Account</button>
            )}
            <button className="btn btn-o btn-sm" onClick={doLogout}>Sign out</button>
          </div>
        </div>
        <div className="card">
          <div className="card-t">Wallet ({wallet?.isInbuilt ? "Inbuilt" : "MetaMask"})</div>
          {wallet ? (
            <>
              <div className="chash">{wallet.address}</div>
              <div className="btwn mt1"><span className="text-s" style={{ fontSize: 13 }}>POL balance</span><span className="text-g fw7">{parseFloat(wallet.balance).toFixed(4)} POL</span></div>
            </>
          ) : (
            <button className="btn btn-g btn-sm" onClick={connectWallet}>
              {chain.isMetaMaskInstalled() ? "Connect MetaMask" : "Connect Inbuilt Wallet"}
            </button>
          )}
        </div>
      </motion.div>

      {/* Graduation Transition Action Banner for Students / Non-Alumni */}
      {!user.isAlumni && user.role !== "websiteAdmin" && user.role !== "collegeAdmin" && user.role !== "super_admin" && user.role !== "institute_admin" && (
        <motion.div className="card mt2" {...fadeUp(0.12)} style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(139,92,246,0.08) 100%)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <div className="btwn" style={{ flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🎓</span> Post-Graduation Account Transition
              </div>
              <div className="text-s" style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
                Graduating? Convert to a General Alumni Account while keeping all your Time Credits, reviews, and AICTE credentials.
              </div>
            </div>
            <button className="btn btn-g btn-sm" onClick={graduateAccount} style={{ whiteSpace: "nowrap", padding: "8px 16px", fontWeight: 700 }}>
              🎓 Transition to Alumni
            </button>
          </div>
        </motion.div>
      )}

      <motion.div className="g3 mt2" {...fadeUp(0.15)}>
        {[
          { l: "Credits", v: user.credits },
          { l: "Earned", v: user.earned },
          { l: "Spent", v: user.spent },
          { l: "AICTE pts", v: user.aictePoints },
          { l: "Reputation", v: user.rep || "—" },
          { l: "Reviews", v: user.reviews },
        ].map((st) => (
          <div key={st.l} className="stat"><div className="stat-l">{st.l}</div><div className="stat-v">{st.v}</div></div>
        ))}
      </motion.div>

      <motion.div className="card mt2" {...fadeUp(0.2)}>
        <div className="btwn mb1"><span className="card-t" style={{ margin: 0 }}>Emergency contacts</span><button className="btn btn-o btn-sm" onClick={addContact}>+ Add</button></div>
        {emergency.length === 0 ? <div className="text-m" style={{ fontSize: 13 }}>No emergency contacts added.</div> : emergency.map((c) => (
          <div key={c._id} className="btwn mb1" style={{ padding: ".75rem", background: "var(--bg)", borderRadius: 8 }}>
            <div className="row"><div className="av" style={{ width: 30, height: 30, fontSize: 10, background: "var(--red)" }}>{c.name[0]}</div>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div><div className="text-m" style={{ fontSize: 12 }}>{c.phone} · {c.relation}</div></div>
            </div>
            <button className="btn btn-o btn-sm" onClick={() => removeContact(c._id)}>Remove</button>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────
function Admin({ prefix, user, wallet, users, notify, refreshUser, connectWallet, setModal }) {
  const [stats, setStats] = useState(null);
  const [pendingAicte, setPendingAicte] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [fraudQueue, setFraudQueue] = useState([]);
  const [tab, setTab] = useState("overview");
  const [institutionAdmins, setInstitutionAdmins] = useState([]);
  const [aicteInputs, setAicteInputs] = useState({});

  useEffect(() => {
    if (!prefix) return;
    api.fetchAdminStats(prefix).then(setStats).catch(() => {});
    api.fetchAllAicte().then((all) => setPendingAicte(all.filter((a) => !a.verified))).catch(() => {});
    api.fetchAllBookings().then(setAllBookings).catch(() => {});
    api.fetchFraudQueue(prefix).then(setFraudQueue).catch(() => {});
    
    if (prefix === "website-admin") {
      api.fetchInstitutionAdmins().then(setInstitutionAdmins).catch(() => {});
    }
  }, [prefix]);

  const approveAicte = async (a) => {
    const defaultPts = AICTE_CFG[a.type]?.pts || 0;
    const defaultCr = AICTE_CFG[a.type]?.credits || 0;
    const currentPts = aicteInputs[a._id]?.pts !== undefined ? aicteInputs[a._id].pts : defaultPts;
    const currentCr = aicteInputs[a._id]?.credits !== undefined ? aicteInputs[a._id].credits : defaultCr;
    
    const pts = parseInt(currentPts, 10);
    const credits = parseInt(currentCr, 10);
    if (isNaN(pts) || isNaN(credits)) return notify("Invalid points/credits", "error");

    let txHash = null, blockNumber = null;
    if (wallet) {
      const student = a.userId;
      if (student?.wallet) {
        try {
          notify("Signing verification transaction...", "info");
          const result = await chain.sendCredits(wallet.signer, student.wallet, credits, wallet.isInbuilt);
          txHash = result.txHash;
          blockNumber = result.blockNumber;
        } catch (e) { notify("Blockchain tx skipped", "warning"); }
      }
    }
    try {
      await api.verifyAicte(a._id, txHash, blockNumber, pts, credits);
      notify(`Approved: ${a.title}`);
      setPendingAicte((prev) => prev.filter((x) => x._id !== a._id));
      api.fetchAdminStats(prefix).then(setStats).catch(() => {});
    } catch (e) { notify(e.message, "error"); }
  };

  const rejectAicte = async (a) => {
    try {
      await api.rejectAicte(a._id);
      notify("Activity rejected");
      setPendingAicte((prev) => prev.filter((x) => x._id !== a._id));
    } catch (e) { notify(e.message, "error"); }
  };

  const handleAiVerify = async (a) => {
    try {
      notify("AI is verifying certificate... this may take a moment.");
      const updatedActivity = await api.aiVerifyAicte(a._id);
      setPendingAicte((prev) => prev.map((x) => x._id === a._id ? updatedActivity : x));
      notify("AI Verification completed!");
    } catch (e) { notify(e.message, "error"); }
  };

  const handleRestrict = async (userId, isRestricted) => {
    try {
      await api.adminUpdateRestriction(prefix, userId, { action: isRestricted ? "unrestrict" : "restrict", days: isRestricted ? 0 : 365, reason: "Admin action" });
      notify(`User ${isRestricted ? "unrestricted" : "restricted"}`);
      if (refreshUser) refreshUser();
    } catch (e) { notify(e.message, "error"); }
  };

  const handleResolveFraud = async (id, action) => {
    try {
      await api.resolveFraudItem(prefix, id, action);
      notify(action === "approve" ? "Account verified & flag cleared!" : "Account blocked & flag resolved");
      setFraudQueue((prev) => prev.filter((x) => x._id !== id));
      if (refreshUser) refreshUser();
    } catch (e) { notify(e.message, "error"); }
  };

  const allUsers = users.filter((u) => u.role !== "websiteAdmin" && u.role !== "collegeAdmin");

  return (
    <div className="inner">
      <div className="ph btwn">
        <div><h1>Admin Panel</h1><p>Platform administration</p></div>
        <button className="btn btn-g" onClick={() => setModal(<EditProfileModal user={user} refreshUser={refreshUser} close={() => setModal(null)} notify={notify} isAdminProfile={true} />)}>Edit Profile</button>
      </div>

      {!wallet && (
        <motion.div className="card mb2" style={{ borderColor: "var(--em-border)" }} {...fadeUp()}>
          <div className="btwn">
            <div><div style={{ fontWeight: 700 }}>Connect wallet for on-chain verifications</div><div className="text-s" style={{ fontSize: 13 }}>Sign blockchain transactions when approving AICTE activities</div></div>
            <button className="btn btn-g btn-sm" onClick={connectWallet}>
              {chain.isMetaMaskInstalled() ? "Connect MetaMask" : "Connect Inbuilt Wallet"}
            </button>
          </div>
        </motion.div>
      )}

      <div className="tab-bar">
        {["overview", ...(prefix === "college-admin" ? ["verify"] : []), "users", "bookings", "fraud", ...(prefix === "website-admin" ? ["admins", "ml_dashboard"] : [])].map((t) => (
          <button key={t} className={`tb-btn${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
            {t === "fraud" ? "🛡️ Fraud Queue" : t.charAt(0).toUpperCase() + t.slice(1)} {t === "fraud" && fraudQueue.length > 0 ? `(${fraudQueue.length})` : t === "verify" && pendingAicte.length > 0 ? `(${pendingAicte.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <motion.div className="g3" variants={stagger} initial="initial" animate="animate">
          {[
            { l: "Users", v: stats.users },
            { l: "Services", v: stats.services },
            { l: "Bookings", v: stats.bookings },
            { l: "Transactions", v: stats.transactions },
            { l: "Pending Fraud Items", v: fraudQueue.length, c: fraudQueue.length > 0 ? "text-a" : "" },
            ...(prefix === "college-admin" ? [{ l: "Pending AICTE", v: stats.pendingAicte, c: stats.pendingAicte > 0 ? "text-a" : "" }] : []),
            ...(prefix === "website-admin" ? [{ l: "Inst. Admins", v: institutionAdmins.length }] : [])
          ].map((st, i) => (
            <motion.div key={st.l} className="stat" variants={fadeUp(i * 0.05)}>
              <div className="stat-l">{st.l}</div>
              <div className={`stat-v ${st.c || ""}`}>{st.v}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {tab === "fraud" && (
        <motion.div variants={stagger} initial="initial" animate="animate">
          <h3 style={{ marginBottom: "1rem", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <FaceVerifyIcon size={20} color="var(--em)" />
            Fraud & Multi-Layer Security Queue ({fraudQueue.length})
          </h3>
          {fraudQueue.length === 0 ? (
            <div className="empty">No flagged security items pending review. All accounts clean ✓</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {fraudQueue.map((item) => (
                <motion.div key={item._id} className="card" variants={fadeUp()} style={{ background: "rgba(12, 15, 23, 0.8)", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
                  <div className="btwn mb1">
                    <div className="row" style={{ gap: 8 }}>
                      <span className="tag tr" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", fontWeight: 700 }}>
                        Risk Score: {item.riskScore}
                      </span>
                      <span className="tag tp" style={{ textTransform: "uppercase" }}>{item.type}</span>
                    </div>
                    <span className="text-m" style={{ fontSize: 12 }}>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>

                  {item.userId && (
                    <div className="row mb1" style={{ gap: 12 }}>
                      <div className="av">{item.userId.name ? item.userId.name.slice(0, 2).toUpperCase() : "U"}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#fff" }}>{item.userId.name}</div>
                        <div className="text-m" style={{ fontSize: 12 }}>{item.userId.email} · {item.userId.college || "No College"}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Triggered Risk Factors:</div>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      {item.reasons.map((r) => (
                        <span key={r} className="tag" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: 11 }}>
                          ⚠️ {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
                    <button className="btn btn-g btn-sm" onClick={() => handleResolveFraud(item._id, "approve")}>
                      ✓ Clear Flag & Approve
                    </button>
                    <button className="btn btn-d btn-sm" onClick={() => handleResolveFraud(item._id, "block")}>
                      🚫 Suspend & Block Account
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {tab === "verify" && (
        pendingAicte.length === 0 ? <div className="empty">No pending activities to verify.</div> : (
          <motion.div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} variants={stagger} initial="initial" animate="animate">
            {pendingAicte.map((a) => {
              const student = a.userId;
              const defaultPts = AICTE_CFG[a.type]?.pts || 0;
              const defaultCr = AICTE_CFG[a.type]?.credits || 0;
              const currentPts = aicteInputs[a._id]?.pts !== undefined ? aicteInputs[a._id].pts : defaultPts;
              const currentCr = aicteInputs[a._id]?.credits !== undefined ? aicteInputs[a._id].credits : defaultCr;
              return (
                <motion.div key={a._id} className="ac-card" variants={fadeUp()}>
                  <div className="btwn">
                    <div className="row"><span className="tag ta">Pending</span><span className="tag tp">{AICTE_CFG[a.type]?.label || a.type}</span></div>
                    <span className="text-m" style={{ fontSize: 12 }}>{a.date}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>{a.title}</div>
                  <div className="text-s" style={{ fontSize: 12, marginTop: 2 }}>
                    By: {student?.name || "Unknown"} ({student?.college || "No College"}) · Organizer: {a.organizer}
                  </div>
                  <div className="row mt1" style={{ gap: 12, fontSize: 12, alignItems: "center" }}>
                    <div className="row" style={{ gap: 4 }}>
                      <span className="text-p fw7">Pts:</span>
                      <input type="number" style={{ width: 45, background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid var(--em-border)", borderRadius: 4, padding: "2px 4px", fontSize: 12 }} value={currentPts} onChange={e => setAicteInputs(prev => ({...prev, [a._id]: {...prev[a._id], pts: e.target.value}}))} />
                    </div>
                    <div className="row" style={{ gap: 4 }}>
                      <span className="text-g fw7">Cr:</span>
                      <input type="number" style={{ width: 45, background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid var(--em-border)", borderRadius: 4, padding: "2px 4px", fontSize: 12 }} value={currentCr} onChange={e => setAicteInputs(prev => ({...prev, [a._id]: {...prev[a._id], credits: e.target.value}}))} />
                    </div>
                    {a.certUrl && (
                      a.certUrl.startsWith("data:") 
                        ? <a href={a.certUrl} download={`cert-${a._id}.png`} style={{ color: "var(--em)", textDecoration: "underline" }}>Download certificate ⬇</a>
                        : <a href={a.certUrl} target="_blank" rel="noreferrer" style={{ color: "var(--em)", textDecoration: "underline" }}>View certificate ↗</a>
                    )}
                  </div>
                  {a.aiScore !== null && a.aiScore !== undefined && (
                    <div className="mt1 p1" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 6, fontSize: 12 }}>
                      <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: "var(--purple)" }}>🤖 AI Genuineness Score:</span>
                        <span style={{ fontWeight: 700, color: a.aiScore >= 80 ? "var(--green)" : a.aiScore >= 50 ? "var(--yellow)" : "var(--red)" }}>
                          {a.aiScore}%
                        </span>
                      </div>
                      <div style={{ color: "var(--text-secondary)", lineHeight: 1.4 }}>{a.aiFeedback}</div>
                    </div>
                  )}
                  <div className="row mt1" style={{ gap: 6 }}>
                    <button className="btn btn-g btn-sm" onClick={() => approveAicte(a)}>Approve</button>
                    <button className="btn btn-d btn-sm" onClick={() => rejectAicte(a)}>Reject</button>
                    <button className="btn btn-o btn-sm" onClick={() => handleAiVerify(a)} style={{ borderColor: "var(--purple)", color: "var(--purple)" }}>🤖 AI Verify</button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )
      )}

      {tab === "users" && (
        allUsers.length === 0 ? <div className="empty">No registered users yet.</div> : (
          <motion.div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} variants={stagger} initial="initial" animate="animate">
            {allUsers.map((u) => (
              <motion.div key={u._id} className="bk-row" variants={fadeUp()}>
                <div className="av" style={{ width: 34, height: 34, fontSize: 11 }}>{u.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div className="btwn">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                    <span className="tag tg">{u.credits} cr</span>
                  </div>
                  <div className="text-s" style={{ fontSize: 12 }}>{u.email}</div>
                  <div className="row mt1" style={{ gap: 12, fontSize: 12 }}>
                    <span>Earned: {u.earned}h</span>
                    <span>Spent: {u.spent}h</span>
                    <span>AICTE: {u.aictePoints} pts</span>
                    <span>Rep: {u.rep || "—"}</span>
                  </div>
                  {u.wallet && <div className="chash mt1" style={{ fontSize: 10 }}>{u.wallet}</div>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )
      )}

      {tab === "bookings" && (
        allBookings.length === 0 ? <div className="empty">No bookings yet.</div> : (
          <motion.div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} variants={stagger} initial="initial" animate="animate">
            {allBookings.map((b) => {
              const provider = users.find((u) => u._id === b.providerId);
              const requester = users.find((u) => u._id === b.requesterId);
              const statusColors = { pending: "ta", confirmed: "tb", completed: "tg", cancelled: "tr" };
              return (
                <motion.div key={b._id} className="bk-row" variants={fadeUp()}>
                  <div style={{ flex: 1 }}>
                    <div className="btwn">
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{requester?.name || "?"} → {provider?.name || "?"}</div>
                      <span className={`tag ${statusColors[b.status]}`}>{b.status}</span>
                    </div>
                    <div className="text-s" style={{ fontSize: 12, marginTop: 2 }}>
                      {b.hours}h · {new Date(b.scheduledStart).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                    {b.txHash && <a href={chain.txLink(b.txHash)} target="_blank" rel="noreferrer" className="chash" style={{ color: "var(--em)", display: "inline-block", marginTop: 4 }}>tx: {chain.formatAddress(b.txHash)} ↗</a>}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )
      )}

      {tab === "admins" && prefix === "website-admin" && (
        <motion.div variants={stagger} initial="initial" animate="animate">
          <div className="btwn mb2">
            <h2 style={{ fontSize: 16 }}>Institution Admins</h2>
            <button className="btn btn-p btn-sm" onClick={() => setModal(<CreateAdminModal close={() => setModal(null)} notify={notify} refresh={() => api.fetchInstitutionAdmins().then(setInstitutionAdmins)} />)}>+ Create Admin</button>
          </div>
          {institutionAdmins.length === 0 ? <div className="empty">No institution admins found.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {institutionAdmins.map((adm) => (
                <div key={adm._id} className="card">
                  <div style={{ fontWeight: "bold" }}>{adm.name}</div>
                  <div className="text-m" style={{ fontSize: 13 }}>{adm.email} &bull; {adm.college}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── IMAGE SLIDER ────────────────────────────────────────────────────────────
export function ImageSlider({ images }) {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const next = (e) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="img-slider" onClick={(e) => e.stopPropagation()}>
      <div className="img-slider-inner" style={{ transform: `translateX(-${index * 100}%)` }}>
        {images.map((img, i) => (
          <img key={i} src={img} alt={`Slide ${i}`} className="img-slide" onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600";
          }} />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button className="slider-btn prev" onClick={prev}>‹</button>
          <button className="slider-btn next" onClick={next}>›</button>
          <div className="slider-dots">
            {images.map((_, i) => (
              <span key={i} className={`slider-dot${i === index ? " active" : ""}`} onClick={(e) => { e.stopPropagation(); setIndex(i); }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PROVIDER PROFILE MODAL ────────────────────────────────────────────────────
export function ProviderProfileModal({ userId, notify, close, isAdminView }) {
  const [profile, setProfile] = useState(null);
  
  useEffect(() => {
    api.fetchUserProfile(userId).then(setProfile).catch(() => notify("Failed to load profile", "error"));
  }, [userId]);

  if (!profile) return <div className="p2" style={{ textAlign: "center" }}>Loading profile...</div>;

  const { user, activeServices, pastReviews } = profile;
  
  return (
    <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
      <div className="row mb2" style={{ alignItems: "flex-start", gap: 16 }}>
        <div className="av" style={{ width: 64, height: 64, fontSize: 24 }}>{user.avatar}</div>
        <div style={{ flex: 1 }}>
          <div className="btwn" style={{ alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{user.name}</div>
            <div className="tag tg">Rep: {user.rep || "New"} ⭐</div>
          </div>
          <div className="text-s" style={{ fontSize: 13, marginTop: 4 }}>{user.college || "Independent Professional"}</div>
          {user.education && <div className="text-s mt1" style={{ fontSize: 13, color: "var(--purple)" }}>🎓 {user.education}</div>}
        </div>
      </div>
      
      <div className="text-m mb2" style={{ lineHeight: 1.6 }}>{user.bio || "This user hasn't added a bio yet."}</div>
      
      {user.interests && user.interests.length > 0 && (
        <div className="mb2">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--text-secondary)" }}>INTERESTS</div>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {user.interests.map((int, i) => <span key={i} className="tag tp">{int}</span>)}
          </div>
        </div>
      )}

      {activeServices.length > 0 && (
        <div className="mb2 pt2" style={{ borderTop: "1px solid var(--border)" }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: "var(--text-secondary)" }}>ACTIVE SERVICES</div>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {activeServices.map(s => (
              <div key={s._id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 6, padding: "0.75rem" }}>
                <div className="btwn"><div style={{ fontWeight: 600 }}>{s.title}</div><div style={{ color: "var(--purple)", fontWeight: 700 }}>{s.price} cr</div></div>
                <div className="text-s mt1">{s.category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb2 pt2" style={{ borderTop: "1px solid var(--border)" }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: "var(--text-secondary)" }}>RECENT REVIEWS ({user.reviews || 0})</div>
        {pastReviews.length === 0 ? <div className="text-s">No reviews yet.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pastReviews.map(r => (
              <div key={r._id} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "0.75rem" }}>
                <div className="row mb1" style={{ gap: 8 }}>
                  <div className="av" style={{ width: 24, height: 24, fontSize: 10 }}>{r.reviewerId?.avatar || "U"}</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.reviewerId?.name}</div>
                  <div style={{ color: "var(--yellow)", fontSize: 12 }}>{"⭐".repeat(r.rating)}</div>
                </div>
                <div className="text-m" style={{ fontSize: 13 }}>{r.comment || "No comment provided."}</div>
                <div className="text-s mt1" style={{ fontSize: 11, opacity: 0.7 }}>For: {r.serviceId?.title || "Custom Service"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-o mt2" style={{ width: "100%", justifyContent: "center" }} onClick={close}>Close</button>
      {isAdminView && (!user.bio || !user.college || !user.wallet) && (
        <button className="btn btn-p mt1" style={{ width: "100%", justifyContent: "center", background: "var(--purple)", color: "white" }} onClick={() => notify(`Requested missing details from ${user.name}`)}>
          Request Missing Details
        </button>
      )}
    </div>
  );
}

// ─── REVIEW MODAL ────────────────────────────────────────────────────────────
export function ReviewModal({ booking, refreshUser, notify, close }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submit = async () => {
    try {
      await api.submitReview({ bookingId: booking._id, rating, comment });
      notify("Review submitted successfully!");
      if (refreshUser) refreshUser();
      close();
    } catch (e) { notify(e.message, "error"); }
  };

  return (
    <div>
      <div className="mo-t">Leave a Review</div>
      <p className="text-s mb2">Rate your experience with this service provider.</p>
      
      <div className="field">
        <label>Rating</label>
        <div className="row" style={{ gap: 8 }}>
          {[1, 2, 3, 4, 5].map(r => (
            <button key={r} className="btn" style={{ background: r <= rating ? "var(--yellow)" : "var(--bg)", color: r <= rating ? "#000" : "var(--text)" }} onClick={() => setRating(r)}>
              {r} ⭐
            </button>
          ))}
        </div>
      </div>
      
      <div className="field">
        <label>Comment (optional)</label>
        <textarea className="fi" rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="How was the service?" style={{ resize: "vertical" }} />
      </div>

      <div className="row mt2" style={{ gap: 8 }}>
        <button className="btn btn-p" onClick={submit} style={{ flex: 1 }}>Submit Review</button>
        <button className="btn btn-o" onClick={close}>Cancel</button>
      </div>
    </div>
  );
}

// ─── SOS MODAL ───────────────────────────────────────────────────────────────
export function SosModal({ emergency, close, notify }) {
  return (
    <div>
      <div className="mo-t" style={{ color: "#dc2626" }}>🚨 SOS Alert</div>
      <p className="text-s" style={{ fontSize: 13, marginBottom: 12 }}>These contacts will be alerted:</p>
      {emergency.map((c) => (
        <div key={c._id} className="row mb1" style={{ background: "var(--bg)", borderRadius: 8, padding: ".75rem" }}>
          <div className="av" style={{ background: "#dc2626", width: 32, height: 32, fontSize: 11 }}>{c.name[0]}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
            <div className="text-m" style={{ fontSize: 12 }}>{c.phone} · {c.relation}</div>
          </div>
        </div>
      ))}
      <button className="btn btn-d mt2" style={{ width: "100%", justifyContent: "center" }} onClick={() => { close(); notify("SOS alert sent!", "warning"); }}>Confirm — alert now</button>
    </div>
  );
}

// ─── NEW CHAT MODAL ──────────────────────────────────────────────────────────
export function NewChatModal({ user, users, close, load, setActiveChat, notify }) {
  const others = users.filter((u) => u._id !== user._id && u.role !== "admin");
  return (
    <div>
      <div className="mo-t">Start a conversation</div>
      {others.length === 0 ? <div className="empty">No other users yet.</div> : others.map((u) => (
        <div key={u._id} className="row mb1" style={{ cursor: "pointer", padding: ".75rem", borderRadius: 8, border: "1px solid var(--border)" }}
          onClick={async () => {
            try {
              const chat = await api.createChat([user._id, u._id]);
              close();
              load();
              setActiveChat(chat);
            } catch (e) { notify(e.message, "error"); }
          }}>
          <div className="av" style={{ width: 32, height: 32, fontSize: 11 }}>{u.avatar}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
            <div className="text-m" style={{ fontSize: 12 }}>{u.bio}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ADD CONTACT MODAL ───────────────────────────────────────────────────────
export function AddContactModal({ user, close, notify, setEmergency }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");

  const handleAdd = async () => {
    if (!name || !phone || !relation) { notify("Fill all fields", "error"); return; }
    try {
      await api.addEmergencyContact({ userId: user._id, name, phone, relation });
      const contacts = await api.fetchEmergencyContacts(user._id);
      setEmergency(contacts);
      close();
      notify("Contact added!");
    } catch (e) { notify(e.message, "error"); }
  };

  return (
    <div>
      <div className="mo-t">Add emergency contact</div>
      <div className="field">
        <label>Name</label>
        <input className="fi" placeholder="Contact name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Phone</label>
        <input className="fi" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="field">
        <label>Relation</label>
        <input className="fi" placeholder="Parent, Friend, etc." value={relation} onChange={(e) => setRelation(e.target.value)} />
      </div>
      <button className="btn btn-p" onClick={handleAdd}>Add contact</button>
    </div>
  );
}

// ─── GRADUATION / ALUMNI TRANSITION MODAL ────────────────────────────────────
export function GraduateTransitionModal({ user, refreshUser, close, notify }) {
  const [gradYear, setGradYear] = useState(new Date().getFullYear());
  const [personalEmail, setPersonalEmail] = useState("");
  const [bio, setBio] = useState(user.bio || "");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!personalEmail || !personalEmail.includes("@")) {
      notify("Please enter a valid personal email", "error");
      return;
    }
    setLoading(true);
    try {
      await api.sendOtp(personalEmail, "verify_email");
      setOtpSent(true);
      setCountdown(60);
      notify(`Verification code dispatched to ${personalEmail}`);
    } catch (e) {
      notify(e.message || "Failed to dispatch verification code", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      notify("Enter 6-digit verification code", "error");
      return;
    }
    setLoading(true);
    try {
      await api.verifyOtp(personalEmail, otp);
      setEmailVerified(true);
      notify("Personal email verified successfully! ✓");
    } catch (e) {
      notify(e.message || "Verification code failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGraduate = async () => {
    if (personalEmail && personalEmail !== user.email && !emailVerified) {
      notify("Please verify your personal email OTP first", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.graduateStudent({
        graduationYear: gradYear,
        personalEmail: personalEmail || undefined,
        otp: otp || undefined,
        bio,
      });
      if (res.token) {
        localStorage.setItem("tb_token", res.token);
      }
      notify("🎉 Congratulations on graduating! Your account is now a Verified Alumni Account!");
      if (refreshUser) await refreshUser();
      close();
    } catch (e) {
      notify(e.message || "Failed to complete graduation transition", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", color: "var(--em)", border: "1px solid rgba(16, 185, 129, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", fontSize: 24 }}>
          🎓
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#fff" }}>Graduate & Transition Account</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
          Upgrade from Student to a Verified Alumni General Account
        </p>
      </div>

      <div style={{ background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.25)", borderRadius: 12, padding: "12px 14px", marginBottom: "1.25rem" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          ✨ Retained Account Privileges:
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#e2e8f0", lineHeight: 1.6 }}>
          <li><b>Keep 100% of your Wallet Credits</b> ({user.credits} Time Credits).</li>
          <li><b>Preserve AICTE Points & Verified Badges</b> as permanent academic credentials.</li>
          <li><b>Unlock Global Open Marketplace</b> beyond university limits.</li>
          <li>Official <b>🎓 Verified Alumni ({user.college || "University"})</b> badge.</li>
        </ul>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div className="field" style={{ margin: 0 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Graduation Year</label>
          <select className="fi" value={gradYear} onChange={(e) => setGradYear(e.target.value)} style={{ height: 42 }}>
            {[2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <option key={y} value={y}>{y} {y <= new Date().getFullYear() ? "(Graduated)" : "(Upcoming)"}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Alma Mater</label>
          <input className="fi" value={user.college || "Your College"} disabled style={{ height: 42, background: "rgba(255,255,255,0.04)", opacity: 0.8 }} />
        </div>
      </div>

      {/* Personal email migration */}
      <div className="field" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <label style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
            Personal Email Migration (Optional)
          </label>
          {emailVerified && <span style={{ fontSize: 11, color: "var(--em)", fontWeight: 700 }}>✓ Verified</span>}
        </div>
        <input
          className="fi"
          type="email"
          value={personalEmail}
          onChange={(e) => { setPersonalEmail(e.target.value); setEmailVerified(false); }}
          placeholder="your.personal@gmail.com (if college mail deactivates)"
          style={{ height: 42 }}
        />

        {personalEmail && personalEmail !== user.email && !emailVerified && !otpSent && (
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className="btn btn-p"
              style={{ width: "100%", height: 36, fontSize: 12, fontWeight: 700 }}
            >
              {loading ? "Sending..." : "⚡ Send OTP to Personal Email"}
            </button>
          </div>
        )}

        {personalEmail && !emailVerified && otpSent && (
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <input
              className="fi"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              style={{ width: 130, height: 38, textAlign: "center", letterSpacing: 4, fontWeight: 700 }}
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              className="btn btn-p"
              style={{ height: 38, padding: "0 14px", fontSize: 12, fontWeight: 700 }}
            >
              Verify OTP ✓
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={countdown > 0}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 11, cursor: countdown > 0 ? "default" : "pointer" }}
            >
              {countdown > 0 ? `${countdown}s` : "Resend"}
            </button>
          </div>
        )}
      </div>

      <div className="field" style={{ marginBottom: "1.25rem" }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Updated Headline / Bio</label>
        <input
          className="fi"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="e.g. Software Engineer | NITK Alumni | React & AI Specialist"
          style={{ height: 42 }}
        />
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button
          className="btn btn-p"
          onClick={handleGraduate}
          disabled={loading || (personalEmail && personalEmail !== user.email && !emailVerified)}
          style={{ flex: 1, height: 44, justifyContent: "center", fontWeight: 700, fontSize: 14 }}
        >
          {loading ? "Processing Transition..." : "🎓 Complete Graduation Transition"}
        </button>
        <button className="btn btn-o" onClick={close} style={{ height: 44 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── EDIT PROFILE MODAL ──────────────────────────────────────────────────────
export function EditProfileModal({ user, refreshUser, close, notify }) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [education, setEducation] = useState(user.education || "");
  const [interestsStr, setInterestsStr] = useState(user.interests ? user.interests.join(", ") : "");

  const handleSave = async () => {
    if (!name.trim()) { notify("Name is required", "error"); return; }
    try {
      const av = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
      const interests = interestsStr.split(",").map(i => i.trim()).filter(i => i);
      await api.updateUser(user._id, { name, bio, education, interests, avatar: av });
      await refreshUser();
      close();
      notify("Profile updated!");
    } catch (e) { notify(e.message, "error"); }
  };

  return (
    <div>
      <div className="mo-t">Edit profile</div>
      <div className="field">
        <label>Name</label>
        <input className="fi" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Education / College</label>
        <input className="fi" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. B.Tech Computer Science, MIT" />
      </div>
      <div className="field">
        <label>Interests (comma separated)</label>
        <input className="fi" value={interestsStr} onChange={(e) => setInterestsStr(e.target.value)} placeholder="e.g. Machine Learning, Design, Music" />
      </div>
      <div className="field">
        <label>Bio</label>
        <textarea className="fi" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} style={{ resize: "vertical" }} placeholder="Describe your background and what you offer/need..." />
      </div>
      <button className="btn btn-p" onClick={handleSave}>Save changes</button>
    </div>
  );
}

// ─── SUBMIT AICTE MODAL ──────────────────────────────────────────────────────
export function SubmitAicteModal({ user, close, notify, load }) {
  const [type, setType] = useState("workshop");
  const [customType, setCustomType] = useState("");
  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [date, setDate] = useState("");
  const [cert, setCert] = useState("");
  const [college, setCollege] = useState(user.college || "");

  const handleSubmit = async () => {
    if (!title || !org || !date || !college || (type === "others" && !customType)) { notify("Fill all required fields", "error"); return; }
    try {
      const finalType = type === "others" ? customType : type;
      await api.createAicte({ userId: user._id, type: finalType, title, organizer: org, date, certUrl: cert, college });
      notify("Activity submitted for admin verification!");
      close();
      load();
    } catch (e) { notify(e.message, "error"); }
  };

  return (
    <div>
      <div className="mo-t">Submit AICTE activity</div>
      <div className="field">
        <label>Activity type</label>
        <select className="fi" value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(AICTE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label} (+{v.pts} pts, +{v.credits} cr)</option>)}
          <option value="others">Others</option>
        </select>
      </div>
      {type === "others" && (
        <div className="field">
          <label>Specify Activity/Skill</label>
          <input className="fi" placeholder="e.g. Custom Hackathon or Workshop" value={customType} onChange={(e) => setCustomType(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>Institution / College for Verification</label>
        <CollegeAutocomplete value={college} onChange={(val) => setCollege(val)} placeholder="e.g. Global Academy" />
      </div>
      <div className="field">
        <label>Title</label>
        <input className="fi" placeholder="e.g. Smart India Hackathon 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>Organizer</label>
        <input className="fi" placeholder="e.g. AICTE / VTU" value={org} onChange={(e) => setOrg(e.target.value)} />
      </div>
      <div className="field">
        <label>Date</label>
        <input className="fi" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Certificate URL or Upload File</label>
        <input className="fi" placeholder="Google Drive share link or https://..." value={cert.startsWith("data:") ? "[Local Certificate File Uploaded]" : cert} disabled={cert.startsWith("data:")} onChange={(e) => setCert(e.target.value)} />
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
          <label className="btn btn-o btn-sm" style={{ cursor: "pointer", display: "inline-block", margin: 0 }}>
            Upload from File Manager
            <input type="file" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = () => {
                setCert(reader.result);
                notify("Certificate file loaded! 📄");
              };
              reader.readAsDataURL(file);
            }} />
          </label>
          {cert && (
            <button type="button" className="btn-remove-url" style={{ padding: "4px 8px" }} onClick={() => setCert("")}>Remove File</button>
          )}
          {cert.startsWith("data:") && <span style={{ fontSize: 12, color: "var(--em)" }}>✓ File loaded</span>}
        </div>
        <p className="hint" style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>* Drive: Paste share link above. File Manager: Click Upload from File Manager.</p>
      </div>
      <button className="btn btn-p" onClick={handleSubmit}>Submit for verification</button>
    </div>
  );
}

// ─── OFFER SKILL MODAL ───────────────────────────────────────────────────────
export function OfferSkillModal({ user, skills, close, notify, load, loadSkills }) {
  const [title, setTitle] = useState("");
  const [skillId, setSkillId] = useState(skills[0]?._id || "custom");
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("Technology");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState(1);
  const [images, setImages] = useState([""]);

  const handleAddImage = () => {
    setImages([...images, ""]);
  };

  const handleImageChange = (index, val) => {
    const updated = [...images];
    updated[index] = val;
    setImages(updated);
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!title.trim() || !description.trim() || !hours) {
      notify("Fill all fields", "error");
      return;
    }
    if (skillId === "custom" && !customName.trim()) {
      notify("Please enter custom skill name", "error");
      return;
    }

    const filteredImages = images.filter((img) => img.trim() !== "");

    try {
      await api.createService({
        providerId: user._id,
        skillId,
        customSkillName: skillId === "custom" ? customName : undefined,
        customSkillCategory: skillId === "custom" ? customCategory : undefined,
        title,
        description,
        hours,
        images: filteredImages
      });
      notify("Service posted!");
      close();
      load();
      if (skillId === "custom" && loadSkills) {
        loadSkills();
      }
    } catch (e) {
      notify(e.message, "error");
    }
  };

  return (
    <div>
      <div className="mo-t">Offer a skill</div>
      
      <div className="field">
        <label>Title</label>
        <input className="fi" placeholder="e.g. React debugging session" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="field">
        <label>Skill</label>
        <select className="fi" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
          {skills.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.category})</option>)}
          <option value="custom">Others</option>
        </select>
      </div>

      {skillId === "custom" && (
        <div className="custom-skill-wrap">
          <div className="field">
            <label>Specify Activity/Skill</label>
            <input className="fi" placeholder="e.g. React Native UI Development" value={customName} onChange={(e) => setCustomName(e.target.value)} />
          </div>
          <div className="field">
            <label>Category</label>
            <select className="fi" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}>
              <option value="Technology">Technology</option>
              <option value="Design">Design</option>
              <option value="Education">Education</option>
              <option value="Arts">Arts</option>
              <option value="Health">Health</option>
              <option value="Business">Business</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      )}

      <div className="field">
        <label>Description</label>
        <textarea className="fi" rows={3} placeholder="What will you help with?" value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} />
      </div>

      <div className="field">
        <label>Duration (hours)</label>
        <input className="fi" type="number" value={hours} min={0.5} step={0.5} style={{ width: 120 }} onChange={(e) => setHours(parseFloat(e.target.value))} />
      </div>

      <div className="field">
        <label>Service Images</label>
        {images.map((img, i) => (
          <div key={i} className="image-input-row" style={{ flexDirection: "column", alignItems: "stretch", background: "rgba(255,255,255,0.02)", padding: 8, borderRadius: 8, gap: 6, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="fi" placeholder="Image URL (https://...) or upload below" value={img.startsWith("data:") ? "[Local Image File Loaded]" : img} disabled={img.startsWith("data:")} onChange={(e) => handleImageChange(i, e.target.value)} style={{ margin: 0 }} />
              {images.length > 1 && (
                <button type="button" className="btn-remove-url" style={{ padding: "8px 12px" }} onClick={() => handleRemoveImage(i)}>✕</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label className="btn btn-o btn-sm" style={{ cursor: "pointer", display: "inline-block", margin: 0, fontSize: 11, padding: "4px 8px" }}>
                Upload Image File
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    handleImageChange(i, reader.result);
                    notify("Image file loaded! 🖼️");
                  };
                  reader.readAsDataURL(file);
                }} />
              </label>
              {img && (
                <button type="button" className="btn-remove-url" style={{ padding: "4px 8px", background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.15)", color: "#ef4444" }} onClick={() => handleImageChange(i, "")}>Clear Image</button>
              )}
              {img.startsWith("data:") && <span style={{ fontSize: 11, color: "var(--em)" }}>✓ Image loaded</span>}
            </div>
          </div>
        ))}
        <button type="button" className="btn-add-url" onClick={handleAddImage}>+ Add another image</button>
        <p className="hint" style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>* Drive: Paste share link. File Manager: Click Upload Image File.</p>
      </div>

      <button className="btn btn-p" onClick={handlePost}>Post listing</button>
    </div>
  );
}

// ─── SERVICE DETAIL MODAL ────────────────────────────────────────────────────
export function ServiceDetailModal({ user, svc, prov, sk, own, close, notify, nav, refreshUser, load, setModal }) {
  const [dt, setDt] = useState("");
  const [notes, setNotes] = useState("");

  const handleBooking = async () => {
    if (!dt) { notify("Select a date and time", "error"); return; }
    if (user.credits < svc.hours) { notify("Not enough credits", "error"); return; }
    try {
      await api.createBooking({
        serviceId: svc._id,
        providerId: svc.providerId,
        requesterId: user._id,
        scheduledStart: dt,
        hours: svc.hours,
        notes
      });
      notify(`Booking sent to ${prov?.name}!`);
      close();
      nav("bookings");
    } catch (e) { notify(e.message, "error"); }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this service?")) return;
    try {
      await api.deleteService(svc._id);
      notify("Service cancelled successfully");
      if (load) load();
      close();
    } catch (e) { notify(e.message, "error"); }
  };

  const canCancel = own || user.role === "websiteAdmin" || (user.role === "collegeAdmin" && prov?.college === user.college);

  return (
    <div>
      {svc.images && svc.images.length > 0 && (
        <ImageSlider images={svc.images} />
      )}
      <div className="mo-t" style={{ marginTop: svc.images && svc.images.length > 0 ? 0 : "" }}>{svc.title}</div>
      {prov && (
        <div className="row mb1">
          <div className="av" style={{ cursor: "pointer" }} onClick={() => setModal && setModal(<ProviderProfileModal userId={prov._id} notify={notify} close={() => setModal(null)} />)}>{prov.avatar}</div>
          <div>
            <div style={{ fontWeight: 700, cursor: "pointer" }} onClick={() => setModal && setModal(<ProviderProfileModal userId={prov._id} notify={notify} close={() => setModal(null)} />)}>{prov.name}</div>
            <div className="text-m" style={{ fontSize: 12 }}>★ {prov.rep || "New"} · {prov.reviews} reviews</div>
          </div>
        </div>
      )}
      <div className="row mb1">
        {sk && <span className="tag tb">{sk.category}</span>}
        <span className="tag tg">⏱ {svc.hours} credit{svc.hours > 1 ? "s" : ""}</span>
      </div>
      <p className="text-s" style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 12 }}>{svc.description}</p>
      
      {!own ? (
        <>
          <hr className="div" />
          <div className="field">
            <label>Date & time</label>
            <input className="fi" type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} />
          </div>
          <div className="field">
            <label>Notes for provider</label>
            <textarea className="fi" rows={2} placeholder="What do you need help with?" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} />
          </div>
          <p className="text-m" style={{ fontSize: 12, marginBottom: 10 }}>Cost: {svc.hours} credit{svc.hours > 1 ? "s" : ""} (you have {user.credits})</p>
          <button className="btn btn-p" onClick={handleBooking}>Confirm booking</button>
        </>
      ) : <p className="text-a" style={{ fontSize: 13, marginTop: 8 }}>This is your own listing.</p>}
      
      {canCancel && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-d btn-sm" onClick={handleCancel}>Cancel Service</button>
        </div>
      )}
    </div>
  );
}

// ─── CREATE ADMIN MODAL ──────────────────────────────────────────────────────
export function CreateAdminModal({ close, notify, refresh }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", college: "" });
  
  const handleCreate = async () => {
    try {
      await api.createInstitutionAdmin(form);
      notify("Institution Admin created successfully");
      if (refresh) refresh();
      close();
    } catch (e) { notify(e.message, "error"); }
  };
  
  return (
    <div>
      <div className="mo-t">Create Institution Admin</div>
      <div className="field">
        <label>Name</label>
        <input className="fi" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      </div>
      <div className="field">
        <label>Email</label>
        <input className="fi" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
      </div>
      <div className="field">
        <label>Password</label>
        <input className="fi" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
      </div>
      <div className="field">
        <label>College Name</label>
        <CollegeAutocomplete value={form.college} onChange={val => setForm({...form, college: val})} placeholder="e.g. Global Academy" />
      </div>
      <button className="btn btn-p" onClick={handleCreate} style={{ width: "100%", marginTop: 10 }}>Create Admin</button>
    </div>
  );
}

// ─── AI CHAT WIDGET ────────────────────────────────────────────────────────────
export function AiChatWidget({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "model", text: "Hi! I'm the TimeBank AI Assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const res = await api.sendAiChatMessage(history, userMsg.text);
      setMessages(prev => [...prev, { role: "model", text: res.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "model", text: "Oops, something went wrong. 🤖" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{ 
              width: 320, height: 400, background: "var(--bg)", boxSizing: "border-box", 
              border: "1px solid var(--border)", borderRadius: 12, 
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              marginBottom: 16, display: "flex", flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <div style={{ flexShrink: 0, background: "rgba(139,92,246,0.1)", padding: "12px 16px", borderBottom: "1px solid rgba(139,92,246,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600, color: "var(--purple)", display: "flex", alignItems: "center", gap: 6 }}>
                🤖 AI Assistant
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                  <div style={{ 
                    background: m.role === "user" ? "var(--purple)" : "rgba(255,255,255,0.05)",
                    color: m.role === "user" ? "#fff" : "var(--text)",
                    padding: "8px 12px", borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                    borderBottomRightRadius: m.role === "user" ? 4 : 12,
                    borderBottomLeftRadius: m.role === "model" ? 4 : 12,
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && <div style={{ alignSelf: "flex-start", fontSize: 12, color: "var(--text-muted)" }}>Typing...</div>}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ flexShrink: 0, padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8, boxSizing: "border-box" }}>
              <input 
                className="fi" 
                style={{ margin: 0, flex: 1, color: "#fff", background: "rgba(255,255,255,0.1)", boxSizing: "border-box" }} 
                placeholder="Ask me anything..." 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
              />
              <button className="btn btn-p" style={{ padding: "0 12px", width: "auto" }} onClick={send}>Send</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setOpen(!open)}
        style={{
          width: 50, height: 50, borderRadius: 25, 
          background: "var(--purple)", color: "#fff", 
          border: "none", cursor: "pointer", 
          boxShadow: "0 4px 12px rgba(139,92,246,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, transition: "transform 0.2s"
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        {open ? "✕" : "🤖"}
      </button>
    </div>
  );
}

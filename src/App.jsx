import { useState, useEffect, useRef, useCallback, cloneElement, isValidElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { AICTE_CFG } from "./store.js";
import * as api from "./api.js";
import * as chain from "./blockchain.js";

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

// ─── Animation Variants ──────────────────────────────────────────────────────
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
export default function App() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null); // { provider, signer, address, balance }
  const [page, setPage] = useState("landing");
  const [notifs, setNotifs] = useState([]);
  const [modal, setModal] = useState(null);
  const [clockAngle, setClockAngle] = useState({ h: 0, m: 0 });

  // Shared data cache
  const [skills, setSkills] = useState([]);
  const [users, setUsers] = useState([]);

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
      const u = await api.login(email, pass);
      setUser(u);
      nav("dashboard");
      notify(`Welcome back, ${u.name.split(" ")[0]}!`);
    } catch (e) { notify(e.message, "error"); }
  };

  // Admin login
  const doAdminLogin = async (email, pass) => {
    try {
      const u = await api.adminLogin(email, pass);
      setUser(u);
      nav("admin");
      notify(`Welcome, ${u.name}`);
    } catch (e) { notify(e.message, "error"); }
  };

  // Register
  const doRegister = async (name, email, pass, bio) => {
    try {
      const keyName = `timebank_inbuilt_private_key_${email.toLowerCase()}`;
      let privateKey = localStorage.getItem(keyName);
      let walletAddr = "";
      if (!privateKey) {
        const w = ethers.Wallet.createRandom();
        localStorage.setItem(keyName, w.privateKey);
        walletAddr = w.address;
      } else {
        walletAddr = new ethers.Wallet(privateKey).address;
      }

      const u = await api.register(name, email, pass, bio, walletAddr);
      setUser(u);
      nav("dashboard");
      notify("Welcome! You received 2 starter credits on-chain! 🎉");
    } catch (e) { notify(e.message, "error"); }
  };

  // Logout
  const doLogout = () => { setUser(null); setWallet(null); nav("landing"); };

  const handleSetModal = (fnOrNode) => {
    if (typeof fnOrNode === "function") {
      setModal(() => fnOrNode);
    } else {
      setModal(fnOrNode);
    }
  };

  const pageProps = {
    user, wallet, skills, users, notify, nav, getU, getSk,
    setModal: handleSetModal, refreshUser, connectWallet, doLogout,
    loadSkills,
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav user={user} page={page} nav={nav} clockAngle={clockAngle} doLogout={doLogout} />
      <NotifStack notifs={notifs} />
      <AnimatePresence>
        {modal && <Modal content={modal} close={() => setModal(null)} />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div key={page} variants={pageVariants} initial="initial" animate="animate" exit="exit">
          {page === "landing" && <Landing nav={nav} />}
          {page === "auth" && <Auth doLogin={doLogin} doRegister={doRegister} doAdminLogin={doAdminLogin} clockAngle={clockAngle} />}
          {page === "dashboard" && user && <Dashboard {...pageProps} />}
          {page === "services" && user && <Services {...pageProps} />}
          {page === "bookings" && user && <Bookings {...pageProps} />}
          {page === "wallet" && user && <Wallet {...pageProps} />}
          {page === "aicte" && user && <AICTEPage {...pageProps} />}
          {page === "chat" && user && <ChatPage {...pageProps} />}
          {page === "profile" && user && <Profile {...pageProps} />}
          {page === "admin" && user?.role === "admin" && <Admin {...pageProps} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({ user, page, nav, clockAngle, doLogout }) {
  const userPages = ["dashboard", "services", "bookings", "wallet", "aicte", "chat", "profile"];
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
          {user.role === "admin" ? (
            <button className={`nl${page === "admin" ? " act" : ""}`} onClick={() => nav("admin")}>Admin Panel</button>
          ) : (
            userPages.map((p) => (
              <button key={p} className={`nl${page === p ? " act" : ""}`} onClick={() => nav(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="nav-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <ClockIcon size={13} color="var(--em)" />
              <span>{user.credits} cr</span>
            </span>
            <div className="nav-av" onClick={() => nav(user.role === "admin" ? "admin" : "profile")}>{user.avatar}</div>
            <button className="nl" onClick={doLogout}>Sign out</button>
          </div>
        </>
      ) : (
        <>
          <button className="nl" onClick={() => nav("landing")} style={{ marginLeft: "auto" }}>Home</button>
          <button className="nav-cta" onClick={() => nav("auth")}>Get started</button>
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

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ content, close }) {
  const renderedContent = typeof content === "function"
    ? content(close)
    : (isValidElement(content) ? cloneElement(content, { close }) : content);
  return (
    <motion.div className="mo" onClick={(e) => e.target.classList.contains("mo") && close()}
      variants={overlayVariants} initial="initial" animate="animate" exit="exit">
      <motion.div className="mo-box" variants={modalVariants} initial="initial" animate="animate" exit="exit">
        {renderedContent}
      </motion.div>
    </motion.div>
  );
}

// ─── LANDING ─────────────────────────────────────────────────────────────────
function Landing({ nav }) {
  const feats = [
    { icon: <ClockIcon size={20} color="var(--em)" />, bg: "var(--em-bg)", t: "Time credit economy", d: "1 hour of any skill equals 1 credit. Fair, transparent, and universally valued across the platform." },
    { icon: <ChainIcon size={20} color="var(--purple)" />, bg: "var(--purple-bg)", t: "Blockchain verified", d: "Every credit transfer is recorded on Polygon Amoy as an immutable, verifiable transaction." },
    { icon: <AicteIcon size={20} color="var(--blue)" />, bg: "var(--blue-bg)", t: "AICTE recognition", d: "Workshops, hackathons, and internships earn bonus credits with AICTE point tracking." },
    { icon: <ChatIcon size={20} color="var(--teal)" />, bg: "var(--teal-bg)", t: "Direct messaging", d: "Coordinate sessions, share resources, and communicate directly with your skill partner." },
    { icon: <BookingIcon size={20} color="var(--amber)" />, bg: "var(--amber-bg)", t: "Session booking", d: "Schedule, confirm, and complete sessions with a structured workflow and blockchain receipt." },
    { icon: <SosIcon size={20} color="var(--red)" />, bg: "var(--red-bg)", t: "Emergency SOS", d: "Alert your emergency contacts with one tap. Safety is built into the platform." },
  ];
  const howSteps = [
    { n: 1, t: "Create your account", d: "Sign up with your email, set up your profile, and receive 2 starter credits." },
    { n: 2, t: "List your expertise", d: "Post the skills you can offer — teaching, coding, design, music, or anything else." },
    { n: 3, t: "Book and exchange", d: "Find a skill you need, book a session, and complete it. Credits transfer on-chain." },
    { n: 4, t: "Earn AICTE points", d: "Submit verified activities for admin approval and earn bonus credits and recognition." },
  ];

  return (
    <div>
      <div className="hero">
        {[600, 420, 270].map((s, i) => (
          <div key={s} className="ring" style={{ width: s, height: s, top: "50%", left: "50%", animationDelay: `${i * 0.5}s` }} />
        ))}
        <motion.div className="hero-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}>
          <motion.div className="hero-eyebrow" {...fadeUp(0.1)}>
            <span style={{ width: 6, height: 6, background: "#00c27a", borderRadius: "50%" }} />
            Polygon Amoy · AICTE integrated · MongoDB backed
          </motion.div>
          <motion.h1 className="hero-title" {...fadeUp(0.2)}>
            Trade skills,<br />not <span>money</span>
          </motion.h1>
          <motion.p className="hero-sub" {...fadeUp(0.3)}>
            TimeBank is a peer-to-peer skill exchange platform where 1 hour of your expertise equals 1 time credit — recorded on blockchain and recognized by AICTE.
          </motion.p>
          <motion.div className="hero-btns" {...fadeUp(0.4)}>
            <button className="btn-hp btn-hp-p" onClick={() => nav("auth")}>Start exchanging</button>
            <button className="btn-hp btn-hp-s" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              How it works ↓
            </button>
          </motion.div>
          <motion.div className="hero-stats" {...fadeUp(0.5)}>
            {[{ n: "1 hr", l: "= 1 credit always" }, { n: "Polygon", l: "Amoy testnet" }, { n: "AICTE", l: "Points system" }, { n: "MongoDB", l: "Real-time data" }].map((s) => (
              <div key={s.l}><div className="hstat-num">{s.n}</div><div className="hstat-lbl">{s.l}</div></div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="feat-section" id="features">
        <div className="feat-inner">
          <motion.div {...fadeUp()} viewport={{ once: true }} whileInView="animate" initial="initial">
            <div className="sec-eyebrow">Features</div>
            <h2 className="sec-title">Everything you need to exchange skills</h2>
            <p className="sec-sub">From booking to blockchain verification — TimeBank handles the complete workflow so you can focus on learning and teaching.</p>
          </motion.div>
          <motion.div className="feat-grid" variants={stagger} initial="initial" whileInView="animate" viewport={{ once: true }}>
            {feats.map((f, i) => (
              <motion.div key={f.t} className="feat-card" variants={fadeUp(i * 0.05)} {...cardHover}>
                <div className="feat-icon" style={{ background: f.bg }}>{f.icon}</div>
                <div className="feat-ct">{f.t}</div>
                <div className="feat-cd">{f.d}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="how-section">
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

      <div className="cta-band">
        <motion.div {...fadeUp()} viewport={{ once: true }} whileInView="animate" initial="initial">
          <h2>Ready to trade your first hour?</h2>
          <p>Join TimeBank — the blockchain-verified skill economy for students and professionals.</p>
          <button className="btn-white" onClick={() => nav("auth")}>Get started for free</button>
        </motion.div>
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <p>TimeBank © {new Date().getFullYear()} · Polygon Amoy · AICTE integrated</p>
        </div>
      </footer>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function Auth({ doLogin, doRegister, doAdminLogin, clockAngle }) {
  const [tab, setTab] = useState("login");
  const [le, setLe] = useState(""), [lp, setLp] = useState("");
  const [rn, setRn] = useState(""), [re, setRe] = useState(""), [rp, setRp] = useState(""), [rb, setRb] = useState("");
  const [ae, setAe] = useState("admin@timebank.com"), [ap, setAp] = useState("admin@123");

  const cx = 34, cy = 34;
  const hx = cx + 14 * Math.sin((clockAngle.h * Math.PI) / 180);
  const hy = cy - 14 * Math.cos((clockAngle.h * Math.PI) / 180);
  const mx = cx + 18 * Math.sin((clockAngle.m * Math.PI) / 180);
  const my = cy - 18 * Math.cos((clockAngle.m * Math.PI) / 180);

  return (
    <div className="auth-wrap">
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
        {/* User Auth Card */}
        <motion.div className="auth-card" {...fadeUp(0.1)}>
          <div className="clock-wrap">
            <svg className="clock-svg" viewBox="0 0 68 68" fill="none">
              <circle cx="34" cy="34" r="30" stroke="#00c27a" strokeWidth="2" fill="#f0faf5" />
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
                <line key={a} x1={34 + 28 * Math.sin((a * Math.PI) / 180)} y1={34 - 28 * Math.cos((a * Math.PI) / 180)}
                  x2={34 + 24 * Math.sin((a * Math.PI) / 180)} y2={34 - 24 * Math.cos((a * Math.PI) / 180)}
                  stroke="rgba(0,194,122,0.25)" strokeWidth="1" />
              ))}
              <line x1="34" y1="34" x2={hx} y2={hy} stroke="#00c27a" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="34" y1="34" x2={mx} y2={my} stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="34" cy="34" r="2.5" fill="#00c27a" />
            </svg>
          </div>
          <h2 className="auth-title">TimeBank</h2>
          <p className="auth-sub">Skill exchange · Blockchain verified · AICTE integrated</p>
          <div className="auth-tabs">
            <button className={`atab${tab === "login" ? " on" : ""}`} onClick={() => setTab("login")}>Sign in</button>
            <button className={`atab${tab === "register" ? " on" : ""}`} onClick={() => setTab("register")}>Sign up</button>
          </div>
          {tab === "login" ? (
            <>
              <div className="field"><label>Email</label><input className="fi" value={le} onChange={(e) => setLe(e.target.value)} placeholder="your@email.com" /></div>
              <div className="field"><label>Password</label><input className="fi" type="password" value={lp} onChange={(e) => setLp(e.target.value)} placeholder="Password" onKeyDown={(e) => e.key === "Enter" && doLogin(le, lp)} /></div>
              <button className="btn btn-p" onClick={() => doLogin(le, lp)}>Sign in</button>
            </>
          ) : (
            <>
              <div className="field"><label>Full name</label><input className="fi" value={rn} onChange={(e) => setRn(e.target.value)} placeholder="Your full name" /></div>
              <div className="field"><label>Email</label><input className="fi" type="email" value={re} onChange={(e) => setRe(e.target.value)} placeholder="your@email.com" /></div>
              <div className="field"><label>Password</label><input className="fi" type="password" value={rp} onChange={(e) => setRp(e.target.value)} placeholder="Min 6 characters" /></div>
              <div className="field"><label>Bio</label><input className="fi" value={rb} onChange={(e) => setRb(e.target.value)} placeholder="Brief intro..." /></div>
              <button className="btn btn-p" onClick={() => { if (!rn || !re || rp.length < 6) return; doRegister(rn, re, rp, rb); }}>Create account</button>
            </>
          )}
        </motion.div>

        {/* Admin Login Card */}
        <motion.div className="auth-card" style={{ maxWidth: 340 }} {...fadeUp(0.2)}>
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1a1a2e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", fontSize: 20 }}>🔐</div>
            <h2 className="auth-title" style={{ fontSize: 18 }}>Admin Portal</h2>
            <p className="auth-sub">Platform administration access</p>
          </div>
          <div className="field"><label>Admin Email</label><input className="fi" value={ae} onChange={(e) => setAe(e.target.value)} placeholder="admin@timebank.com" /></div>
          <div className="field"><label>Password</label><input className="fi" type="password" value={ap} onChange={(e) => setAp(e.target.value)} placeholder="Admin password" onKeyDown={(e) => e.key === "Enter" && doAdminLogin(ae, ap)} /></div>
          <button className="btn btn-p" style={{ background: "#1a1a2e" }} onClick={() => doAdminLogin(ae, ap)}>Sign in as Admin</button>
          <p className="hint">Default: admin@timebank.com / admin@123</p>
        </motion.div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
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

      <motion.div className="g2" {...fadeUp(0.15)}>
        <div className="card">
          <div className="btwn mb1">
            <span className="card-t" style={{ margin: 0 }}>Blockchain wallet</span>
            <span className={`tag ${wallet?.isInbuilt ? "tp" : "tt"}`}>
              {wallet?.isInbuilt ? "Inbuilt Wallet" : "Polygon Amoy"}
            </span>
          </div>
          {wallet ? (
            <>
              <div className="chash mt1">{wallet.address}</div>
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
                  <span className={`tag ${tx.type === "aicte_reward" ? "tp" : tx.type === "initial_credits" ? "tb" : "tg"}`}>
                    {tx.type === "aicte_reward" ? "AICTE" : tx.type === "initial_credits" ? "Starter" : "Transfer"}
                  </span>
                  <span className="text-s">{tx.desc}</span>
                </div>
                <span style={{ fontWeight: 700, color: inc ? "var(--em-dark)" : "var(--red)" }}>{inc ? "+" : "-"}{tx.amount}h</span>
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

  const load = useCallback(() => {
    setLoading(true);
    api.fetchServices().then((s) => { setServices(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

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
        notify={notify}
        nav={nav}
        refreshUser={refreshUser}
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
      {loading ? <div className="empty">Loading...</div> : svcs.length === 0 ? (
        <div className="empty">{services.length === 0 ? "No services yet — be the first to offer a skill!" : "No matches found."}</div>
      ) : (
        <motion.div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "1rem" }} variants={stagger} initial="initial" animate="animate">
          {svcs.map((s) => {
            const prov = getU(s.providerId), sk = getSk(s.skillId);
            return (
              <motion.div key={s._id} className="svc-card" onClick={() => openDetail(s)} variants={fadeUp()} {...cardHover}>
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

// ─── BOOKINGS ────────────────────────────────────────────────────────────────
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
                <div className="av" style={{ width: 34, height: 34, fontSize: 11 }}>{other?.avatar || "?"}</div>
                <div style={{ flex: 1 }}>
                  <div className="btwn">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{other?.name || "User"}</div>
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
function Wallet({ user, wallet, notify, connectWallet }) {
  const [txs, setTxs] = useState([]);
  const [bcRecords, setBcRecords] = useState([]);

  useEffect(() => {
    api.fetchUserTransactions(user._id).then(setTxs).catch(() => {});
    api.fetchBlockchainRecords().then(setBcRecords).catch(() => {});
  }, [user]);

  return (
    <div className="inner">
      <div className="ph"><h1>Wallet</h1><p>Your credits and blockchain activity</p></div>
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
            <div className="btwn mt1"><span style={{ fontSize: 13 }}>POL balance</span><span style={{ fontWeight: 700 }}>{parseFloat(wallet.balance).toFixed(4)} POL</span></div>
            <a href={chain.addressLink(wallet.address)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#34d399", display: "inline-block", marginTop: 4 }}>View on Polygonscan ↗</a>
          </>
        ) : (
          <button className="btn" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", marginTop: 4 }} onClick={connectWallet}>
            {chain.isMetaMaskInstalled() ? "Connect MetaMask" : "Connect Inbuilt Wallet"}
          </button>
        )}
      </motion.div>

      {wallet && (
        <motion.div className="card mb2" style={{ borderLeft: "4px solid var(--amber)", background: "rgba(245, 158, 11, 0.05)" }} {...fadeUp(0.15)}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "16px", color: "var(--amber)", marginTop: "2px" }}>⚠️</span>
            <div style={{ fontSize: "12.5px", lineHeight: "1.4", color: "var(--text-secondary)" }}>
              <strong style={{ color: "#fff", display: "block", marginBottom: "4px" }}>Gas Funding Required for On-Chain Logs</strong>
              To perform real blockchain activities, your wallet must have native <strong>POL</strong> gas. If your balance is <strong>0.0000 POL</strong>, please copy your address above and request free testnet gas:
              <a href="https://faucet.polygon.technology/" target="_blank" rel="noreferrer" style={{ color: "var(--em)", fontWeight: "700", display: "inline-block", marginLeft: "6px", textDecoration: "underline" }}>
                Official Polygon Faucet ↗
              </a>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div className="card mb2" {...fadeUp(0.2)}>
        <div className="card-t">Transaction history</div>
        {txs.length === 0 ? <div className="text-m" style={{ fontSize: 13 }}>No transactions yet</div> : txs.map((tx) => {
          const inc = tx.toId === user._id;
          return (
            <div key={tx._id} className="btwn" style={{ fontSize: 13, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <div className="row" style={{ gap: 10 }}>
                <span className={`tag ${tx.type === "aicte_reward" ? "tp" : tx.type === "initial_credits" ? "tb" : "tg"}`}>
                  {tx.type === "aicte_reward" ? "AICTE" : tx.type === "initial_credits" ? "Starter" : "Transfer"}
                </span>
                <div>
                  <div>{tx.desc}</div>
                  {tx.txHash && <a href={chain.txLink(tx.txHash)} target="_blank" rel="noreferrer" className="chash" style={{ color: "var(--em)" }}>tx: {chain.formatAddress(tx.txHash)} ↗</a>}
                </div>
              </div>
              <span style={{ fontWeight: 700, color: inc ? "var(--em-dark)" : "var(--red)" }}>{inc ? "+" : "-"}{tx.amount}h</span>
            </div>
          );
        })}
      </motion.div>

      {bcRecords.length > 0 && (
        <motion.div className="card" {...fadeUp(0.3)}>
          <div className="card-t">Blockchain ledger</div>
          <div className="ledger">
            {bcRecords.map((r) => (
              <div key={r._id}>
                [{r.type}] Block #{r.block} | {chain.formatAddress(r.txHash)} | {r.amount} credits | {chain.formatAddress(r.from)} → {chain.formatAddress(r.to)}
              </div>
            ))}
          </div>
        </motion.div>
      )}
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
    setModal(<SubmitAicteModal user={user} notify={notify} load={load} />);
  };

  return (
    <div className="inner">
      <div className="btwn mb2"><div className="ph" style={{ margin: 0 }}><h1>AICTE Activities</h1><p>Track your academic achievements</p></div><button className="btn btn-g" onClick={openSubmit}>+ Submit activity</button></div>
      <motion.div className="g3 mb2" variants={stagger} initial="initial" animate="animate">
        <motion.div className="stat" variants={fadeUp()}><div className="stat-l">Total points</div><div className="stat-v text-p">{totalPts}</div></motion.div>
        <motion.div className="stat" variants={fadeUp(0.05)}><div className="stat-l">Credits earned</div><div className="stat-v text-g">{totalCr}</div></motion.div>
        <motion.div className="stat" variants={fadeUp(0.1)}><div className="stat-l">Pending</div><div className="stat-v text-a">{pending.length}</div></motion.div>
      </motion.div>
      <div className="tab-bar">
        <button className={`tb-btn${tab === "verified" ? " on" : ""}`} onClick={() => setTab("verified")}>Verified ({verified.length})</button>
        <button className={`tb-btn${tab === "pending" ? " on" : ""}`} onClick={() => setTab("pending")}>Pending ({pending.length})</button>
      </div>
      {loading ? <div className="empty">Loading...</div> : shown.length === 0 ? (
        <div className="empty">No {tab} activities.</div>
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
    setModal(<EditProfileModal user={user} refreshUser={refreshUser} notify={notify} />);
  };

  const addContact = () => {
    setModal(<AddContactModal user={user} notify={notify} setEmergency={setEmergency} />);
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
          <div className="row mb2">
            <div className="av" style={{ width: 54, height: 54, fontSize: 18 }}>{user.avatar}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{user.name}</div>
              <div className="text-s" style={{ fontSize: 13 }}>{user.email}</div>
            </div>
          </div>
          <div className="text-s" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{user.bio || "No bio yet."}</div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-o btn-sm" onClick={editProfile}>Edit profile</button>
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
function Admin({ user, wallet, users, notify, refreshUser, connectWallet }) {
  const [stats, setStats] = useState(null);
  const [pendingAicte, setPendingAicte] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    api.fetchAdminStats().then(setStats).catch(() => {});
    api.fetchAllAicte().then((all) => setPendingAicte(all.filter((a) => !a.verified))).catch(() => {});
    api.fetchAllBookings().then(setAllBookings).catch(() => {});
  }, []);

  const approveAicte = async (a) => {
    let txHash = null, blockNumber = null;
    if (wallet) {
      const student = users.find((u) => u._id === a.userId);
      if (student?.wallet) {
        try {
          notify("Signing verification transaction...", "info");
          const result = await chain.sendCredits(wallet.signer, student.wallet, a.credits, wallet.isInbuilt);
          txHash = result.txHash;
          blockNumber = result.blockNumber;
        } catch (e) { notify("Blockchain tx skipped", "warning"); }
      }
    }
    try {
      await api.verifyAicte(a._id, txHash, blockNumber);
      notify(`Approved: ${a.title}`);
      setPendingAicte((prev) => prev.filter((x) => x._id !== a._id));
      api.fetchAdminStats().then(setStats).catch(() => {});
    } catch (e) { notify(e.message, "error"); }
  };

  const rejectAicte = async (a) => {
    try {
      await api.rejectAicte(a._id);
      notify("Activity rejected");
      setPendingAicte((prev) => prev.filter((x) => x._id !== a._id));
    } catch (e) { notify(e.message, "error"); }
  };

  const allUsers = users.filter((u) => u.role !== "admin");

  return (
    <div className="inner">
      <div className="ph"><h1>Admin Panel</h1><p>Platform administration</p></div>

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
        {["overview", "verify", "users", "bookings"].map((t) => (
          <button key={t} className={`tb-btn${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} {t === "verify" && pendingAicte.length > 0 ? `(${pendingAicte.length})` : ""}
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
            { l: "Pending AICTE", v: stats.pendingAicte, c: stats.pendingAicte > 0 ? "text-a" : "" },
          ].map((st, i) => (
            <motion.div key={st.l} className="stat" variants={fadeUp(i * 0.05)}>
              <div className="stat-l">{st.l}</div>
              <div className={`stat-v ${st.c || ""}`}>{st.v}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {tab === "verify" && (
        pendingAicte.length === 0 ? <div className="empty">No pending activities to verify.</div> : (
          <motion.div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} variants={stagger} initial="initial" animate="animate">
            {pendingAicte.map((a) => {
              const student = users.find((u) => u._id === a.userId);
              return (
                <motion.div key={a._id} className="ac-card" variants={fadeUp()}>
                  <div className="btwn">
                    <div className="row"><span className="tag ta">Pending</span><span className="tag tp">{AICTE_CFG[a.type]?.label || a.type}</span></div>
                    <span className="text-m" style={{ fontSize: 12 }}>{a.date}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>{a.title}</div>
                  <div className="text-s" style={{ fontSize: 12, marginTop: 2 }}>
                    By: {student?.name || "Unknown"} · Organizer: {a.organizer}
                  </div>
                  <div className="row mt1" style={{ gap: 12, fontSize: 12 }}>
                    <span className="text-p fw7">+{a.pts} pts</span>
                    <span className="text-g fw7">+{a.credits} credits</span>
                    {a.certUrl && <a href={a.certUrl} target="_blank" rel="noreferrer">View certificate ↗</a>}
                  </div>
                  <div className="row mt1" style={{ gap: 6 }}>
                    <button className="btn btn-g btn-sm" onClick={() => approveAicte(a)}>Approve</button>
                    <button className="btn btn-d btn-sm" onClick={() => rejectAicte(a)}>Reject</button>
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

// ─── EDIT PROFILE MODAL ──────────────────────────────────────────────────────
export function EditProfileModal({ user, refreshUser, close, notify }) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);

  const handleSave = async () => {
    if (!name.trim()) { notify("Name is required", "error"); return; }
    try {
      const av = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
      await api.updateUser(user._id, { name, bio, avatar: av });
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
        <label>Bio</label>
        <textarea className="fi" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} style={{ resize: "vertical" }} />
      </div>
      <button className="btn btn-p" onClick={handleSave}>Save changes</button>
    </div>
  );
}

// ─── SUBMIT AICTE MODAL ──────────────────────────────────────────────────────
export function SubmitAicteModal({ user, close, notify, load }) {
  const [type, setType] = useState("workshop");
  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [date, setDate] = useState("");
  const [cert, setCert] = useState("");

  const handleSubmit = async () => {
    if (!title || !org || !date) { notify("Fill all required fields", "error"); return; }
    try {
      await api.createAicte({ userId: user._id, type, title, organizer: org, date, certUrl: cert });
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
        </select>
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
          <option value="custom">Custom (Create a new skill)...</option>
        </select>
      </div>

      {skillId === "custom" && (
        <div className="custom-skill-wrap">
          <div className="field">
            <label>Custom Skill Name</label>
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
export function ServiceDetailModal({ user, svc, prov, sk, own, close, notify, nav, refreshUser }) {
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

  return (
    <div>
      {svc.images && svc.images.length > 0 && (
        <ImageSlider images={svc.images} />
      )}
      <div className="mo-t" style={{ marginTop: svc.images && svc.images.length > 0 ? 0 : "" }}>{svc.title}</div>
      {prov && (
        <div className="row mb1">
          <div className="av">{prov.avatar}</div>
          <div>
            <div style={{ fontWeight: 700 }}>{prov.name}</div>
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
    </div>
  );
}

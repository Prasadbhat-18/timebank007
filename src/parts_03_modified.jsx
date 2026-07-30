// ─── MODIFIED COMPONENTS ───────────────────────────────────────────────────────

export function Nav({ pg, setPage, setModal, user, refreshUser }) {
  const [notifs, setNotifs] = useState([]);
  useEffect(() => {
    if (user && user._id) {
      api.fetchNotifications(user._id).then(setNotifs).catch(console.error);
      const sock = getSocket(user._id);
      const onNotif = (n) => setNotifs(prev => [n, ...prev]);
      sock.on("notification", onNotif);
      return () => { sock.off("notification", onNotif); };
    }
  }, [user]);

  const markRead = (id) => {
    api.markNotificationRead(id).then(() => {
      setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    }).catch(console.error);
  };
  const markAllRead = () => {
    api.markAllNotificationsRead(user._id).then(() => {
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    }).catch(console.error);
  };

  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => setPage(user ? "dashboard" : "landing")}>
        <ClockIcon color="#10b981" /> Time<span>Bank</span>
      </div>
      {user ? (
        <>
          <button className={`nl ${pg === "dashboard" ? "act" : ""}`} onClick={() => setPage("dashboard")}>Home</button>
          <button className={`nl ${pg === "services" ? "act" : ""}`} onClick={() => setPage("services")}>Explore</button>
          <button className={`nl ${pg === "bookings" ? "act" : ""}`} onClick={() => setPage("bookings")}>Bookings</button>
          <button className={`nl ${pg === "chat" ? "act" : ""}`} onClick={() => setPage("chat")}>Messages</button>
          <button className={`nl ${pg === "aicte" ? "act" : ""}`} onClick={() => setPage("aicte")}>AICTE</button>
          <button className={`nl ${pg === "leaderboard" ? "act" : ""}`} onClick={() => setPage("leaderboard")}>Leaderboard</button>
          {user?.role === "admin" && <button className={`nl ${pg === "admin" ? "act" : ""}`} onClick={() => setPage("admin")}>Admin</button>}
          
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <div className="nav-badge">{user?.credits || 0} C</div>
            <NotificationCenter notifications={notifs} markRead={markRead} markAllRead={markAllRead} />
            <div className="nav-av" onClick={() => setPage("profile")}>
              {user?.avatarUrl ? <img src={user.avatarUrl} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : user?.avatar}
            </div>
          </div>
        </>
      ) : (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {pg === "auth" ? (
            <button className="nl" onClick={() => setPage("landing")}>Home</button>
          ) : (
            <button className="nav-cta" onClick={() => setPage("auth")}>Sign In</button>
          )}
        </div>
      )}
    </nav>
  );
}

export function Dashboard({ user, wallet, notify, nav, connectWallet, setModal }) {
  const [em, setEm] = useState([]);
  const [txs, setTxs] = useState([]);
  useEffect(() => {
    if (user?._id) {
      api.fetchEmergencyContacts(user._id).then(setEm).catch(console.error);
      api.fetchUserTransactions(user._id).then(setTxs).catch(console.error);
    }
  }, [user]);

  const freeloaderStat = checkFreeloaderLocal(user);

  return (
    <motion.div className="inner" initial="hidden" animate="visible" variants={scaleUp}>
      <RestrictionBanner user={user} />
      {freeloaderStat.warned && !freeloaderStat.restricted && (
        <div className="restriction-banner" style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
          <div className="restriction-banner-icon">⚖️</div>
          <div className="restriction-banner-text">
            <strong style={{ color: "var(--amber)" }}>Community Balance Notice</strong>
            <span>{freeloaderStat.message}</span>
          </div>
        </div>
      )}

      <div className="ph" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1>Welcome back, {user?.name?.split(" ")[0]}</h1>
          <p>You have {user?.credits || 0} credits to spend.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {em.length > 0 && <button className="btn btn-d" onClick={() => setModal(<SosModal emergency={em} notify={notify} />)}>SOS Emergency</button>}
          <button className="btn btn-p" onClick={() => nav("services")}>Explore Services</button>
        </div>
      </div>

      <div className="g3">
        <div className="stat">
          <div className="stat-l">Available Credits</div>
          <div className="stat-v text-g">{user?.credits || 0}</div>
          <div className="stat-s">Ready to spend</div>
        </div>
        <div className="stat">
          <div className="stat-l">Level & Trust</div>
          <div className="stat-v" style={{ fontSize: 24, display: "flex", alignItems: "center", gap: 8 }}>
            Lv {user?.level || 1} <TrustScoreBadge score={user?.trustScore} label={false} />
          </div>
          <div className="stat-s">{user?.rep || 0}⭐ Rating</div>
        </div>
        <div className="stat">
          <div className="stat-l">Services Offered</div>
          <div className="stat-v text-p">{user?.servicesOffered || 0}</div>
          <div className="stat-s">Total offered</div>
        </div>
        <div className="stat">
          <div className="stat-l">Services Taken</div>
          <div className="stat-v text-a">{user?.servicesTaken || 0}</div>
          <div className="stat-s">Total taken</div>
        </div>
      </div>

      <LevelProgressBar user={user} />

      <div className="g2">
        <Wallet user={user} wallet={wallet} connectWallet={connectWallet} notify={notify} />
        <div className="card">
          <div className="card-t">Activity Overview</div>
          <div style={{ minHeight: 140, position: "relative", padding: "10px 0" }}>
            <CreditTimelineChart txs={txs} userId={user._id} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, textAlign: "center" }}>Total Earned</div>
              <div style={{ fontSize: 20, color: "var(--em)", fontWeight: 800, textAlign: "center" }}>{user?.earned || 0} C</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700, textAlign: "center" }}>Total Spent</div>
              <div style={{ fontSize: 20, color: "var(--red)", fontWeight: 800, textAlign: "center" }}>{user?.spent || 0} C</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function checkFreeloaderLocal(user) {
  const taken = user?.servicesTaken || 0;
  const offered = user?.servicesOffered || 0;
  if (offered > 0) return { warned: false, restricted: false };
  if (taken >= 5 && !user?.restrictionUntil) return { warned: true, restricted: true, message: "You've taken 5 services without offering any. Taking new services is temporarily restricted." };
  if (taken >= 3 && !user?.freeloaderWarned) return { warned: true, restricted: false, message: "You've taken 3 services without offering any. Please consider offering a service to keep the community balanced." };
  return { warned: false, restricted: false };
}

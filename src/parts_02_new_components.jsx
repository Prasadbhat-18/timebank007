// ─── NEW COMPONENTS (Gamification, Reviews, Notifications, etc) ───────────────

export function NotificationCenter({ notifications = [], markRead, markAllRead }) {
  const unreadCount = notifications.filter(n => !n.read).length;
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button className="notif-bell" onClick={() => setOpen(!open)}>
        <ClockIcon size={20} />
        {unreadCount > 0 && <span className="notif-bell-badge">{unreadCount}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="notif-dropdown"
          >
            <div className="notif-dropdown-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button className="tb-btn" style={{ padding: "4px 8px" }} onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="empty">No notifications yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {notifications.map(n => (
                  <div key={n._id} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => markRead(n._id)}>
                    <div className="notif-item-icon">{NOTIF_ICONS[n.type] || "🔔"}</div>
                    <div className="notif-item-body">
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-msg">{n.message}</div>
                      <div className="notif-item-time">{new Date(n.createdAt).toLocaleDateString()}</div>
                    </div>
                    {!n.read && <div className="notif-unread-dot" />}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WelcomeModal({ close, credits }) {
  return (
    <div className="mo">
      <div className="confetti-wrap">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="confetti-piece" style={{
            left: Math.random() * 100 + "%",
            animationDelay: Math.random() * 0.5 + "s",
            background: ["#10b981", "#8b5cf6", "#f59e0b", "#3b82f6"][Math.floor(Math.random() * 4)],
            transform: \`rotate(\${Math.random() * 360}deg)\`
          }} />
        ))}
      </div>
      <motion.div className="mo-box celebrate-modal" style={{ textAlign: "center", position: "relative", zIndex: 20 }}>
        <h2 className="mo-t" style={{ fontSize: 28, marginBottom: 8 }}>Welcome to TimeBank! 🎉</h2>
        <p className="auth-sub" style={{ fontSize: 15 }}>You've received a starting balance to get you going.</p>
        <div className="celebrate-credits">+{credits}</div>
        <p className="auth-sub" style={{ marginTop: 16 }}>Use these credits to book services from others in the community.</p>
        <button className="btn btn-p mt3" onClick={close}>Let's Go!</button>
      </motion.div>
    </div>
  );
}

export function CompletionCreditModal({ close, amount, newBalance }) {
  return (
    <div className="mo">
      <div className="confetti-wrap">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="confetti-piece" style={{
            left: Math.random() * 100 + "%",
            animationDelay: Math.random() * 0.5 + "s",
            background: ["#10b981", "#06b6d4", "#f59e0b"][Math.floor(Math.random() * 3)]
          }} />
        ))}
      </div>
      <motion.div className="mo-box celebrate-modal" style={{ textAlign: "center", position: "relative", zIndex: 20 }}>
        <h2 className="mo-t" style={{ fontSize: 26, marginBottom: 8 }}>Service Completed! ✅</h2>
        <p className="auth-sub">The transaction was verified on the blockchain.</p>
        <div className="celebrate-credits" style={{ margin: "20px 0" }}>+{amount}</div>
        <div className="wallet-num" style={{ fontSize: 20, marginTop: 10 }}>New Balance: {newBalance} Credits</div>
        <button className="btn btn-p mt3" onClick={close}>Awesome</button>
      </motion.div>
    </div>
  );
}

export function LevelUpModal({ close, newLevel }) {
  const cfg = LEVEL_CFG[newLevel];
  return (
    <div className="mo">
      <div className="confetti-wrap">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="confetti-piece" style={{
            left: Math.random() * 100 + "%",
            animationDelay: Math.random() * 0.5 + "s",
            background: [cfg.color, "#fff", "#10b981"][Math.floor(Math.random() * 3)]
          }} />
        ))}
      </div>
      <motion.div className="mo-box celebrate-modal" style={{ textAlign: "center", position: "relative", zIndex: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{cfg.icon}</div>
        <h2 className="mo-t" style={{ fontSize: 28, marginBottom: 8, color: cfg.color }}>Level Up!</h2>
        <p className="auth-sub" style={{ fontSize: 16 }}>You are now a <strong>{cfg.name}</strong> (Level {newLevel})</p>
        <div className="card mt3" style={{ textAlign: "left", background: "rgba(0,0,0,0.3)" }}>
          <div className="card-t" style={{ fontSize: 14 }}>New Perks Unlocked:</div>
          <p style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}>{cfg.perks}</p>
        </div>
        <button className="btn btn-p mt3" onClick={close} style={{ background: cfg.color }}>Continue</button>
      </motion.div>
    </div>
  );
}

export function FreeloaderWarningModal({ close }) {
  return (
    <div className="mo">
      <motion.div className="mo-box" initial="hidden" animate="visible" variants={scaleUp}>
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>⚖️</div>
        <h2 className="mo-t" style={{ textAlign: "center", color: "#f59e0b" }}>Community Balance Notice</h2>
        <p className="auth-sub" style={{ fontSize: 14 }}>
          TimeBank relies on a mutual exchange of skills. You have taken 3 services without offering any in return.
        </p>
        <p className="auth-sub" style={{ fontSize: 14 }}>
          Please consider offering a service soon. If you take 5 services without offering one, your ability to book new services will be temporarily restricted.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button className="btn btn-s" onClick={close} style={{ flex: 1 }}>I Understand</button>
        </div>
      </motion.div>
    </div>
  );
}

export function RestrictionBanner({ user }) {
  if (!user || !user.restrictionUntil) return null;
  const isRestricted = new Date(user.restrictionUntil) > new Date();
  if (!isRestricted) return null;
  const daysLeft = Math.ceil((new Date(user.restrictionUntil) - new Date()) / (1000 * 60 * 60 * 24));
  return (
    <div className="restriction-banner">
      <div className="restriction-banner-icon">🚫</div>
      <div className="restriction-banner-text">
        <strong>Service Booking Restricted ({daysLeft} days left)</strong>
        <span>{user.restrictionReason || "You have taken too many services without offering any."} Offer a service to lift this restriction immediately.</span>
      </div>
    </div>
  );
}

export function TrustScoreBadge({ score, label = true }) {
  const num = score || 100;
  const cls = num >= 80 ? "trust-score-high" : num >= 50 ? "trust-score-mid" : "trust-score-low";
  return (
    <div className={\`trust-score-wrap \${cls}\`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      {num}% {label && "Trust"}
    </div>
  );
}

export function LevelProgressBar({ user }) {
  const [prog, setProg] = useState(null);
  useEffect(() => {
    if (user && user._id) {
      api.fetchLevelProgress(user._id).then(setProg).catch(console.error);
    }
  }, [user]);

  if (!prog) return null;

  return (
    <motion.div 
      className="level-bar-wrap"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="level-bar-header">
        <div className="level-bar-title">
          {LEVEL_CFG[prog.level]?.icon} Level {prog.level}: {prog.levelName}
        </div>
        <div className="level-bar-sub">
          {prog.isMaxLevel ? "Max Level Reached" : `${prog.progressXP} / ${prog.neededXP} XP to Level ${prog.nextLevel}`}
        </div>
      </div>
      <div className="level-track">
        <div className="level-track-bg" />
        <motion.div 
          className="level-track-fill" 
          initial={{ width: 0 }}
          animate={{ width: `${prog.progressPct}%` }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          style={{ background: LEVEL_CFG[prog.level]?.color || "#10b981" }} 
        />
        <div className="level-markers">
          {[1,2,3,4,5].map(lvl => {
            const isReached = lvl <= prog.level;
            const isCurrent = lvl === prog.level;
            return (
              <div key={lvl} className={`level-marker ${isReached ? 'reached' : ''} ${isCurrent ? 'current' : ''}`}>
                {lvl}
                <div className="level-tooltip">
                  <strong>{LEVEL_CFG[lvl]?.name}</strong>
                  Req: {LEVEL_CFG[lvl]?.req} XP{LEVEL_CFG[lvl]?.ratingReq > 0 ? ` & ${LEVEL_CFG[lvl]?.ratingReq}⭐` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!prog.isMaxLevel && (
        <div className="level-progress-text">
          Earn <strong>{prog.neededXP - prog.progressXP} more XP</strong> (completed services) 
          {prog.ratingReq > prog.currentRating && ` and maintain a ${prog.ratingReq}⭐ rating`} to unlock <strong>{prog.nextLevelName}</strong>.
        </div>
      )}
    </motion.div>
  );
}

export function BadgeShowcase({ badges = [] }) {
  return (
    <div className="badge-grid">
      {Object.entries(BADGES).map(([key, def]) => {
        const earned = badges.includes(key);
        return (
          <div key={key} className={`badge-item ${!earned ? 'locked' : ''}`}>
            <div className="badge-icon">{def.icon}</div>
            <div className="badge-name">{def.name}</div>
            <div className="badge-tooltip">
              <strong>{def.name}</strong>
              {def.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SkillTagInput({ skills, onChange }) {
  const [inp, setInp] = useState("");
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && inp.trim()) {
      e.preventDefault();
      const val = inp.trim();
      if (!skills.includes(val) && skills.length < 10) {
        onChange([...skills, val]);
      }
      setInp("");
    } else if (e.key === "Backspace" && !inp && skills.length > 0) {
      onChange(skills.slice(0, -1));
    }
  };
  const removeSkill = (sk) => onChange(skills.filter(s => s !== sk));

  return (
    <div className="skill-tags-wrap">
      {skills.map(sk => (
        <span key={sk} className="skill-tag">
          {sk} <button type="button" className="skill-tag-x" onClick={() => removeSkill(sk)}>×</button>
        </span>
      ))}
      {skills.length < 10 && (
        <input 
          type="text" className="skill-tag-input" 
          placeholder={skills.length === 0 ? "e.g. React, UI Design (press Enter)" : "Add skill..."}
          value={inp} onChange={e => setInp(e.target.value)} onKeyDown={handleKeyDown}
        />
      )}
    </div>
  );
}

export function ProfilePictureUpload({ user, onChange, notify }) {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return notify("Image must be under 2MB", "err");
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="avatar-upload-wrap">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="Avatar" className="avatar-upload-img" />
      ) : (
        <div className="av" style={{ width: 80, height: 80, fontSize: 28, border: "3px solid var(--border-strong)" }}>
          {user.avatar}
        </div>
      )}
      <label className="avatar-upload-overlay">
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        <ClockIcon size={24} /> {/* Placeholder for upload icon */}
      </label>
    </div>
  );
}

export function ReviewsPanel({ serviceId, providerId }) {
  const [reviews, setReviews] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && reviews.length === 0) {
      setLoading(true);
      const req = serviceId ? api.fetchServiceReviews(serviceId) : api.fetchUserReviews(providerId);
      req.then(setReviews).catch(console.error).finally(() => setLoading(false));
    }
  }, [open, serviceId, providerId]);

  if (!open) {
    return (
      <button className="reviews-panel-toggle" onClick={() => setOpen(true)}>
        View Reviews <ClockIcon size={14} /> {/* Using clock as chevron placeholder */}
      </button>
    );
  }

  return (
    <div className="reviews-panel">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h4 style={{ fontSize: 14, fontWeight: "bold", color: "#fff" }}>Reviews</h4>
        <button className="tb-btn" style={{ padding: 0 }} onClick={() => setOpen(false)}>Hide</button>
      </div>
      {loading ? <div className="text-m" style={{ fontSize: 12 }}>Loading reviews...</div> : reviews.length === 0 ? <div className="text-m" style={{ fontSize: 12 }}>No reviews yet.</div> : (
        reviews.map(r => (
          <div key={r._id} className="review-item">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: "bold", color: "#fff" }}>User</span>
                <span className="text-m" style={{ fontSize: 10 }}>{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="review-stars">
                {Array.from({length: 5}).map((_, i) => (
                  <span key={i} style={{ color: i < r.rating ? "#f59e0b" : "#333", fontSize: 12 }}>★</span>
                ))}
              </div>
            </div>
            {r.comment && <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>"{r.comment}"</div>}
          </div>
        ))
      )}
    </div>
  );
}

export function EndorsementButton({ skill, user, currentUser, notify, onEndorse }) {
  const hasEndorsed = user.endorsements?.some(e => e.skill === skill && e.endorserId === currentUser._id);
  const count = user.endorsements?.filter(e => e.skill === skill).length || 0;
  const canEndorse = currentUser._id !== user._id;

  const handleEndorse = async () => {
    if (!canEndorse) return;
    if (hasEndorsed) return notify("You already endorsed this skill", "err");
    try {
      const updated = await api.endorseSkill(user._id, skill, currentUser._id);
      onEndorse(updated);
      notify(\`You endorsed \${user.name} for \${skill}\`, "ok");
    } catch (e) { notify(e.message, "err"); }
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.02)", padding: "4px 6px 4px 10px", borderRadius: 20, border: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>{skill}</span>
      {count > 0 && <span style={{ fontSize: 11, color: "var(--em)", fontWeight: "bold" }}>{count}</span>}
      {canEndorse && (
        <button className={\`endorse-btn \${hasEndorsed ? 'endorsed' : ''}\`} onClick={handleEndorse}>
          {hasEndorsed ? "Endorsed ✓" : "+ Endorse"}
        </button>
      )}
    </div>
  );
}

export function LeaderboardPage({ user, nav }) {
  const [lb, setLb] = useState([]);
  const [period, setPeriod] = useState("all");
  const [load, setLoad] = useState(true);

  useEffect(() => {
    setLoad(true);
    api.fetchLeaderboard(period).then(setLb).catch(console.error).finally(() => setLoad(false));
  }, [period]);

  return (
    <div className="inner" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="btwn" style={{ marginBottom: 30 }}>
        <div className="ph" style={{ margin: 0 }}>
          <h1>Top Providers 🏆</h1>
          <p>The most active and highly rated community members.</p>
        </div>
        <div className="tab-bar" style={{ margin: 0, border: "none" }}>
          <button className={\`tb-btn \${period === 'all' ? 'on' : ''}\`} onClick={() => setPeriod("all")}>All Time</button>
          <button className={\`tb-btn \${period === 'monthly' ? 'on' : ''}\`} onClick={() => setPeriod("monthly")}>Monthly</button>
          <button className={\`tb-btn \${period === 'weekly' ? 'on' : ''}\`} onClick={() => setPeriod("weekly")}>Weekly</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {load ? <div className="empty">Loading leaderboard...</div> : lb.length === 0 ? <div className="empty">No active providers found.</div> : (
          lb.map((u, i) => (
            <div key={u._id} className="lb-row">
              <div className={\`lb-rank \${i===0 ? 'lb-rank-1' : i===1 ? 'lb-rank-2' : i===2 ? 'lb-rank-3' : 'lb-rank-n'}\`}>{i + 1}</div>
              {u.avatarUrl ? <img src={u.avatarUrl} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} /> : <div className="av" style={{ width: 44, height: 44, fontSize: 16 }}>{u.avatar}</div>}
              <div className="lb-info">
                <div className="lb-name">{u.name} <span style={{ fontSize: 11, color: LEVEL_CFG[u.level]?.color, marginLeft: 8 }}>{LEVEL_CFG[u.level]?.name}</span></div>
                <div className="lb-stats">
                  <span>{u.xp} completed</span>
                  <span>{u.rep}⭐ ({u.reviews})</span>
                  <span>{u.trustScore}% Trust</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {u.badges?.slice(0,3).map(b => <span key={b} title={BADGES[b]?.name} style={{ fontSize: 18 }}>{BADGES[b]?.icon}</span>)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function DisputeModal({ booking, user, close, notify }) {
  const [reason, setReason] = useState("");
  const isProvider = booking.providerId === user._id;
  const againstId = isProvider ? booking.requesterId : booking.providerId;

  const submit = async () => {
    if (!reason) return notify("Reason is required", "err");
    try {
      await api.createDispute({
        bookingId: booking._id,
        raisedBy: user._id,
        againstUser: againstId,
        reason
      });
      notify("Dispute raised. Admin will review.", "ok");
      close();
    } catch (e) { notify(e.message, "err"); }
  };

  return (
    <div className="mo">
      <motion.div className="mo-box" initial="hidden" animate="visible" variants={scaleUp}>
        <h2 className="mo-t">Raise a Dispute</h2>
        <p className="auth-sub">If there was an issue with this service, you can raise a dispute for admin mediation.</p>
        <div className="field">
          <label>Reason for Dispute</label>
          <textarea className="fi" rows={4} placeholder="Describe what went wrong..." value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button className="btn btn-s" onClick={close} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-d" onClick={submit} style={{ flex: 1 }}>Submit Dispute</button>
        </div>
      </motion.div>
    </div>
  );
}

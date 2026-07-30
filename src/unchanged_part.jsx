export function ClockIcon({ size = 16, color = "currentColor" }

export function ChainIcon({ size = 16, color = "currentColor" }

export function AicteIcon({ size = 16, color = "currentColor" }

export function ChatIcon({ size = 16, color = "currentColor" }

export function BookingIcon({ size = 16, color = "currentColor" }

export function SosIcon({ size = 16, color = "currentColor" }

export function LockIcon({ size = 16, color = "currentColor" }

export function StarIcon({ size = 16, color = "currentColor", fill = "none" }

function NotifStack({ notifs }

export function BlockchainBg({ isBlurred }

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
            <span className="tag tg" style={{ padding: "6px 14px" }}>On-Chain Session Confirmed Â· Block #4562015 mined âœ“</span>
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
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>VTU VT4812 Â· Student Submission</span>
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
      title: "Reputation & Safety Shield",
      icon: <SosIcon size={16} color="var(--red)" />,
      desc: "Verified student trust indexes, double review loops, and emergency SOS safeguard options.",
      mockup: (
        <div>
          <div className="row mb2" style={{ background: "rgba(16, 185, 129, 0.03)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: 12, padding: "12px 18px", gap: 14 }}>
            <div className="av" style={{ background: "var(--em)", color: "var(--bg)", fontSize: 14, width: 44, height: 44 }}>98%</div>
            <div>
              <strong style={{ display: "block", color: "#fff", fontSize: 13 }}>Trust & Safety Verification</strong>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Highly Rated Member Â· 12 successful reviews</span>
            </div>
          </div>
          <div className="row mb2" style={{ background: "rgba(239, 68, 68, 0.03)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: 12, padding: "12px 18px", gap: 14 }}>
            <div className="av" style={{ background: "var(--red)", color: "#fff", fontSize: 14, width: 44, height: 44 }}>ðŸ†˜</div>
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

export function CreditTimelineChart({ txs, userId }

export function EarnedSpentGauge({ user }

function Landing({ nav }

function Auth({ doLogin, doRegister, doAdminLogin, clockAngle }

function Wallet({ user, wallet, notify, connectWallet }

function AICTEPage({ user, notify, setModal, refreshUser }

export function ImageSlider({ images }

export function SosModal({ emergency, close, notify }

export function NewChatModal({ user, users, close, load, setActiveChat, notify }

export function AddContactModal({ user, close, notify, setEmergency }

export function EditProfileModal({ user, refreshUser, close, notify }

export function SubmitAicteModal({ user, close, notify, load }

export function OfferSkillModal({ user, skills, close, notify, load, loadSkills }



// â”€â”€â”€ NEW COMPONENTS (Gamification, Reviews, Notifications, etc) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
                    <div className="notif-item-icon">{NOTIF_ICONS[n.type] || "ðŸ””"}</div>
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
        <h2 className="mo-t" style={{ fontSize: 28, marginBottom: 8 }}>Welcome to TimeBank! ðŸŽ‰</h2>
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
        <h2 className="mo-t" style={{ fontSize: 26, marginBottom: 8 }}>Service Completed! âœ…</h2>
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
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>âš–ï¸</div>
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
      <div className="restriction-banner-icon">ðŸš«</div>
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
    <div className="level-bar-wrap">
      <div className="level-bar-header">
        <div className="level-bar-title">
          {LEVEL_CFG[prog.level]?.icon} Level {prog.level}: {prog.levelName}
        </div>
        <div className="level-bar-sub">
          {prog.isMaxLevel ? "Max Level Reached" : \`\${prog.progressXP} / \${prog.neededXP} XP to Level \${prog.nextLevel}\`}
        </div>
      </div>
      <div className="level-track">
        <div className="level-track-bg" />
        <div className="level-track-fill" style={{ width: \`\${prog.progressPct}%\`, background: LEVEL_CFG[prog.level]?.color || "#10b981" }} />
        <div className="level-markers">
          {[1,2,3,4,5].map(lvl => {
            const isReached = lvl <= prog.level;
            const isCurrent = lvl === prog.level;
            return (
              <div key={lvl} className={\`level-marker \${isReached ? 'reached' : ''} \${isCurrent ? 'current' : ''}\`}>
                {lvl}
                <div className="level-tooltip">
                  <strong>{LEVEL_CFG[lvl]?.name}</strong>
                  Req: {LEVEL_CFG[lvl]?.req} XP{LEVEL_CFG[lvl]?.ratingReq > 0 ? \` & \${LEVEL_CFG[lvl]?.ratingReq}â­\` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!prog.isMaxLevel && (
        <div className="level-progress-text">
          Earn <strong>{prog.neededXP - prog.progressXP} more XP</strong> (completed services) 
          {prog.ratingReq > prog.currentRating && \` and maintain a \${prog.ratingReq}â­ rating\`} to unlock <strong>{prog.nextLevelName}</strong>.
        </div>
      )}
    </div>
  );
}

export function BadgeShowcase({ badges = [] }) {
  return (
    <div className="badge-grid">
      {Object.entries(BADGES).map(([key, def]) => {
        const earned = badges.includes(key);
        return (
          <div key={key} className={\`badge-item \${!earned ? 'locked' : ''}\`}>
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
          {sk} <button type="button" className="skill-tag-x" onClick={() => removeSkill(sk)}>Ã—</button>
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
                  <span key={i} style={{ color: i < r.rating ? "#f59e0b" : "#333", fontSize: 12 }}>â˜…</span>
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
          {hasEndorsed ? "Endorsed âœ“" : "+ Endorse"}
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
          <h1>Top Providers ðŸ†</h1>
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
                  <span>{u.rep}â­ ({u.reviews})</span>
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


// â”€â”€â”€ MODIFIED COMPONENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      <div className="nav-logo" onClick={() => setPage("dashboard")}>
        <ClockIcon color="#10b981" /> Time<span>Bank</span>
      </div>
      <button className={\`nl \${pg === "dashboard" ? "act" : ""}\`} onClick={() => setPage("dashboard")}>Home</button>
      <button className={\`nl \${pg === "services" ? "act" : ""}\`} onClick={() => setPage("services")}>Explore</button>
      <button className={\`nl \${pg === "bookings" ? "act" : ""}\`} onClick={() => setPage("bookings")}>Bookings</button>
      <button className={\`nl \${pg === "chat" ? "act" : ""}\`} onClick={() => setPage("chat")}>Messages</button>
      <button className={\`nl \${pg === "aicte" ? "act" : ""}\`} onClick={() => setPage("aicte")}>AICTE</button>
      <button className={\`nl \${pg === "leaderboard" ? "act" : ""}\`} onClick={() => setPage("leaderboard")}>Leaderboard</button>
      {user?.role === "admin" && <button className={\`nl \${pg === "admin" ? "act" : ""}\`} onClick={() => setPage("admin")}>Admin</button>}
      
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
        <div className="nav-badge">{user?.credits || 0} C</div>
        {user && <NotificationCenter notifications={notifs} markRead={markRead} markAllRead={markAllRead} />}
        <div className="nav-av" onClick={() => setPage("profile")}>
          {user?.avatarUrl ? <img src={user.avatarUrl} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : user?.avatar}
        </div>
      </div>
    </nav>
  );
}

export function Dashboard({ user, wallet, notify, nav, connectWallet, setModal }) {
  const [em, setEm] = useState([]);
  useEffect(() => {
    if (user?._id) api.fetchEmergencyContacts(user._id).then(setEm).catch(console.error);
  }, [user]);

  const freeloaderStat = checkFreeloaderLocal(user);

  return (
    <motion.div className="inner" initial="hidden" animate="visible" variants={scaleUp}>
      <RestrictionBanner user={user} />
      {freeloaderStat.warned && !freeloaderStat.restricted && (
        <div className="restriction-banner" style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
          <div className="restriction-banner-icon">âš–ï¸</div>
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
          <div className="stat-s">{user?.rep || 0}â­ Rating</div>
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
          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ flex: 1 }}><EarnedSpentGauge earned={user?.earned || 0} spent={user?.spent || 0} /></div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
              <div><div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Total Earned</div><div style={{ fontSize: 20, color: "var(--em)", fontWeight: 800 }}>{user?.earned || 0} C</div></div>
              <div><div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Total Spent</div><div style={{ fontSize: 20, color: "var(--red)", fontWeight: 800 }}>{user?.spent || 0} C</div></div>
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


export function Services({ user, skills, notify, nav, getU, getSk, setModal, refreshUser, loadSkills }) {
  const [svcs, setSvcs] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const load = useCallback(() => { api.fetchServices().then(setSvcs).catch(e => notify(e.message, "err")); }, [notify]);
  useEffect(() => { load(); }, [load]);

  const cats = ["All", ...new Set(skills.map(s => s.category))];
  const filtered = svcs.filter(s => {
    if (s.status !== "active") return false;
    const mQ = s.title.toLowerCase().includes(q.toLowerCase()) || s.description.toLowerCase().includes(q.toLowerCase());
    const mC = cat === "All" || getSk(s.skillId)?.category === cat;
    return mQ && mC;
  });

  return (
    <motion.div className="inner" initial="hidden" animate="visible" variants={scaleUp}>
      <div className="ph">
        <h1>Explore Services</h1>
        <p>Find skills to learn or services to book with your credits.</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input type="text" className="search-fi" placeholder="Search services..." value={q} onChange={e => setQ(e.target.value)} />
        <select className="fi" style={{ width: "auto" }} value={cat} onChange={e => setCat(e.target.value)}>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-p" onClick={() => setModal(<OfferSkillModal user={user} skills={skills} close={() => setModal(null)} notify={notify} load={load} loadSkills={loadSkills} />)}>
          + Offer a Skill
        </button>
      </div>

      {filtered.length === 0 ? <div className="empty">No services found.</div> : (
        <div className="g3">
          {filtered.map(s => {
            const p = getU(s.providerId);
            const sk = getSk(s.skillId);
            return (
              <div key={s._id} className="svc-card" onClick={() => setModal(<ServiceDetailModal user={user} svc={s} prov={p} sk={sk} own={p?._id === user?._id} close={() => setModal(null)} notify={notify} nav={nav} refreshUser={refreshUser} />)}>
                {s.images && s.images.length > 0 && (
                  <div style={{ height: 120, borderRadius: 8, background: "#1a1f2e", marginBottom: 12, overflow: "hidden" }}>
                    <img src={s.images[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span className="tag tg">{sk?.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{s.hours} C</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.3 }}>{s.title}</div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                  {p?.avatarUrl ? <img src={p.avatarUrl} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} /> : <div className="av" style={{ width: 24, height: 24, fontSize: 10 }}>{p?.avatar}</div>}
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <span style={{ color: "#fff", fontWeight: 600 }}>{p?.name?.split(" ")[0]}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <span className="star">â˜…</span> {p?.rep || 0} <span className="text-m">({p?.reviews || 0})</span>
                      <span className="text-m">â€¢</span>
                      <span className="text-m">{p?.xp || 0} done</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export function ServiceDetailModal({ user, svc, prov, sk, own, close, notify, nav, refreshUser }) {
  const handleBook = async () => {
    try {
      if (user.restrictionUntil && new Date(user.restrictionUntil) > new Date()) {
        const daysLeft = Math.ceil((new Date(user.restrictionUntil) - new Date()) / (1000 * 60 * 60 * 24));
        notify(\`You are restricted from taking services for \${daysLeft} more day(s). Offer a service to lift this.\`, "err");
        return;
      }
      if (user.credits < svc.hours) return notify("Insufficient credits", "err");
      
      await api.createBooking({ serviceId: svc._id, providerId: prov._id, requesterId: user._id, scheduledStart: new Date(Date.now() + 86400000).toISOString(), hours: svc.hours });
      notify("Booking requested! Credits held in escrow.", "ok");
      refreshUser();
      close();
      nav("bookings");
    } catch (e) { notify(e.message, "err"); }
  };

  const handleChat = async () => {
    try {
      await api.createChat([user._id, prov._id]);
      close();
      nav("chat");
    } catch (e) { notify(e.message, "err"); }
  };

  return (
    <div className="mo">
      <motion.div className="mo-box" initial="hidden" animate="visible" variants={scaleUp}>
        <div className="btwn" style={{ marginBottom: 12 }}>
          <span className="tag tg">{sk?.name}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--em)" }}>{svc.hours} C</span>
        </div>
        <h2 className="mo-t" style={{ fontSize: 22, marginBottom: 8 }}>{svc.title}</h2>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>{svc.description}</div>
        
        {svc.images?.length > 0 && <ImageSlider images={svc.images} />}
        
        <div className="div" />
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {prov?.avatarUrl ? <img src={prov.avatarUrl} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} /> : <div className="av">{prov?.avatar}</div>}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{prov?.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                Lv {prov?.level || 1} <span className="star">â˜…</span> {prov?.rep || 0} ({prov?.reviews || 0})
              </div>
            </div>
          </div>
          {!own && (
            <button className="btn btn-s" onClick={handleChat}>
              <ChatIcon size={16} /> Message
            </button>
          )}
        </div>

        <ReviewsPanel serviceId={svc._id} providerId={prov?._id} />
        
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button className="btn btn-s" onClick={close} style={{ flex: 1 }}>Close</button>
          {!own && <button className="btn btn-p" onClick={handleBook} style={{ flex: 1 }}>Book Service</button>}
        </div>
      </motion.div>
    </div>
  );
}

export function Bookings({ user, notify, getU, getSk, getSvc, setModal, refreshUser }) {
  const [bks, setBks] = useState([]);
  const [tab, setTab] = useState("all");

  const load = useCallback(() => { api.fetchUserBookings(user._id).then(setBks).catch(e => notify(e.message, "err")); }, [user, notify]);
  useEffect(() => { load(); }, [load]);

  const filtered = bks.filter(b => {
    if (tab === "all") return true;
    if (tab === "as_prov") return b.providerId === user._id;
    if (tab === "as_req") return b.requesterId === user._id;
    if (tab === "disputed") return b.status === "disputed";
    return b.status === tab;
  });

  return (
    <motion.div className="inner" initial="hidden" animate="visible" variants={scaleUp}>
      <div className="ph">
        <h1>Your Bookings</h1>
        <p>Manage your requested and offered services.</p>
      </div>

      <div className="tab-bar">
        <button className={\`tb-btn \${tab === 'all' ? 'on' : ''}\`} onClick={() => setTab("all")}>All</button>
        <button className={\`tb-btn \${tab === 'pending' ? 'on' : ''}\`} onClick={() => setTab("pending")}>Pending</button>
        <button className={\`tb-btn \${tab === 'completed' ? 'on' : ''}\`} onClick={() => setTab("completed")}>Completed</button>
        <button className={\`tb-btn \${tab === 'as_prov' ? 'on' : ''}\`} onClick={() => setTab("as_prov")}>As Provider</button>
        <button className={\`tb-btn \${tab === 'as_req' ? 'on' : ''}\`} onClick={() => setTab("as_req")}>As Requester</button>
        <button className={\`tb-btn \${tab === 'disputed' ? 'on' : ''}\`} onClick={() => setTab("disputed")}>Disputes</button>
      </div>

      {filtered.length === 0 ? <div className="empty">No bookings found in this category.</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(b => {
            const isProv = b.providerId === user._id;
            const other = getU(isProv ? b.requesterId : b.providerId);
            const svc = getSvc(b.serviceId);
            const statusColors = { pending: "var(--amber)", confirmed: "var(--blue)", completed: "var(--em)", cancelled: "var(--red)", disputed: "var(--purple)" };
            const sColor = statusColors[b.status] || "#fff";
            
            return (
              <div key={b._id} className="bk-row">
                {other?.avatarUrl ? <img src={other.avatarUrl} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} /> : <div className="av" style={{ width: 44, height: 44, fontSize: 16 }}>{other?.avatar}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span className={\`tag \${isProv ? 'tg' : 'tb'}\`}>{isProv ? "Provider" : "Requester"}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: sColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>{b.status}</span>
                    {b.escrowHeld && <span className="tag ta" style={{ padding: "2px 6px", fontSize: 10 }}>Escrow Held</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{svc?.title || "Unknown Service"}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>With: <span style={{ color: "#fff", fontWeight: 600 }}>{other?.name}</span> â€¢ {b.hours} Credits â€¢ {new Date(b.scheduledStart).toLocaleDateString()}</div>
                  
                  {b.status === "pending" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-sm btn-o" onClick={() => api.updateBooking(b._id, { status: "cancelled" }).then(load).catch(e=>notify(e.message,"err"))}>Cancel</button>
                      <button className="btn btn-sm btn-p" onClick={() => api.confirmCompletion(b._id, user._id).then(res => {
                        if (res.booking?.status === "completed" || res.providerCredits) {
                          refreshUser();
                          setModal(<CompletionCreditModal amount={b.hours} newBalance={isProv ? user.credits + b.hours : user.credits} close={() => { setModal(null); load(); }} />);
                          if (res.levelUp) setModal(<LevelUpModal newLevel={res.providerLevel} close={() => { setModal(null); load(); }} />);
                        } else {
                          notify("Confirmed completion. Waiting for other party.", "ok");
                          load();
                        }
                      }).catch(e=>notify(e.message,"err"))}>
                        {(isProv && b.providerConfirmed) || (!isProv && b.requesterConfirmed) ? "Waiting for other party..." : "Confirm Completion"}
                      </button>
                    </div>
                  )}
                  {b.status === "completed" && (
                    <div style={{ marginTop: 12 }}>
                      <button className="btn btn-sm btn-s" onClick={() => setModal(<ReviewModal booking={b} user={user} other={other} close={() => setModal(null)} notify={notify} refreshUser={refreshUser} />)}>Leave Review</button>
                    </div>
                  )}
                  {(b.status === "pending" || b.status === "confirmed") && (
                    <button className="tb-btn" style={{ fontSize: 11, padding: "4px 0", color: "var(--red)", marginTop: 8 }} onClick={() => setModal(<DisputeModal booking={b} user={user} close={() => setModal(null)} notify={notify} />)}>Report Issue / Dispute</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export function ReviewModal({ booking, user, other, close, notify, refreshUser }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const isProv = booking.providerId === user._id;

  const submit = async () => {
    try {
      await api.createReview({
        reviewerId: user._id, revieweeId: other._id, bookingId: booking._id, serviceId: booking.serviceId, rating, comment,
        direction: isProv ? "provider_to_requester" : "requester_to_provider"
      });
      notify("Review submitted!", "ok");
      refreshUser();
      close();
    } catch (e) { notify(e.message, "err"); }
  };

  return (
    <div className="mo">
      <motion.div className="mo-box" initial="hidden" animate="visible" variants={scaleUp}>
        <h2 className="mo-t">Rate {other?.name}</h2>
        <div style={{ display: "flex", gap: 8, fontSize: 32, marginBottom: 16, cursor: "pointer" }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ color: i <= rating ? "#f59e0b" : "#333" }} onClick={() => setRating(i)}>â˜…</span>
          ))}
        </div>
        <div className="field">
          <label>Comments (Optional)</label>
          <textarea className="fi" rows={3} value={comment} onChange={e => setComment(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button className="btn btn-s" onClick={close} style={{ flex: 1 }}>Skip</button>
          <button className="btn btn-p" onClick={submit} style={{ flex: 1 }}>Submit</button>
        </div>
      </motion.div>
    </div>
  );
}


export function Profile({ user, wallet, notify, setModal, refreshUser, connectWallet, doLogout }) {
  const [load, setLoad] = useState(false);
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [loc, setLoc] = useState(user?.location || "");
  const [lang, setLang] = useState(user?.languages?.join(", ") || "");
  const [avail, setAvail] = useState(user?.availability || "offline");
  const [skills, setSkills] = useState(user?.skills || []);

  const save = async () => {
    setLoad(true);
    try {
      await api.updateUser(user._id, {
        phone, bio, location: loc, languages: lang.split(",").map(l=>l.trim()).filter(Boolean),
        availability: avail, skills
      });
      notify("Profile updated", "ok");
      refreshUser();
    } catch (e) { notify(e.message, "err"); }
    setLoad(false);
  };

  const uploadAvatarLocal = async (base64) => {
    try {
      await api.uploadAvatar(user._id, base64);
      notify("Profile picture updated", "ok");
      refreshUser();
    } catch (e) { notify(e.message, "err"); }
  };

  return (
    <motion.div className="inner" style={{ maxWidth: 800, margin: "0 auto" }} initial="hidden" animate="visible" variants={scaleUp}>
      <div className="profile-section" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <ProfilePictureUpload user={user} onChange={uploadAvatarLocal} notify={notify} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{user?.name}</h2>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>{user?.email} â€¢ Joined {new Date(user?.createdAt).getFullYear()}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="tag tg">Level {user?.level || 1}</span>
            <span className="tag tp">{user?.rep || 0}â­ Rating</span>
            {user?.phoneVerified && <span className="tag tb">Verified âœ…</span>}
          </div>
        </div>
        <button className="btn btn-o btn-sm" onClick={doLogout}>Logout</button>
      </div>

      <div className="profile-section">
        <div className="profile-section-title">Gamification & Badges</div>
        <LevelProgressBar user={user} />
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Earned Badges</div>
          <BadgeShowcase badges={user?.badges} />
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-title">Invite Friends</div>
        <p className="auth-sub" style={{ textAlign: "left", fontSize: 13, marginTop: -4 }}>Share your referral code. When a friend signs up and completes their first service, you both get 5 bonus credits!</p>
        <div className="referral-code">{user?.referralCode}</div>
      </div>

      <div className="profile-section">
        <div className="profile-section-title">Personal Info</div>
        <div className="g2" style={{ marginBottom: 0 }}>
          <div className="field">
            <label>Phone Number</label>
            <input type="text" className="fi" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
          </div>
          <div className="field">
            <label>Location</label>
            <input type="text" className="fi" value={loc} onChange={e => setLoc(e.target.value)} placeholder="City, Country" />
          </div>
          <div className="field">
            <label>Languages</label>
            <input type="text" className="fi" value={lang} onChange={e => setLang(e.target.value)} placeholder="English, Spanish" />
          </div>
          <div className="field">
            <label>Availability</label>
            <select className="fi" value={avail} onChange={e => setAvail(e.target.value)}>
              <option value="offline">Offline / Busy</option>
              <option value="available">Available for Bookings</option>
              <option value="online">Online Now</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Skills & Endorsements</label>
          <SkillTagInput skills={skills} onChange={setSkills} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {skills.map(sk => <EndorsementButton key={sk} skill={sk} user={user} currentUser={user} notify={notify} onEndorse={() => {}} />)}
          </div>
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label>Bio</label>
          <textarea className="fi" rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell others about yourself..." />
        </div>
        <button className="btn btn-p" onClick={save} disabled={load}>{load ? "Saving..." : "Save Profile"}</button>
      </div>
    </motion.div>
  );
}

export function ChatPage({ user, users, notify, setModal }) {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [text, setText] = useState("");
  const [load, setLoad] = useState(true);
  const [typing, setTyping] = useState({}); // { chatId: true/false }
  const msgsEndRef = useRef(null);
  const socket = getSocket(user?._id);

  const loadData = useCallback(() => {
    api.fetchUserChats(user._id).then(setChats).catch(e => notify(e.message, "err")).finally(() => setLoad(false));
  }, [user, notify]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!socket) return;
    const onNewMsg = ({ chatId, senderId, text: msgText, createdAt }) => {
      setChats(prev => {
        const next = [...prev];
        const idx = next.findIndex(c => c._id === chatId);
        if (idx !== -1) {
          next[idx].messages.push({ senderId, text: msgText, createdAt });
          next[idx].updatedAt = createdAt;
          next.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          // If active chat, mark read immediately via socket/api
          if (active?._id === chatId) api.markChatRead(chatId, user._id);
        } else {
          loadData();
        }
        return next;
      });
    };
    const onTyping = ({ chatId, userId, isTyping }) => {
      setTyping(prev => ({ ...prev, [chatId]: isTyping }));
    };

    socket.on("new_message", onNewMsg);
    socket.on("user_typing", onTyping);
    return () => {
      socket.off("new_message", onNewMsg);
      socket.off("user_typing", onTyping);
    };
  }, [socket, active, user, loadData]);

  useEffect(() => {
    if (active) {
      msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      api.markChatRead(active._id, user._id).then(() => {
        setChats(prev => prev.map(c => {
          if (c._id !== active._id) return c;
          return { ...c, messages: c.messages.map(m => m.senderId !== user._id && !m.readAt ? { ...m, readAt: new Date() } : m) };
        }));
      }).catch(console.error);
    }
  }, [active, user]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    const msg = text.trim();
    setText("");
    // Local optimistic update
    setChats(prev => prev.map(c => c._id === active._id ? { ...c, messages: [...c.messages, { senderId: user._id, text: msg, createdAt: new Date() }] } : c));
    
    // Send via socket
    const otherId = active.participants.find(p => p !== user._id);
    socket.emit("send_message", { chatId: active._id, senderId: user._id, recipientId: otherId, text: msg });
    
    // Save to DB
    try {
      await api.sendMessage(active._id, user._id, msg);
    } catch (e) { notify(e.message, "err"); }
  };

  let typeTimeout;
  const handleTyping = (e) => {
    setText(e.target.value);
    const otherId = active?.participants.find(p => p !== user._id);
    if (!active || !otherId) return;
    socket.emit("typing", { chatId: active._id, recipientId: otherId, isTyping: true });
    clearTimeout(typeTimeout);
    typeTimeout = setTimeout(() => {
      socket.emit("typing", { chatId: active._id, recipientId: otherId, isTyping: false });
    }, 1500);
  };

  return (
    <motion.div className="inner" style={{ maxWidth: 1000, margin: "0 auto" }} initial="hidden" animate="visible" variants={scaleUp}>
      <div className="btwn" style={{ marginBottom: 20 }}>
        <h1 className="ph" style={{ margin: 0 }}>Messages</h1>
        <button className="btn btn-p" onClick={() => setModal(<NewChatModal user={user} users={users} load={loadData} setActiveChat={setActive} notify={notify} close={() => setModal(null)} />)}>New Chat</button>
      </div>

      <div style={{ display: "flex", height: 500, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
        {/* Sidebar */}
        <div style={{ width: 280, borderRight: "1px solid var(--border)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {load ? <div className="empty">Loading...</div> : chats.length === 0 ? <div className="empty" style={{ padding: "2rem 1rem" }}>No chats yet.</div> : (
            chats.map(c => {
              const otherId = c.participants.find(p => p !== user._id);
              const other = users.find(u => u._id === otherId);
              const last = c.messages[c.messages.length - 1];
              const unread = c.messages.filter(m => m.senderId !== user._id && !m.readAt).length;
              return (
                <div key={c._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", background: active?._id === c._id ? "rgba(255,255,255,0.04)" : "none", borderBottom: "1px solid var(--border)" }} onClick={() => setActive(c)}>
                  {other?.avatarUrl ? <img src={other.avatarUrl} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} /> : <div className="av" style={{ width: 36, height: 36, fontSize: 13 }}>{other?.avatar}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", justifyContent: "space-between" }}>
                      {other?.name}
                      {unread > 0 && <span style={{ background: "var(--em)", color: "var(--bg)", fontSize: 10, padding: "2px 6px", borderRadius: 10 }}>{unread}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: unread > 0 ? "#fff" : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{typing[c._id] ? <span style={{ color: "var(--em)", fontStyle: "italic" }}>typing...</span> : last?.text || "New chat"}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {active ? (
            <>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.2)" }}>
                {(() => {
                  const otherId = active.participants.find(p => p !== user._id);
                  const other = users.find(u => u._id === otherId);
                  return (
                    <>
                      {other?.avatarUrl ? <img src={other.avatarUrl} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} /> : <div className="av" style={{ width: 32, height: 32, fontSize: 12 }}>{other?.avatar}</div>}
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{other?.name}</div>
                    </>
                  );
                })()}
              </div>
              <div className="chat-msgs" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                {active.messages.map((m, i) => {
                  const isMe = m.senderId === user._id;
                  return (
                    <div key={i} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "70%", marginBottom: 12 }}>
                      <div className={\`bbl \${isMe ? "bbl-m" : "bbl-t"}\`} style={{ maxWidth: "100%" }}>{m.text}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, textAlign: isMe ? "right" : "left" }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {isMe && m.readAt && <span style={{ color: "var(--em)", marginLeft: 6 }}>âœ“âœ“</span>}
                      </div>
                    </div>
                  );
                })}
                {typing[active._id] && (
                  <div className="typing-indicator" style={{ alignSelf: "flex-start" }}>
                    <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                  </div>
                )}
                <div ref={msgsEndRef} />
              </div>
              <form className="chat-inp" onSubmit={send}>
                <input type="text" placeholder="Type a message..." value={text} onChange={handleTyping} />
                <button type="submit" className="btn btn-p" style={{ width: "auto" }}>Send</button>
              </form>
            </>
          ) : (
            <div className="empty" style={{ margin: "auto" }}>Select a conversation to start messaging.</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Admin({ user, notify }) {
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("overview"); // overview, restrictions, disputes
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    if (user?.role === "admin") {
      api.fetchAdminStats().then(setStats).catch(console.error);
      api.fetchUsers().then(setUsers).catch(console.error);
      api.fetchDisputes().then(setDisputes).catch(console.error);
    }
  }, [user]);

  if (user?.role !== "admin") return <div className="inner"><div className="empty">Unauthorized</div></div>;

  const restrict = async (uId, action, days) => {
    try {
      await api.adminUpdateRestriction(uId, { action, days, reason: "Admin applied" });
      notify("Restriction updated", "ok");
      api.fetchUsers().then(setUsers);
    } catch(e) { notify(e.message, "err"); }
  };

  const resolveDisputeLocal = async (dId, resolution, action) => {
    try {
      await api.resolveDispute(dId, { resolution, action, resolvedBy: user._id });
      notify("Dispute resolved", "ok");
      api.fetchDisputes().then(setDisputes);
    } catch(e) { notify(e.message, "err"); }
  };

  return (
    <motion.div className="inner" initial="hidden" animate="visible" variants={scaleUp}>
      <div className="ph"><h1>Admin Panel</h1><p>Platform monitoring and moderation.</p></div>
      
      <div className="tab-bar">
        <button className={\`tb-btn \${tab==='overview'?'on':''}\`} onClick={()=>setTab("overview")}>Overview</button>
        <button className={\`tb-btn \${tab==='restrictions'?'on':''}\`} onClick={()=>setTab("restrictions")}>User Restrictions</button>
        <button className={\`tb-btn \${tab==='disputes'?'on':''}\`} onClick={()=>setTab("disputes")}>Disputes ({disputes.filter(d=>d.status==="open").length})</button>
      </div>

      {tab === "overview" && (
        <div className="g3">
          <div className="stat"><div className="stat-l">Users</div><div className="stat-v">{stats?.users || 0}</div></div>
          <div className="stat"><div className="stat-l">Services</div><div className="stat-v">{stats?.services || 0}</div></div>
          <div className="stat"><div className="stat-l">Bookings</div><div className="stat-v">{stats?.bookings || 0}</div></div>
          <div className="stat"><div className="stat-l">Transactions</div><div className="stat-v">{stats?.transactions || 0}</div></div>
          <div className="stat"><div className="stat-l">Restricted Users</div><div className="stat-v text-r">{stats?.restrictedUsers || 0}</div></div>
          <div className="stat"><div className="stat-l">Open Disputes</div><div className="stat-v text-a">{stats?.openDisputes || 0}</div></div>
        </div>
      )}

      {tab === "restrictions" && (
        <div className="card">
          <table style={{ width: "100%", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "10px 0" }}>User</th>
                <th>Level</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "12px 0", color: "#fff" }}>{u.name}</td>
                  <td>{u.level}</td>
                  <td>
                    {u.restrictionUntil && new Date(u.restrictionUntil) > new Date() ? (
                      <span className="text-r">Restricted until {new Date(u.restrictionUntil).toLocaleDateString()}</span>
                    ) : <span className="text-g">Active</span>}
                  </td>
                  <td>
                    {u.restrictionUntil && new Date(u.restrictionUntil) > new Date() ? (
                      <button className="btn btn-sm btn-s" onClick={() => restrict(u._id, "lift")}>Lift</button>
                    ) : (
                      <button className="btn btn-sm btn-o" onClick={() => restrict(u._id, "apply", 3)}>Restrict 3d</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "disputes" && (
        <div className="card">
          {disputes.filter(d=>d.status==="open").length === 0 ? <div className="empty">No open disputes.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {disputes.filter(d=>d.status==="open").map(d => (
                <div key={d._id} className="bk-row" style={{ flexDirection: "column" }}>
                  <div className="btwn" style={{ width: "100%", marginBottom: 8 }}>
                    <span className="tag ta">Open Dispute</span>
                    <span className="text-m" style={{ fontSize: 11 }}>{new Date(d.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 14, color: "#fff", marginBottom: 12 }}><strong>Reason:</strong> {d.reason}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-sm btn-p" onClick={() => resolveDisputeLocal(d._id, "Refunded requester", "refund")}>Refund Requester</button>
                    <button className="btn btn-sm btn-s" onClick={() => resolveDisputeLocal(d._id, "Forced completion", "complete")}>Force Complete</button>
                    <button className="btn btn-sm btn-o" onClick={() => api.dismissDispute(d._id, { reason: "Invalid dispute", resolvedBy: user._id }).then(() => { notify("Dismissed", "ok"); api.fetchDisputes().then(setDisputes); })}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}


export default function App() {
  const [pg, setPage] = useState("landing");
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState("");
  const [modal, setModal] = useState(null);
  const [skills, setSkills] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifs, setNotifs] = useState([]); // In-app toasts

  const notify = useCallback((msg, type = "info") => {
    const id = Date.now();
    setNotifs(p => [...p, { id, msg, type }]);
    setTimeout(() => setNotifs(p => p.filter(n => n.id !== id)), 4000);
  }, []);

  const loadSkills = useCallback(() => {
    api.fetchSkills().then(setSkills).catch(e => console.error("Skills:", e));
  }, []);

  const loadUsers = useCallback(() => {
    if (user) api.fetchUsers().then(setUsers).catch(e => console.error("Users:", e));
  }, [user]);

  const refreshUser = useCallback(() => {
    if (user?._id) {
      api.fetchUser(user._id).then(u => {
        setUser(u);
        if (u.welcomeBonusReceived && !u.welcomeShown) {
          setModal(<WelcomeModal close={() => {
            setModal(null);
            api.markWelcomeShown(u._id).then(() => setUser(prev => ({...prev, welcomeShown: true})));
          }} credits={u.credits} />);
        }
      }).catch(console.error);
    }
  }, [user?._id]);

  useEffect(() => {
    loadSkills();
    const local = localStorage.getItem("tb_user");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        setUser(parsed);
        setPage("dashboard");
      } catch(e){}
    }
  }, [loadSkills]);

  useEffect(() => {
    if (user) {
      loadUsers();
      refreshUser();
      localStorage.setItem("tb_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("tb_user");
    }
  }, [user?._id, loadUsers]); // intentionally excluding user full object to avoid loop

  const getU = useCallback((id) => users.find(u => u._id === id), [users]);
  const getSk = useCallback((id) => skills.find(s => s._id === id), [skills]);

  // A tiny dummy getSvc since services aren't globally stored in this monolith pattern (they are fetched in components), 
  // but Bookings needs titles. In a real app we'd fetch them or populate them. For this demo we'll use a hack if needed.
  // We'll rely on the backend population which we assumed, or we can just show "Service" if it's missing.
  // Actually, wait, the backend `fetchUserBookings` doesn't populate serviceId. I should update that in routes.js later or Bookings component.
  // But for now, we'll just mock it.
  const [allSvcs, setAllSvcs] = useState([]);
  useEffect(() => {
    if (user) api.fetchServices().then(setAllSvcs).catch(console.error);
  }, [user]);
  const getSvc = useCallback((id) => allSvcs.find(s => s._id === id), [allSvcs]);

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") return notify("MetaMask not installed", "err");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWallet(accounts[0]);
      notify("Wallet Connected", "ok");
    } catch (e) { notify(e.message, "err"); }
  };

  const doLogin = async (e, p) => {
    try {
      const u = await api.login(e, p);
      setUser(u); setPage("dashboard"); notify("Logged in!", "ok");
    } catch (err) { notify(err.message, "err"); throw err; }
  };
  
  const doRegister = async (n, e, p, b, w, r) => {
    try {
      const u = await api.register(n, e, p, b, w, r);
      setUser(u); setPage("dashboard"); notify("Registered!", "ok");
    } catch (err) { notify(err.message, "err"); throw err; }
  };

  const doLogout = () => {
    setUser(null); setWallet(""); setPage("landing"); notify("Logged out");
  };

  return (
    <>
      <div className="bg">
        <BlockchainBg />
        <div style={{ position: "fixed", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(20, 24, 39, 0.4) 0%, rgba(10, 12, 16, 0.9) 70%)", zIndex: 0 }} />
      </div>

      <div className="app">
        {pg !== "landing" && pg !== "auth" && <Nav pg={pg} setPage={setPage} setModal={setModal} user={user} refreshUser={refreshUser} />}

        <div className="main">
          {pg === "landing" && <Landing setPage={setPage} />}
          {pg === "auth" && <Auth login={doLogin} register={doRegister} setPage={setPage} notify={notify} />}
          {pg === "dashboard" && <Dashboard user={user} wallet={wallet} notify={notify} nav={setPage} connectWallet={connectWallet} setModal={setModal} />}
          {pg === "services" && <Services user={user} skills={skills} notify={notify} nav={setPage} getU={getU} getSk={getSk} setModal={setModal} refreshUser={refreshUser} loadSkills={loadSkills} />}
          {pg === "bookings" && <Bookings user={user} notify={notify} getU={getU} getSk={getSk} getSvc={getSvc} setModal={setModal} refreshUser={refreshUser} />}
          {pg === "profile" && <Profile user={user} wallet={wallet} notify={notify} setModal={setModal} refreshUser={refreshUser} connectWallet={connectWallet} doLogout={doLogout} />}
          {pg === "aicte" && <AICTEPage user={user} notify={notify} setModal={setModal} refreshUser={refreshUser} />}
          {pg === "chat" && <ChatPage user={user} users={users} notify={notify} setModal={setModal} />}
          {pg === "leaderboard" && <LeaderboardPage user={user} nav={setPage} />}
          {pg === "admin" && <Admin user={user} notify={notify} />}
        </div>
      </div>

      <NotifStack notifs={notifs} />

      <AnimatePresence>
        {modal && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target.className === "overlay" && setModal(null)}>
            {isValidElement(modal) ? cloneElement(modal, { close: () => setModal(null) }) : modal}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}



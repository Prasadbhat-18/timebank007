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
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>{user?.email} • Joined {new Date(user?.createdAt).getFullYear()}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="tag tg">Level {user?.level || 1}</span>
            <span className="tag tp">{user?.rep || 0}⭐ Rating</span>
            {user?.phoneVerified && <span className="tag tb">Verified ✅</span>}
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
                        {isMe && m.readAt && <span style={{ color: "var(--em)", marginLeft: 6 }}>✓✓</span>}
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

  const restrict = async (uId, action, days, reason) => {
    try {
      await api.adminUpdateRestriction(uId, { action, days, reason });
      notify("User status updated", "ok");
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
                    {u.isBlocked ? (
                      <span className="text-r" style={{ fontWeight: "bold" }}>🚫 Blocked</span>
                    ) : u.restrictionUntil && new Date(u.restrictionUntil) > new Date() ? (
                      <span className="text-r">Restricted until {new Date(u.restrictionUntil).toLocaleDateString()}</span>
                    ) : <span className="text-g">Active</span>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {u.isBlocked ? (
                        <button className="btn btn-sm btn-s" onClick={() => restrict(u._id, "unblock")}>Unblock</button>
                      ) : (
                        <>
                          {u.restrictionUntil && new Date(u.restrictionUntil) > new Date() ? (
                            <button className="btn btn-sm btn-s" onClick={() => restrict(u._id, "lift")}>Lift</button>
                          ) : (
                            <button className="btn btn-sm btn-o" onClick={() => {
                              const r = window.prompt("Enter restriction reason:", "Frauds or harmful contents");
                              if (r !== null) restrict(u._id, "apply", 3, r);
                            }}>Restrict 3d</button>
                          )}
                          <button className="btn btn-sm btn-d" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={() => {
                            if (window.confirm(`Are you sure you want to block ${u.name}? All their listed services will be removed.`)) {
                              const r = window.prompt("Enter block/suspension reason:", "Frauds or harmful contents");
                              if (r !== null) restrict(u._id, "block", 0, r);
                            }
                          }}>Block</button>
                        </>
                      )}
                    </div>
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

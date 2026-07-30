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
              <div key={s._id} className="svc-card" onClick={() => setModal(<ServiceDetailModal user={user} svc={s} prov={p} sk={sk} own={p?._id === user?._id} close={() => setModal(null)} notify={notify} nav={nav} refreshUser={refreshUser} load={load} />)}>
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
                      <span className="star">★</span> {p?.rep || 0} <span className="text-m">({p?.reviews || 0})</span>
                      <span className="text-m">•</span>
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

export function ServiceDetailModal({ user, svc, prov, sk, own, close, notify, nav, refreshUser, load }) {
  const handleBook = async () => {
    try {
      if (user.restrictionUntil && new Date(user.restrictionUntil) > new Date()) {
        const daysLeft = Math.ceil((new Date(user.restrictionUntil) - new Date()) / (1000 * 60 * 60 * 24));
        notify(`You are restricted from taking services for ${daysLeft} more day(s). Offer a service to lift this.`, "err");
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

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await api.deleteService(svc._id);
      notify("Service deleted successfully", "ok");
      close();
      if (load) load();
      if (refreshUser) refreshUser();
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
                Lv {prov?.level || 1} <span className="star">★</span> {prov?.rep || 0} ({prov?.reviews || 0})
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
          {(own || user?.role === "admin") && (
            <button className="btn btn-d" onClick={handleDelete} style={{ flex: 1, background: "var(--red)", borderColor: "var(--red)" }}>Delete Service</button>
          )}
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
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>With: <span style={{ color: "#fff", fontWeight: 600 }}>{other?.name}</span> • {b.hours} Credits • {new Date(b.scheduledStart).toLocaleDateString()}</div>
                  
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
            <span key={i} style={{ color: i <= rating ? "#f59e0b" : "#333" }} onClick={() => setRating(i)}>★</span>
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


export function WalletCard({ user, wallet, connectWallet }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
      <div>
        <div className="card-t">Wallet & Assets</div>
        <div className="wallet-hero mb2" style={{ margin: 0, padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
          <div className="btwn">
            <span style={{ fontSize: 13, opacity: 0.7 }}>TimeBank Credits</span>
            <span className="tag" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
              {wallet?.isInbuilt ? "Inbuilt Wallet" : "Polygon Amoy"}
            </span>
          </div>
          <div className="wallet-num" style={{ fontSize: "2.25rem", fontWeight: 800, margin: "10px 0", color: "var(--em)" }}>
            {user.credits} C
          </div>
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
            <button className="btn btn-p" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", marginTop: 4, width: "auto", padding: "8px 16px" }} onClick={connectWallet}>
              {chain.isMetaMaskInstalled() ? "Connect MetaMask" : "Connect Inbuilt Wallet"}
            </button>
          )}
        </div>
      </div>
      
      {wallet && parseFloat(wallet.balance) === 0 && (
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <span style={{ fontSize: "16px", color: "var(--amber)", marginTop: "2px" }}>⚠️</span>
          <div style={{ fontSize: "12.5px", lineHeight: "1.4", color: "var(--text-secondary)" }}>
            <strong style={{ color: "#fff", display: "block", marginBottom: "4px" }}>Gas Funding Required</strong>
            Wallet requires POL gas to register transaction logs:
            <a href="https://faucet.polygon.technology/" target="_blank" rel="noreferrer" style={{ color: "var(--em)", fontWeight: "700", display: "inline-block", marginLeft: "6px", textDecoration: "underline" }}>
              Faucet ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function WalletHistoryCard({ user }) {
  const [txs, setTxs] = useState([]);
  const [bcRecords, setBcRecords] = useState([]);

  useEffect(() => {
    if (user?._id) {
      api.fetchUserTransactions(user._id).then(setTxs).catch(() => {});
      api.fetchBlockchainRecords().then(setBcRecords).catch(() => {});
    }
  }, [user]);

  return (
    <>
      <div className="card">
        <div className="card-t">Transaction history</div>
        <div style={{ maxHeight: 220, overflowY: "auto", paddingRight: 6 }}>
          {txs.length === 0 ? <div className="text-m" style={{ fontSize: 13, color: "var(--text-muted)", padding: "1rem 0" }}>No transactions yet</div> : txs.map((tx) => {
            const inc = tx.toId === user._id;
            return (
              <div key={tx._id} className="btwn" style={{ fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className={`tag ${tx.type === "aicte_reward" ? "tp" : tx.type === "initial_credits" ? "tb" : "tg"}`}>
                    {tx.type === "aicte_reward" ? "AICTE" : tx.type === "initial_credits" ? "Starter" : "Transfer"}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{tx.desc}</div>
                    {tx.txHash && <a href={chain.txLink(tx.txHash)} target="_blank" rel="noreferrer" className="chash" style={{ color: "var(--em)", fontSize: 11 }}>tx: {chain.formatAddress(tx.txHash)} ↗</a>}
                  </div>
                </div>
                <span style={{ fontWeight: 800, color: inc ? "var(--em)" : "var(--red)" }}>{inc ? "+" : "-"}{tx.amount}h</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-t">Blockchain ledger</div>
        <div style={{ maxHeight: 220, overflowY: "auto", paddingRight: 6 }}>
          {bcRecords.length === 0 ? (
            <div className="text-m" style={{ fontSize: 13, color: "var(--text-muted)", padding: "1rem 0" }}>No blockchain records yet</div>
          ) : (
            <div className="ledger" style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {bcRecords.map((r) => (
                <div key={r._id} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  [{r.type}] Block #{r.block} | {chain.formatAddress(r.txHash)} | {r.amount} credits | {chain.formatAddress(r.from)} → {chain.formatAddress(r.to)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

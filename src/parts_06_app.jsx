export default function App() {
  const [pg, setPage] = useState("landing");
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState("");
  const [modal, setModal] = useState(null);
  const [skills, setSkills] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifs, setNotifs] = useState([]); // In-app toasts
  const [clockAngle, setClockAngle] = useState({ h: 0, m: 0 });

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
    }
  }, [user?._id, loadUsers]);

  // Synchronize user fields cleanly to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("tb_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("tb_user");
    }
  }, [user]);

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

  const doAdminLogin = async (e, p) => {
    try {
      const u = await api.adminLogin(e, p);
      setUser(u); setPage("admin"); notify("Admin Logged in!", "ok");
    } catch (err) { notify(err.message, "err"); throw err; }
  };

  const doLogout = () => {
    setUser(null); setWallet(""); setPage("landing"); notify("Logged out");
  };

  return (
    <>
      <div className="bg" style={{ pointerEvents: "none" }}>
        {(pg === "landing" || pg === "auth") && <BlockchainBg isBlurred={pg === "auth"} />}
        <div style={{ position: "fixed", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(20, 24, 39, 0.4) 0%, rgba(10, 12, 16, 0.9) 70%)", zIndex: 0, pointerEvents: "none" }} />
      </div>

      <div className="app">
        <Nav pg={pg} setPage={setPage} setModal={setModal} user={user} refreshUser={refreshUser} />

        <div className="main">
          {pg === "landing" && <Landing nav={setPage} />}
          {pg === "auth" && <Auth doLogin={doLogin} doRegister={doRegister} doAdminLogin={doAdminLogin} setPage={setPage} notify={notify} clockAngle={clockAngle} />}
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
            {isValidElement(modal) ? cloneElement(modal, { 
              close: (...args) => {
                if (modal.props.close) modal.props.close(...args);
                setModal(null);
              }
            }) : modal}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

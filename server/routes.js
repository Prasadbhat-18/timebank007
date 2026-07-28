// ─── TimeBank — API Routes ───────────────────────────────────────────────────
import { Router } from "express";
import {
  User, Skill, Service, Booking, Transaction,
  Review, Aicte, Chat, Emergency, Blockchain,
} from "./models.js";

const r = Router();

// ─── AICTE CONFIG (shared with frontend) ─────────────────────────────────────
const AICTE_CFG = {
  workshop:   { pts: 5,  credits: 1, label: "Workshop" },
  hackathon:  { pts: 15, credits: 3, label: "Hackathon" },
  internship: { pts: 25, credits: 5, label: "Internship" },
  fdp:        { pts: 10, credits: 2, label: "FDP / Training" },
  paper:      { pts: 30, credits: 6, label: "Published Paper" },
  course:     { pts: 8,  credits: 2, label: "Online Course" },
};

// ─── SEED DEFAULT SKILLS ─────────────────────────────────────────────────────
const DEFAULT_SKILLS = [
  { name: "Web Development",  category: "Technology" },
  { name: "Machine Learning", category: "Technology" },
  { name: "Data Analysis",    category: "Technology" },
  { name: "Graphic Design",   category: "Design" },
  { name: "Language Tutoring", category: "Education" },
  { name: "Music Lessons",    category: "Arts" },
  { name: "Fitness Training", category: "Health" },
  { name: "Python",           category: "Technology" },
  { name: "DevOps & Cloud",   category: "Technology" },
  { name: "Mobile Dev",       category: "Technology" },
];

export async function seedSkills() {
  const count = await Skill.countDocuments();
  if (count === 0) {
    await Skill.insertMany(DEFAULT_SKILLS);
    console.log("  ✓ Skills seeded");
  }
}

// Seed default admin
export async function seedAdmin() {
  const exists = await User.findOne({ role: "admin" });
  if (!exists) {
    await User.create({
      name: "Admin", email: "admin@timebank.com", password: "admin@123",
      bio: "Platform administrator", avatar: "AD", role: "admin",
      wallet: "", credits: 0, earned: 0, spent: 0, aictePoints: 0, rep: 0, reviews: 0,
    });
    console.log("  ✓ Admin seeded (admin@timebank.com / admin@123)");
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
r.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), password });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, bio } = req.body;
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: "Email already registered" });
    const avatar = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const user = await User.create({
      name, email: email.toLowerCase(), password, bio, avatar,
      role: "user", wallet: "", credits: 2, earned: 0, spent: 0,
      aictePoints: 0, rep: 0, reviews: 0,
    });
    // Record welcome bonus transaction
    await Transaction.create({
      fromId: "SYSTEM", toId: user._id.toString(), bookingId: null,
      amount: 2, type: "initial_credits", desc: "Welcome bonus — 2 starter credits",
      txHash: null, blockNumber: null,
    });
    res.status(201).json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/auth/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), password, role: "admin" });
    if (!user) return res.status(401).json({ error: "Invalid admin credentials" });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── USERS ───────────────────────────────────────────────────────────────────
r.get("/users", async (_req, res) => {
  try { res.json(await User.find()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/users/:id", async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: "User not found" });
    res.json(u);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/users/:id", async (req, res) => {
  try {
    const u = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(u);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SKILLS ──────────────────────────────────────────────────────────────────
r.get("/skills", async (_req, res) => {
  try { res.json(await Skill.find()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SERVICES ────────────────────────────────────────────────────────────────
r.get("/services", async (_req, res) => {
  try { res.json(await Service.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/services", async (req, res) => {
  try { res.status(201).json(await Service.create(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/services/:id", async (req, res) => {
  try { res.json(await Service.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── BOOKINGS ────────────────────────────────────────────────────────────────
r.get("/bookings", async (_req, res) => {
  try { res.json(await Booking.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/bookings/user/:userId", async (req, res) => {
  try {
    const uid = req.params.userId;
    res.json(await Booking.find({ $or: [{ providerId: uid }, { requesterId: uid }] }).sort({ createdAt: -1 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/bookings", async (req, res) => {
  try { res.status(201).json(await Booking.create(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/bookings/:id", async (req, res) => {
  try { res.json(await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Complete booking — handles credit transfer + records
r.post("/bookings/:id/complete", async (req, res) => {
  try {
    const { txHash, blockNumber } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Update booking status
    booking.status = "completed";
    booking.txHash = txHash || null;
    booking.blockNumber = blockNumber || null;
    await booking.save();

    // Transfer credits: requester → provider
    const requester = await User.findById(booking.requesterId);
    const provider = await User.findById(booking.providerId);
    if (requester && provider) {
      requester.credits -= booking.hours;
      requester.spent += booking.hours;
      provider.credits += booking.hours;
      provider.earned += booking.hours;
      await requester.save();
      await provider.save();
    }

    // Record transaction
    await Transaction.create({
      fromId: booking.requesterId.toString(),
      toId: booking.providerId.toString(),
      bookingId: booking._id,
      amount: booking.hours,
      type: "service_completed",
      desc: `Service completed`,
      txHash: txHash || null,
      blockNumber: blockNumber || null,
    });

    // Record blockchain entry if we have tx data
    if (txHash && blockNumber) {
      await Blockchain.create({
        block: blockNumber, txHash,
        from: requester?.wallet || booking.requesterId.toString(),
        to: provider?.wallet || booking.providerId.toString(),
        amount: booking.hours, type: "TRANSFER",
      });
    }

    res.json(booking);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────
r.get("/transactions", async (_req, res) => {
  try { res.json(await Transaction.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/transactions/user/:userId", async (req, res) => {
  try {
    const uid = req.params.userId;
    res.json(await Transaction.find({ $or: [{ fromId: uid }, { toId: uid }] }).sort({ createdAt: -1 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/transactions", async (req, res) => {
  try { res.status(201).json(await Transaction.create(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── REVIEWS ─────────────────────────────────────────────────────────────────
r.get("/reviews", async (_req, res) => {
  try { res.json(await Review.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/reviews/user/:userId", async (req, res) => {
  try { res.json(await Review.find({ revieweeId: req.params.userId }).sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/reviews", async (req, res) => {
  try {
    const review = await Review.create(req.body);
    // Update reviewee's rep
    const allRevs = await Review.find({ revieweeId: req.body.revieweeId });
    const avg = allRevs.reduce((s, rv) => s + rv.rating, 0) / allRevs.length;
    await User.findByIdAndUpdate(req.body.revieweeId, {
      rep: Math.round(avg * 10) / 10,
      reviews: allRevs.length,
    });
    res.status(201).json(review);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── AICTE ───────────────────────────────────────────────────────────────────
r.get("/aicte", async (_req, res) => {
  try { res.json(await Aicte.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/aicte/user/:userId", async (req, res) => {
  try { res.json(await Aicte.find({ userId: req.params.userId }).sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/aicte", async (req, res) => {
  try {
    const { type } = req.body;
    const cfg = AICTE_CFG[type];
    if (!cfg) return res.status(400).json({ error: "Invalid activity type" });
    const activity = await Aicte.create({ ...req.body, pts: cfg.pts, credits: cfg.credits, verified: false });
    res.status(201).json(activity);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin verify AICTE activity
r.post("/aicte/:id/verify", async (req, res) => {
  try {
    const { txHash, blockNumber } = req.body;
    const activity = await Aicte.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    activity.verified = true;
    activity.txHash = txHash || null;
    activity.blockNumber = blockNumber || null;
    await activity.save();

    // Add credits + points to user
    const user = await User.findById(activity.userId);
    if (user) {
      user.credits += activity.credits;
      user.earned += activity.credits;
      user.aictePoints += activity.pts;
      await user.save();
    }

    // Record transaction
    await Transaction.create({
      fromId: "SYSTEM", toId: activity.userId.toString(), bookingId: null,
      amount: activity.credits, type: "aicte_reward",
      desc: `AICTE: ${activity.title}`,
      txHash: txHash || null, blockNumber: blockNumber || null,
    });

    if (txHash && blockNumber) {
      await Blockchain.create({
        block: blockNumber, txHash,
        from: "SYSTEM", to: user?.wallet || activity.userId.toString(),
        amount: activity.credits, type: "MINT",
      });
    }

    res.json(activity);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/aicte/:id/reject", async (req, res) => {
  try {
    await Aicte.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CHATS ───────────────────────────────────────────────────────────────────
r.get("/chats/user/:userId", async (req, res) => {
  try { res.json(await Chat.find({ participants: req.params.userId }).sort({ updatedAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/chats", async (req, res) => {
  try {
    const { participants } = req.body;
    // Check if chat already exists between these two
    let chat = await Chat.findOne({
      participants: { $all: participants, $size: participants.length },
    });
    if (chat) return res.json(chat);
    chat = await Chat.create({ participants, messages: [] });
    res.status(201).json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/chats/:id/message", async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    chat.messages.push(req.body);
    await chat.save();
    res.json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── EMERGENCY ───────────────────────────────────────────────────────────────
r.get("/emergency/user/:userId", async (req, res) => {
  try { res.json(await Emergency.find({ userId: req.params.userId })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/emergency", async (req, res) => {
  try { res.status(201).json(await Emergency.create(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.delete("/emergency/:id", async (req, res) => {
  try { await Emergency.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── BLOCKCHAIN RECORDS ──────────────────────────────────────────────────────
r.get("/blockchain", async (_req, res) => {
  try { res.json(await Blockchain.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/blockchain/user/:wallet", async (req, res) => {
  try {
    const w = req.params.wallet;
    res.json(await Blockchain.find({ $or: [{ from: w }, { to: w }] }).sort({ createdAt: -1 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN STATS ─────────────────────────────────────────────────────────────
r.get("/admin/stats", async (_req, res) => {
  try {
    const [users, services, bookings, transactions, pendingAicte] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Service.countDocuments(),
      Booking.countDocuments(),
      Transaction.countDocuments(),
      Aicte.countDocuments({ verified: false }),
    ]);
    res.json({ users, services, bookings, transactions, pendingAicte });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default r;

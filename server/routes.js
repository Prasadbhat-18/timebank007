// ─── TimeBank — API Routes ───────────────────────────────────────────────────
import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  User, Skill, Service, Booking, Transaction,
  Review, Notification, Dispute, Aicte, Chat, Emergency, Blockchain,
} from "./models.js";

const r = Router();

const JWT_SECRET = process.env.JWT_SECRET || "timebank_super_secret_key";

function generateToken(user) {
  return jwt.sign({ id: user._id, role: user.role, college: user.college }, JWT_SECRET, { expiresIn: "7d" });
}

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, college }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

// ─── AICTE CONFIG ─────────────────────────────────────────────────────────────
const AICTE_CFG = {
  workshop:   { pts: 5,  credits: 1, label: "Workshop" },
  hackathon:  { pts: 15, credits: 3, label: "Hackathon" },
  internship: { pts: 25, credits: 5, label: "Internship" },
  fdp:        { pts: 10, credits: 2, label: "FDP / Training" },
  paper:      { pts: 30, credits: 6, label: "Published Paper" },
  course:     { pts: 8,  credits: 2, label: "Online Course" },
};

// ─── LEVEL CONFIG ─────────────────────────────────────────────────────────────
const LEVEL_CFG = {
  1: { name: "Newcomer",         req: 0,  ratingReq: 0 },
  2: { name: "Contributor",      req: 3,  ratingReq: 0 },
  3: { name: "Skilled",          req: 7,  ratingReq: 4.0 },
  4: { name: "Trusted Provider", req: 15, ratingReq: 4.0 },
  5: { name: "Elite",            req: 30, ratingReq: 4.5 },
};

// ─── BADGE DEFINITIONS ────────────────────────────────────────────────────────
const BADGE_DEFS = {
  first_service:    { name: "First Service",    check: (u) => u.xp >= 1 },
  five_star_streak: { name: "5-Star Streak",    check: (u, revs) => {
    if (revs.length < 5) return false;
    const last5 = revs.slice(0, 5);
    return last5.every(r => r.rating === 5);
  }},
  community_pillar: { name: "Community Pillar", check: (u) => u.xp >= 30 },
  skill_master:     { name: "Skill Master",     check: (u) => {
    if (!u.endorsements || u.endorsements.length === 0) return false;
    const counts = {};
    u.endorsements.forEach(e => { counts[e.skill] = (counts[e.skill] || 0) + 1; });
    return Object.values(counts).some(c => c >= 10);
  }},
  helpful_reviewer: { name: "Helpful Reviewer", check: async (u) => {
    const count = await Review.countDocuments({ reviewerId: u._id });
    return count >= 10;
  }},
  trusted:          { name: "Trusted Provider", check: (u) => u.level >= 4 },
  speed_demon:      { name: "Speed Demon",      check: (u) => u.responseTime > 0 && u.responseTime <= 30 },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function generateReferralCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TB-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateMockTx() {
  const txHash = "0x" + Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  const blockNumber = 45620000 + Math.floor(Math.random() * 9000);
  return { txHash, blockNumber };
}

// Compute the correct level for a user based on XP and rating
function computeLevel(user) {
  let newLevel = 1;
  for (let lvl = 5; lvl >= 2; lvl--) {
    const cfg = LEVEL_CFG[lvl];
    if (user.xp >= cfg.req && (cfg.ratingReq === 0 || (user.rep || 0) >= cfg.ratingReq)) {
      newLevel = lvl;
      break;
    }
  }
  return newLevel;
}

// Compute trust score (0-100)
function computeTrustScore(user) {
  const completionWeight = 0.5;
  const cancellationWeight = 0.3;
  const responseWeight = 0.2;

  const completionScore = Math.min(user.completionRate || 100, 100);
  const totalActions = (user.servicesOffered || 0) + (user.servicesTaken || 0);
  const cancellationScore = totalActions > 0
    ? Math.max(0, 100 - ((user.cancellations || 0) / totalActions) * 100)
    : 100;
  const responseScore = user.responseTime <= 0 ? 100
    : user.responseTime <= 15 ? 100
    : user.responseTime <= 30 ? 85
    : user.responseTime <= 60 ? 70
    : user.responseTime <= 120 ? 50
    : 30;

  return Math.round(
    completionScore * completionWeight +
    cancellationScore * cancellationWeight +
    responseScore * responseWeight
  );
}

// Check freeloader status
function checkFreeloader(user) {
  const taken = user.servicesTaken || 0;
  const offered = user.servicesOffered || 0;

  if (offered > 0) return { warned: false, restricted: false };
  if (taken >= 5 && !user.restrictionUntil) {
    return { warned: true, restricted: true, message: "You've taken 5 services without offering any. Taking new services is temporarily restricted." };
  }
  if (taken >= 3 && !user.freeloaderWarned) {
    return { warned: true, restricted: false, message: "You've taken 3 services without offering any. Please consider offering a service to keep the community balanced." };
  }
  return { warned: false, restricted: false };
}

// Check and award badges
async function checkAndAwardBadges(user) {
  const reviews = await Review.find({ revieweeId: user._id }).sort({ createdAt: -1 });
  const newBadges = [];

  for (const [key, def] of Object.entries(BADGE_DEFS)) {
    if (user.badges && user.badges.includes(key)) continue;
    let earned = false;
    if (key === "helpful_reviewer") {
      earned = await def.check(user);
    } else if (key === "five_star_streak") {
      earned = def.check(user, reviews);
    } else {
      earned = def.check(user);
    }
    if (earned) newBadges.push(key);
  }

  if (newBadges.length > 0) {
    user.badges = [...(user.badges || []), ...newBadges];
    await user.save();

    // Create notifications for each new badge
    for (const badge of newBadges) {
      const def = BADGE_DEFS[badge];
      await Notification.create({
        userId: user._id, type: "badge",
        title: "New Badge Earned! 🏆",
        message: `You earned the "${def.name}" badge!`,
        data: { badge },
      });
    }
  }

  return newBadges;
}

// Create notification helper
async function createNotification(userId, type, title, message, data = {}) {
  return Notification.create({ userId, type, title, message, data });
}

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
  // Migrate old "admin" roles to "websiteAdmin"
  await User.updateMany({ role: "admin" }, { $set: { role: "websiteAdmin" } });

  const exists = await User.findOne({ role: "websiteAdmin" });
  if (!exists) {
    await User.create({
      name: "Super Admin", email: "admin@timebank.com", password: "admin@123",
      bio: "Platform administrator", avatar: "AD", role: "websiteAdmin",
      wallet: "", credits: 0, earned: 0, spent: 0, aictePoints: 0, rep: 0, reviews: 0,
      level: 5, xp: 0, referralCode: "TB-ADMIN0",
    });
    console.log("  ✓ Website Admin seeded (admin@timebank.com / admin@123)");
  }

  const collegeExists = await User.findOne({ role: "collegeAdmin" });
  if (!collegeExists) {
    await User.create({
      name: "College Admin", email: "college@timebank.com", password: "admin@123",
      bio: "College administrator", avatar: "CA", role: "collegeAdmin",
      college: "NITK",
      wallet: "", credits: 0, earned: 0, spent: 0, aictePoints: 0, rep: 0, reviews: 0,
      level: 5, xp: 0, referralCode: "TB-COLLEGE0",
    });
    console.log("  ✓ College Admin seeded (college@timebank.com / admin@123) for NITK");
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
r.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), password });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    if (user.isBlocked) {
      return res.status(403).json({ error: "Your account has been suspended/blocked due to policy violations." });
    }

    // Update last active
    user.lastActiveAt = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({ token, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, bio, wallet, referralCode: refCode, college } = req.body;
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const avatar = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    // Generate unique referral code
    let referralCode;
    let attempts = 0;
    do {
      referralCode = generateReferralCode();
      attempts++;
    } while (await User.findOne({ referralCode }) && attempts < 10);

    // Check if referred by someone
    let referredBy = "";
    if (refCode) {
      const referrer = await User.findOne({ referralCode: refCode.toUpperCase() });
      if (referrer) referredBy = refCode.toUpperCase();
    }

    const user = await User.create({
      name, email: email.toLowerCase(), password, bio, avatar,
      role: "user", wallet: wallet || "", credits: 10, earned: 0, spent: 0,
      aictePoints: 0, rep: 0, reviews: 0,
      level: 1, xp: 0, referralCode, referredBy,
      welcomeShown: false,
    });

    // Generate blockchain receipt for welcome bonus
    const { txHash, blockNumber } = generateMockTx();

    // Record welcome bonus transaction
    await Transaction.create({
      fromId: "SYSTEM", toId: user._id.toString(), bookingId: null,
      amount: 10, type: "initial_credits", desc: "Welcome bonus — 10 starter credits",
      txHash, blockNumber,
    });

    await Blockchain.create({
      block: blockNumber, txHash,
      from: "SYSTEM", to: wallet || user._id.toString(),
      amount: 10, type: "MINT",
    });

    // Create welcome notification
    await createNotification(user._id, "welcome",
      "Welcome to TimeBank! 🎉",
      "You've received 10 credits to get started. Explore services and start exchanging skills!",
      { credits: 10 }
    );

    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/auth/website-admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), password, role: "websiteAdmin" });
    if (!user) return res.status(401).json({ error: "Invalid website admin credentials" });
    const token = generateToken(user);
    res.json({ token, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/auth/college-admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), password, role: "collegeAdmin" });
    if (!user) return res.status(401).json({ error: "Invalid college admin credentials" });
    const token = generateToken(user);
    res.json({ token, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mark welcome shown
r.post("/auth/welcome-shown/:userId", async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { welcomeShown: true });
    res.json({ ok: true });
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
    // Prevent client from setting protected fields
    const { credits, level, xp, restrictionUntil, trustScore, badges, ...safeData } = req.body;
    const u = await User.findByIdAndUpdate(req.params.id, safeData, { new: true });
    res.json(u);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Level Progress ──
r.get("/users/:id/level-progress", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const currentLevel = user.level;
    const nextLevel = Math.min(currentLevel + 1, 5);
    const currentCfg = LEVEL_CFG[currentLevel];
    const nextCfg = LEVEL_CFG[nextLevel];

    const xpForCurrent = currentCfg.req;
    const xpForNext = nextCfg.req;
    const progressXP = user.xp - xpForCurrent;
    const neededXP = xpForNext - xpForCurrent;
    const progressPct = currentLevel >= 5 ? 100 : Math.min(100, Math.round((progressXP / (neededXP || 1)) * 100));

    res.json({
      level: currentLevel,
      levelName: currentCfg.name,
      xp: user.xp,
      nextLevel,
      nextLevelName: nextCfg.name,
      xpForNext: xpForNext,
      ratingReq: nextCfg.ratingReq,
      currentRating: user.rep || 0,
      progressPct,
      progressXP,
      neededXP,
      isMaxLevel: currentLevel >= 5,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Upload Avatar ──
r.post("/users/:id/upload-avatar", async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    const u = await User.findByIdAndUpdate(req.params.id, { avatarUrl }, { new: true });
    res.json(u);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Endorse Skill ──
r.post("/users/:id/endorse", async (req, res) => {
  try {
    const { skill, endorserId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (req.params.id === endorserId) return res.status(400).json({ error: "Cannot endorse yourself" });

    // Check if already endorsed this skill by this user
    const existing = user.endorsements.find(
      e => e.skill === skill && e.endorserId.toString() === endorserId
    );
    if (existing) return res.status(409).json({ error: "Already endorsed this skill" });

    user.endorsements.push({ skill, endorserId });
    await user.save();

    await createNotification(user._id, "review",
      "Skill Endorsed! 👍",
      `Someone endorsed your "${skill}" skill!`,
      { skill, endorserId }
    );

    // Check badges after endorsement
    await checkAndAwardBadges(user);

    res.json(user);
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
  try {
    let { skillId, customSkillName, customSkillCategory, providerId } = req.body;

    // Check restriction
    if (providerId) {
      const provider = await User.findById(providerId);
      if (provider) {
        // Offering a service lifts restriction
        if (provider.restrictionUntil && new Date(provider.restrictionUntil) > new Date()) {
          provider.restrictionUntil = null;
          provider.restrictionReason = "";
          provider.freeloaderWarned = false;
          provider.servicesTaken = 0; // Reset counter
          await provider.save();

          await createNotification(provider._id, "restriction",
            "Restriction Lifted! ✅",
            "Your restriction has been lifted because you offered a service. Thank you for contributing!",
            {}
          );
        }

        // Increment services offered
        provider.servicesOffered = (provider.servicesOffered || 0) + 1;
        provider.lastActiveAt = new Date();
        await provider.save();
      }
    }

    if (skillId === "custom" && customSkillName) {
      const nameVal = customSkillName.trim();
      const catVal = (customSkillCategory || "Technology").trim();
      let skill = await Skill.findOne({
        name: { $regex: new RegExp(`^${nameVal.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
      });
      if (!skill) {
        skill = await Skill.create({ name: nameVal, category: catVal });
      }
      req.body.skillId = skill._id;
    }
    res.status(201).json(await Service.create(req.body));
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/services/:id", async (req, res) => {
  try { res.json(await Service.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.delete("/services/:id", requireAuth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });

    let provider = null;
    if (service.providerId) {
      provider = await User.findById(service.providerId);
    }

    const isOwner = req.user.id === String(service.providerId);
    const isWebsiteAdmin = req.user.role === "websiteAdmin";
    const isSameCollegeAdmin = req.user.role === "collegeAdmin" && provider && provider.college === req.user.college;

    if (!isOwner && !isWebsiteAdmin && !isSameCollegeAdmin) {
      return res.status(403).json({ error: "Forbidden: You do not have permission to delete this service" });
    }

    if (provider) {
      provider.servicesOffered = Math.max(0, (provider.servicesOffered || 0) - 1);
      await provider.save();
    }

    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: "Service deleted successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── BOOKINGS ────────────────────────────────────────────────────────────────
r.get("/bookings", requireAuth, requireRole(["websiteAdmin", "collegeAdmin"]), async (req, res) => {
  try { 
    if (req.user.role === "collegeAdmin") {
      const collegeUsers = await User.find({ college: req.user.college }).select('_id');
      const userIds = collegeUsers.map(u => u._id);
      res.json(await Booking.find({ $or: [{ providerId: { $in: userIds } }, { requesterId: { $in: userIds } }] }).sort({ createdAt: -1 }));
    } else {
      res.json(await Booking.find().sort({ createdAt: -1 })); 
    }
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/bookings/user/:userId", async (req, res) => {
  try {
    const uid = req.params.userId;
    res.json(await Booking.find({ $or: [{ providerId: uid }, { requesterId: uid }] }).sort({ createdAt: -1 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/bookings", async (req, res) => {
  try {
    const { requesterId, providerId, hours } = req.body;
    const requester = await User.findById(requesterId);
    if (!requester) return res.status(404).json({ error: "Requester not found" });

    // Check restriction
    if (requester.restrictionUntil && new Date(requester.restrictionUntil) > new Date()) {
      const daysLeft = Math.ceil((new Date(requester.restrictionUntil) - new Date()) / (1000 * 60 * 60 * 24));
      return res.status(403).json({
        error: `You are temporarily restricted from taking services. ${daysLeft} day(s) remaining. Offer a service to lift the restriction early.`,
        restricted: true,
        daysLeft,
      });
    }

    // Check sufficient credits
    if (requester.credits < hours) {
      return res.status(400).json({ error: "Insufficient credits" });
    }

    // Escrow: hold credits
    requester.credits -= hours;
    requester.servicesTaken = (requester.servicesTaken || 0) + 1;
    requester.lastActiveAt = new Date();
    await requester.save();

    // Record escrow hold transaction
    await Transaction.create({
      fromId: requesterId, toId: "ESCROW", bookingId: null,
      amount: hours, type: "escrow_hold",
      desc: `Credits held in escrow for booking`,
    });

    // Set auto-confirm at 72 hours from now
    const autoConfirmAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const booking = await Booking.create({
      ...req.body,
      escrowHeld: true,
      autoConfirmAt,
    });

    // Update the escrow transaction with booking ID
    await Transaction.findOneAndUpdate(
      { fromId: requesterId, type: "escrow_hold", bookingId: null },
      { bookingId: booking._id }
    );

    // Check freeloader status
    const freeloaderStatus = checkFreeloader(requester);
    if (freeloaderStatus.restricted) {
      // Apply restriction (5 days)
      requester.restrictionUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      requester.restrictionReason = "Took 5 services without offering any";
      await requester.save();

      await createNotification(requester._id, "restriction",
        "Service Restriction Applied ⚠️",
        freeloaderStatus.message,
        { restrictionUntil: requester.restrictionUntil }
      );
    } else if (freeloaderStatus.warned) {
      requester.freeloaderWarned = true;
      await requester.save();

      await createNotification(requester._id, "warning",
        "Community Balance Notice ⚖️",
        freeloaderStatus.message,
        {}
      );
    }

    // Notify provider
    await createNotification(providerId, "booking",
      "New Booking Request 📅",
      `${requester.name} wants to book your service!`,
      { bookingId: booking._id }
    );

    res.status(201).json(booking);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // If cancelling, refund escrow
    if (req.body.status === "cancelled" && booking.escrowHeld) {
      const requester = await User.findById(booking.requesterId);
      if (requester) {
        requester.credits += booking.hours;
        requester.cancellations = (requester.cancellations || 0) + 1;
        requester.trustScore = computeTrustScore(requester);
        await requester.save();

        await Transaction.create({
          fromId: "ESCROW", toId: booking.requesterId.toString(),
          bookingId: booking._id, amount: booking.hours,
          type: "escrow_refund", desc: "Credits refunded — booking cancelled",
        });
      }
      booking.escrowHeld = false;
    }

    Object.assign(booking, req.body);
    await booking.save();
    res.json(booking);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Confirm Completion (per-party) ──
r.post("/bookings/:id/confirm-completion", async (req, res) => {
  try {
    const { userId } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const isProvider = booking.providerId.toString() === userId;
    const isRequester = booking.requesterId.toString() === userId;

    if (!isProvider && !isRequester) return res.status(403).json({ error: "Not part of this booking" });

    if (isProvider) booking.providerConfirmed = true;
    if (isRequester) booking.requesterConfirmed = true;
    await booking.save();

    // If both confirmed, complete
    if (booking.providerConfirmed && booking.requesterConfirmed) {
      return completeBookingInternal(booking, req, res);
    }

    // Notify the other party
    const otherPartyId = isProvider ? booking.requesterId : booking.providerId;
    await createNotification(otherPartyId, "booking",
      "Completion Confirmation Pending ✅",
      "The other party has confirmed completion. Please confirm on your end.",
      { bookingId: booking._id }
    );

    res.json(booking);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Complete booking — handles credit transfer + records
r.post("/bookings/:id/complete", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    return completeBookingInternal(booking, req, res);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function completeBookingInternal(booking, req, res) {
  try {
    const { txHash, blockNumber } = req.body || {};

    // Update booking status
    booking.status = "completed";
    booking.providerConfirmed = true;
    booking.requesterConfirmed = true;
    booking.txHash = txHash || null;
    booking.blockNumber = blockNumber || null;
    booking.escrowHeld = false;
    await booking.save();

    // Transfer credits: escrow → provider
    const requester = await User.findById(booking.requesterId);
    const provider = await User.findById(booking.providerId);

    if (requester && provider) {
      // Credits were already deducted from requester during escrow
      requester.spent += booking.hours;
      provider.credits += booking.hours;
      provider.earned += booking.hours;

      // Increment provider XP
      provider.xp = (provider.xp || 0) + 1;
      provider.lastActiveAt = new Date();
      requester.lastActiveAt = new Date();

      // Update completion rate
      const totalProviderBookings = await Booking.countDocuments({
        providerId: provider._id,
        status: { $in: ["completed", "cancelled"] }
      });
      const completedProviderBookings = await Booking.countDocuments({
        providerId: provider._id,
        status: "completed"
      });
      provider.completionRate = totalProviderBookings > 0
        ? Math.round((completedProviderBookings / totalProviderBookings) * 100) : 100;

      // Check level up
      const oldLevel = provider.level;
      const newLevel = computeLevel(provider);
      provider.level = newLevel;
      provider.trustScore = computeTrustScore(provider);

      await requester.save();
      await provider.save();

      // Check for level up notification
      if (newLevel > oldLevel) {
        await createNotification(provider._id, "level_up",
          `Level Up! 🎉 You're now Level ${newLevel}`,
          `Congratulations! You've reached "${LEVEL_CFG[newLevel].name}" status.`,
          { oldLevel, newLevel, levelName: LEVEL_CFG[newLevel].name }
        );
      }

      // Check badges
      await checkAndAwardBadges(provider);

      // Notify both parties about completion
      await createNotification(provider._id, "completion",
        "Service Completed! 🎉",
        `+${booking.hours} credits earned for completing a service.`,
        { credits: booking.hours, newBalance: provider.credits, bookingId: booking._id }
      );

      await createNotification(requester._id, "completion",
        "Service Completed! ✅",
        `Service completed successfully. ${booking.hours} credits transferred to provider.`,
        { credits: booking.hours, newBalance: requester.credits, bookingId: booking._id }
      );

      // Check referral bonus for provider
      if (!provider.referralCredited && provider.referredBy && provider.xp === 1) {
        provider.firstServiceCompleted = true;
        const referrer = await User.findOne({ referralCode: provider.referredBy });
        if (referrer) {
          const bonus = 5;
          referrer.credits += bonus;
          provider.credits += bonus;
          provider.referralCredited = true;
          await referrer.save();
          await provider.save();

          const mockTx = generateMockTx();
          await Transaction.create({
            fromId: "SYSTEM", toId: referrer._id.toString(),
            amount: bonus, type: "referral_bonus",
            desc: `Referral bonus: ${provider.name} completed first service`,
            txHash: mockTx.txHash, blockNumber: mockTx.blockNumber,
          });
          await Transaction.create({
            fromId: "SYSTEM", toId: provider._id.toString(),
            amount: bonus, type: "referral_bonus",
            desc: `Referral bonus: completed first service`,
            txHash: mockTx.txHash, blockNumber: mockTx.blockNumber,
          });

          await createNotification(referrer._id, "referral",
            "Referral Bonus! 🎁",
            `${provider.name} completed their first service. You both earned ${bonus} credits!`,
            { credits: bonus, referredUser: provider.name }
          );
          await createNotification(provider._id, "referral",
            "Referral Bonus! 🎁",
            `You completed your first service! Both you and your referrer earned ${bonus} credits.`,
            { credits: bonus }
          );
        }
      }
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

    res.json({
      booking,
      providerCredits: provider?.credits,
      requesterCredits: requester?.credits,
      providerLevel: provider?.level,
      levelUp: provider?.level > (req.body._oldProviderLevel || 0),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

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

r.get("/reviews/service/:serviceId", async (req, res) => {
  try { res.json(await Review.find({ serviceId: req.params.serviceId }).sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/reviews", async (req, res) => {
  try {
    const review = await Review.create(req.body);

    // Update reviewee's rep
    const allRevs = await Review.find({ revieweeId: req.body.revieweeId });
    const avg = allRevs.reduce((s, rv) => s + rv.rating, 0) / allRevs.length;
    const reviewee = await User.findById(req.body.revieweeId);
    if (reviewee) {
      reviewee.rep = Math.round(avg * 10) / 10;
      reviewee.reviews = allRevs.length;

      // Recompute level (rating may have changed)
      const newLevel = computeLevel(reviewee);
      const oldLevel = reviewee.level;

      // Check for demotion
      if (newLevel < oldLevel) {
        if (!reviewee.demotionWarned) {
          reviewee.demotionWarned = true;
          reviewee.demotionWarningAt = new Date();
          await createNotification(reviewee._id, "demotion_warning",
            "Level At Risk ⚠️",
            `Your rating has dropped. Maintain a ${LEVEL_CFG[oldLevel].ratingReq}+ rating to keep Level ${oldLevel}. You have 7 days to recover.`,
            { currentLevel: oldLevel, requiredRating: LEVEL_CFG[oldLevel].ratingReq }
          );
        } else {
          // Check if grace period (7 days) has passed
          const gracePeriod = 7 * 24 * 60 * 60 * 1000;
          if (reviewee.demotionWarningAt && (Date.now() - new Date(reviewee.demotionWarningAt).getTime()) > gracePeriod) {
            reviewee.level = newLevel;
            reviewee.demotionWarned = false;
            reviewee.demotionWarningAt = null;
            await createNotification(reviewee._id, "level_up",
              `Level Changed to ${newLevel}`,
              `Your level has been adjusted to "${LEVEL_CFG[newLevel].name}" due to rating changes.`,
              { oldLevel, newLevel, levelName: LEVEL_CFG[newLevel].name }
            );
          }
        }
      } else {
        reviewee.demotionWarned = false;
        reviewee.demotionWarningAt = null;
        if (newLevel > oldLevel) {
          reviewee.level = newLevel;
          await createNotification(reviewee._id, "level_up",
            `Level Up! 🎉 You're now Level ${newLevel}`,
            `Congratulations! You've reached "${LEVEL_CFG[newLevel].name}" status.`,
            { oldLevel, newLevel, levelName: LEVEL_CFG[newLevel].name }
          );
        }
      }

      reviewee.trustScore = computeTrustScore(reviewee);
      await reviewee.save();
      await checkAndAwardBadges(reviewee);
    }

    // Notify reviewee
    const reviewer = await User.findById(req.body.reviewerId);
    await createNotification(req.body.revieweeId, "review",
      "New Review Received ⭐",
      `${reviewer?.name || "Someone"} left you a ${req.body.rating}-star review.`,
      { rating: req.body.rating, reviewId: review._id }
    );

    // Check reviewer badges
    if (reviewer) await checkAndAwardBadges(reviewer);

    res.status(201).json(review);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
r.get("/notifications/user/:userId", async (req, res) => {
  try {
    res.json(await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(50));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/notifications/unread-count/:userId", async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.params.userId, read: false });
    res.json({ count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/notifications/:id/read", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/notifications/read-all/:userId", async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId, read: false }, { read: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── DISPUTES ────────────────────────────────────────────────────────────────
r.get("/disputes", async (_req, res) => {
  try { res.json(await Dispute.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/disputes", async (req, res) => {
  try {
    const dispute = await Dispute.create(req.body);

    // Update booking status to disputed
    await Booking.findByIdAndUpdate(req.body.bookingId, { status: "disputed" });

    // Notify admin(s)
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(admin._id, "dispute",
        "New Dispute Filed 🚨",
        "A user has filed a dispute that requires your attention.",
        { disputeId: dispute._id, bookingId: req.body.bookingId }
      );
    }

    res.status(201).json(dispute);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/disputes/:id/resolve", async (req, res) => {
  try {
    const { resolution, resolvedBy, action } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: "Dispute not found" });

    dispute.status = "resolved";
    dispute.resolution = resolution;
    dispute.resolvedBy = resolvedBy;
    await dispute.save();

    // Handle the resolution action
    const booking = await Booking.findById(dispute.bookingId);
    if (booking && action === "refund") {
      // Refund credits to requester
      const requester = await User.findById(booking.requesterId);
      if (requester) {
        requester.credits += booking.hours;
        await requester.save();
        await Transaction.create({
          fromId: "ESCROW", toId: booking.requesterId.toString(),
          bookingId: booking._id, amount: booking.hours,
          type: "escrow_refund", desc: "Dispute resolved — credits refunded",
        });
      }
      booking.status = "cancelled";
      booking.escrowHeld = false;
      await booking.save();
    } else if (booking && action === "complete") {
      // Force complete
      booking.status = "completed";
      booking.escrowHeld = false;
      const provider = await User.findById(booking.providerId);
      if (provider) {
        provider.credits += booking.hours;
        provider.earned += booking.hours;
        provider.xp = (provider.xp || 0) + 1;
        provider.level = computeLevel(provider);
        await provider.save();
      }
      const requester = await User.findById(booking.requesterId);
      if (requester) {
        requester.spent += booking.hours;
        await requester.save();
      }
      await booking.save();
    }

    // Notify both parties
    await createNotification(dispute.raisedBy, "dispute",
      "Dispute Resolved ✅",
      `Your dispute has been resolved: ${resolution}`,
      { disputeId: dispute._id }
    );
    await createNotification(dispute.againstUser, "dispute",
      "Dispute Resolved ✅",
      `A dispute involving you has been resolved: ${resolution}`,
      { disputeId: dispute._id }
    );

    res.json(dispute);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/disputes/:id/dismiss", async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { status: "dismissed", resolution: req.body.reason || "Dismissed by admin", resolvedBy: req.body.resolvedBy },
      { new: true }
    );
    res.json(dispute);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
r.get("/leaderboard", async (req, res) => {
  try {
    const { period, category } = req.query;
    let dateFilter = {};

    if (period === "weekly") {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { lastActiveAt: { $gte: weekAgo } };
    } else if (period === "monthly") {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { lastActiveAt: { $gte: monthAgo } };
    }

    const users = await User.find({
      role: "user",
      xp: { $gt: 0 },
      ...dateFilter,
    }).sort({ xp: -1, rep: -1 }).limit(20);

    const leaderboard = users.map((u, i) => ({
      rank: i + 1,
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      avatarUrl: u.avatarUrl,
      level: u.level,
      xp: u.xp,
      rep: u.rep,
      reviews: u.reviews,
      trustScore: u.trustScore,
      badges: u.badges,
      skills: u.skills,
      earned: u.earned,
    }));

    res.json(leaderboard);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── REFERRAL ────────────────────────────────────────────────────────────────
r.post("/referral/validate", async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findOne({ referralCode: code.toUpperCase() });
    if (!user) return res.status(404).json({ error: "Invalid referral code" });
    res.json({ valid: true, referrerName: user.name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── AICTE ───────────────────────────────────────────────────────────────────
r.get("/aicte", requireAuth, requireRole(["websiteAdmin", "collegeAdmin"]), async (req, res) => {
  try { 
    if (req.user.role === "collegeAdmin") {
      res.json(await Aicte.find({ college: req.user.college }).populate("userId", "name college avatar").sort({ createdAt: -1 }));
    } else {
      res.json(await Aicte.find().populate("userId", "name college avatar").sort({ createdAt: -1 }));
    }
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/aicte/user/:userId", async (req, res) => {
  try { res.json(await Aicte.find({ userId: req.params.userId }).populate("userId", "name college avatar").sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/aicte", async (req, res) => {
  try {
    const activity = await Aicte.create({ ...req.body, pts: 0, credits: 0, verified: false });
    res.status(201).json(activity);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin verify AICTE activity
r.post("/aicte/:id/verify", requireAuth, requireRole(["websiteAdmin", "collegeAdmin"]), async (req, res) => {
  try {
    const { txHash, blockNumber, pts, credits } = req.body;
    const activity = await Aicte.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    const user = await User.findById(activity.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // College admin scoping check
    if (req.user.role === "collegeAdmin" && activity.college !== req.user.college) {
      return res.status(403).json({ error: "Cannot verify activity outside your college" });
    }

    activity.verified = true;
    activity.txHash = txHash || null;
    activity.blockNumber = blockNumber || null;
    if (pts !== undefined) activity.pts = pts;
    if (credits !== undefined) activity.credits = credits;
    await activity.save();

    // Add credits + points to user
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

    await createNotification(activity.userId, "credit",
      "AICTE Activity Approved! 🎓",
      `"${activity.title}" verified — +${activity.credits} credits awarded.`,
      { credits: activity.credits, activityId: activity._id }
    );

    res.json(activity);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/aicte/:id/reject", requireAuth, requireRole(["websiteAdmin", "collegeAdmin"]), async (req, res) => {
  try {
    const activity = await Aicte.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    if (req.user.role === "collegeAdmin" && activity.college !== req.user.college) {
      return res.status(403).json({ error: "Cannot reject activity outside your college" });
    }
      await createNotification(activity.userId, "warning",
        "AICTE Activity Rejected",
        `Your activity "${activity.title}" was not approved.`,
        {}
      );
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

    // Notify the other participant
    const otherParticipant = chat.participants.find(p => p.toString() !== req.body.senderId);
    if (otherParticipant) {
      const sender = await User.findById(req.body.senderId);
      await createNotification(otherParticipant, "chat",
        `New Message from ${sender?.name || "Someone"} 💬`,
        req.body.text.length > 60 ? req.body.text.slice(0, 60) + "..." : req.body.text,
        { chatId: chat._id, senderId: req.body.senderId }
      );
    }

    res.json(chat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mark messages as read
r.post("/chats/:id/read", async (req, res) => {
  try {
    const { userId } = req.body;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    chat.messages.forEach(m => {
      if (m.senderId.toString() !== userId && !m.readAt) {
        m.readAt = new Date();
      }
    });
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

// ─── WEBSITE ADMIN ───────────────────────────────────────────────────────────────────
r.get("/website-admin/stats", requireAuth, requireRole(["websiteAdmin"]), async (_req, res) => {
  try {
    const [users, services, bookings, transactions, pendingAicte, openDisputes, restrictedUsers] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Service.countDocuments(),
      Booking.countDocuments(),
      Transaction.countDocuments(),
      Aicte.countDocuments({ verified: false }),
      Dispute.countDocuments({ status: "open" }),
      User.countDocuments({ restrictionUntil: { $gt: new Date() } }),
    ]);
    res.json({ users, services, bookings, transactions, pendingAicte, openDisputes, restrictedUsers });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/website-admin/users/:id/restriction", requireAuth, requireRole(["websiteAdmin"]), async (req, res) => {
  try {
    const { action, days, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (action === "lift") {
      user.restrictionUntil = null;
      user.restrictionReason = "";
      user.freeloaderWarned = false;
      await createNotification(user._id, "restriction", "Restriction Lifted ✅", "An admin has lifted your service restriction.", {});
    } else if (action === "apply") {
      const restrictDays = days || 5;
      user.restrictionUntil = new Date(Date.now() + restrictDays * 24 * 60 * 60 * 1000);
      user.restrictionReason = reason || "Admin-applied restriction";
      await createNotification(user._id, "restriction", "Service Restriction Applied ⚠️", `An admin has restricted your ability to take services for ${restrictDays} days. Reason: ${reason || "Policy violation"}`, { restrictionUntil: user.restrictionUntil });
    } else if (action === "block") {
      user.isBlocked = true;
      await Service.deleteMany({ providerId: user._id });
      await createNotification(user._id, "restriction", "Account Suspended 🚫", `Your account has been suspended by an admin. Reason: ${reason || "Frauds or harmful contents violation"}.`, {});
    } else if (action === "unblock") {
      user.isBlocked = false;
      await createNotification(user._id, "restriction", "Account Reactivated ✅", "An admin has reactivated your account.", {});
    }

    await user.save();
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/website-admin/users/:id/level", requireAuth, requireRole(["websiteAdmin"]), async (req, res) => {
  try {
    const { level } = req.body;
    if (level < 1 || level > 5) return res.status(400).json({ error: "Level must be 1-5" });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const oldLevel = user.level;
    user.level = level;
    await user.save();

    await createNotification(user._id, "level_up", `Level Adjusted to ${level}`, `An admin has set your level to ${level} ("${LEVEL_CFG[level].name}").`, { oldLevel, newLevel: level, levelName: LEVEL_CFG[level].name });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/website-admin/admins", requireAuth, requireRole(["websiteAdmin"]), async (req, res) => {
  try {
    const admins = await User.find({ role: "collegeAdmin" });
    res.json(admins);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/website-admin/admins", requireAuth, requireRole(["websiteAdmin"]), async (req, res) => {
  try {
    const { name, email, password, college } = req.body;
    if (!name || !email || !password || !college) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already in use" });
    
    const admin = new User({
      name, email, password, college, role: "collegeAdmin",
      bio: "Institution Admin Account", credits: 0, 
    });
    await admin.save();
    res.json(admin);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── COLLEGE ADMIN ───────────────────────────────────────────────────────────────────
r.get("/college-admin/stats", requireAuth, requireRole(["collegeAdmin"]), async (req, res) => {
  try {
    const [users, pendingAicte, restrictedUsers] = await Promise.all([
      User.countDocuments({ role: "user", college: req.user.college }),
      Aicte.countDocuments({ verified: false, college: req.user.college }),
      User.countDocuments({ restrictionUntil: { $gt: new Date() }, college: req.user.college }),
    ]);
    res.json({ users, pendingAicte, restrictedUsers });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put("/college-admin/users/:id/restriction", requireAuth, requireRole(["collegeAdmin"]), async (req, res) => {
  try {
    const { action, days, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.college !== req.user.college) {
      return res.status(403).json({ error: "Cannot modify a user outside your college" });
    }

    if (action === "lift") {
      user.restrictionUntil = null;
      user.restrictionReason = "";
      user.freeloaderWarned = false;
      await createNotification(user._id, "restriction", "Restriction Lifted ✅", "Your college admin has lifted your service restriction.", {});
    } else if (action === "apply") {
      const restrictDays = days || 5;
      user.restrictionUntil = new Date(Date.now() + restrictDays * 24 * 60 * 60 * 1000);
      user.restrictionReason = reason || "College Admin applied restriction";
      await createNotification(user._id, "restriction", "Service Restriction Applied ⚠️", `Your college admin has restricted your ability to take services for ${restrictDays} days. Reason: ${reason || "Policy violation"}`, { restrictionUntil: user.restrictionUntil });
    } else if (action === "block") {
      user.isBlocked = true;
      await Service.deleteMany({ providerId: user._id });
      await createNotification(user._id, "restriction", "Account Suspended 🚫", `Your account has been suspended by your college admin. Reason: ${reason || "Policy violation"}.`, {});
    } else if (action === "unblock") {
      user.isBlocked = false;
      await createNotification(user._id, "restriction", "Account Reactivated ✅", "Your college admin has reactivated your account.", {});
    }

    await user.save();
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default r;

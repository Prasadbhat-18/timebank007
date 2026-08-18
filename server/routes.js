// ─── TimeBank — API Routes ───────────────────────────────────────────────────
import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ethers } from "ethers";
import {
  College, User, Skill, Service, Booking, Transaction,
  Review, Notification, Certificate, Dispute, Aicte, Chat, Emergency, Blockchain, FraudReview, Otp,
} from "./models.js";
import { getRecommendations, verifyAicteCertificate, handleWebsiteChat } from "./ai.js";
import {
  hashIdentifier, euclideanDistance, checkDuplicateRegistration, calculateTransactionRisk,
} from "./fraudService.js";
import { pushNotification, broadcastRealtimeEvent } from "./sockets.js";
import { issueCertificate, renderCertificatePdf, computeHash } from "./certificateService.js";
import { sendOtpEmail } from "./emailService.js";
import * as relayer from "./relayerService.js";
import fs from "fs";
import path from "path";

const r = Router();

const JWT_SECRET = process.env.JWT_SECRET || "timebank_super_secret_key";

function generateToken(user) {
  return jwt.sign({ id: user._id, role: user.role, college: user.college, collegeId: user.collegeId }, JWT_SECRET, { expiresIn: "7d" });
}

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, college, collegeId }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const requireRole = (...roles) => {
  const flattened = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Access denied. Unauthorized." });
    }
    const role = req.user.role;
    const match = flattened.some((targetRole) => {
      if (targetRole === role) return true;
      if ((targetRole === "super_admin" || targetRole === "websiteAdmin") && (role === "super_admin" || role === "websiteAdmin")) return true;
      if ((targetRole === "institute_admin" || targetRole === "collegeAdmin") && (role === "institute_admin" || role === "collegeAdmin")) return true;
      if ((targetRole === "general_user" || targetRole === "user") && (role === "general_user" || role === "user")) return true;
      if (targetRole === "student" && role === "student") return true;
      return false;
    });

    if (!match) {
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

const FACE_MATCH_THRESHOLD = 0.6; // lower = stricter

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

// Create notification helper with real-time push support
async function createNotification(userId, type, title, message, data = {}) {
  return pushNotification(userId, { type, title, message, body: message, data });
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

// Seed default colleges
export async function seedColleges() {
  const count = await College.countDocuments();
  if (count === 0) {
    const DEFAULT_COLLEGES = [
      { name: "National Institute of Technology Karnataka (NITK)", emailDomain: "nitk.edu.in", code: "NITK", city: "Surathkal", state: "Karnataka" },
      { name: "Indian Institute of Technology Bombay (IITB)", emailDomain: "iitb.ac.in", code: "IITB", city: "Mumbai", state: "Maharashtra" },
      { name: "BITS Pilani", emailDomain: "bits-pilani.ac.in", code: "BITS", city: "Pilani", state: "Rajasthan" },
      { name: "Delhi Technological University (DTU)", emailDomain: "dtu.ac.in", code: "DTU", city: "New Delhi", state: "Delhi" },
      { name: "PES University", emailDomain: "pes.edu", code: "PESU", city: "Bengaluru", state: "Karnataka" },
      { name: "RV College of Engineering", emailDomain: "rvce.edu.in", code: "RVCE", city: "Bengaluru", state: "Karnataka" },
      { name: "Global Academy of Technology", emailDomain: "global.edu.in", code: "GAT", city: "Bengaluru", state: "Karnataka" },
    ];
    await College.insertMany(DEFAULT_COLLEGES);
    console.log("  ✓ Default colleges seeded");
  }
}

// ─── COLLEGES ────────────────────────────────────────────────────────────────
r.get("/colleges", async (_req, res) => {
  try {
    const colleges = await College.find().sort({ name: 1 });
    res.json(colleges);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/colleges", requireAuth, requireRole("super_admin", "websiteAdmin"), async (req, res) => {
  try {
    const { name, emailDomain, code, city, state } = req.body;
    if (!name || !emailDomain) return res.status(400).json({ error: "Name and email domain are required" });
    const college = await College.create({ name, emailDomain: emailDomain.toLowerCase().replace(/^@/, ""), code, city, state });
    res.status(201).json(college);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── STARTER CREDITS BLOCKCHAIN LEDGER RECORDING HELPER ──────────────────────
async function ensureInitialCreditsRecorded(user) {
  try {
    if (!user || user.role === "websiteAdmin" || user.role === "super_admin") return;
    
    // Ensure user has a valid EVM address
    if (!user.wallet || !user.wallet.startsWith("0x")) {
      user.wallet = ethers.Wallet.createRandom().address;
      await user.save();
    }

    // Check if initial credits transaction already exists
    let existingTx = await Transaction.findOne({
      toId: user._id.toString(),
      type: "initial_credits",
    });

    if (existingTx && existingTx.txHash) {
      const existingBc = await Blockchain.findOne({ txHash: existingTx.txHash });
      if (existingBc) return existingBc;
    }

    let txHash = existingTx?.txHash;
    let blockNumber = existingTx?.blockNumber;
    let isStateProof = false;

    if (!txHash) {
      try {
        const relayRes = await relayer.relayCreditTransfer(
          user.wallet,
          10,
          { type: "initial_credits", userId: user._id }
        );
        txHash = relayRes.txHash;
        blockNumber = relayRes.blockNumber;
        isStateProof = Boolean(relayRes.isStateProof);
      } catch (err) {
        console.warn("[Initial Credits] Relayer fallback:", err.message);
        const mock = generateMockTx();
        txHash = mock.txHash;
        blockNumber = mock.blockNumber;
        isStateProof = true;
      }
    }

    if (!existingTx) {
      existingTx = await Transaction.create({
        fromId: "SYSTEM_TIMEBANK_TREASURY",
        toId: user._id.toString(),
        bookingId: null,
        amount: 10,
        type: "initial_credits",
        desc: "Welcome bonus — 10 starter credits",
        txHash,
        blockNumber,
      });
    }

    const bcEntry = await Blockchain.create({
      block: blockNumber || 10000001,
      txHash,
      from: "SYSTEM_TIMEBANK_TREASURY",
      to: user.wallet,
      amount: 10,
      type: "MINT",
      isStateProof,
    });

    broadcastRealtimeEvent("blockchain_ledger_entry", bcEntry);
    broadcastRealtimeEvent("wallet_update", { userId: user._id, credits: user.credits, wallet: user.wallet });
    return bcEntry;
  } catch (err) {
    console.warn("Failed to ensure initial credits recorded:", err.message);
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
r.post("/auth/login", async (req, res) => {
  try {
    const { email, password, faceDescriptor, deviceFingerprint } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), password });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    if (user.isBlocked) {
      return res.status(403).json({ error: "Your account has been suspended/blocked due to policy violations." });
    }

    // Face match check & Cross-Account Biometric Impersonation Detection
    let faceMatch = null;
    let crossAccountFlag = null;
    if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
      if (user.faceDescriptor && user.faceDescriptor.length === 128) {
        const dist = euclideanDistance(faceDescriptor, user.faceDescriptor);
        faceMatch = dist <= FACE_MATCH_THRESHOLD;
      }

      // Check if this face belongs to ANY OTHER account in the system
      const candidates = await User.find({
        _id: { $ne: user._id },
        faceDescriptor: { $exists: true, $ne: [] },
      });
      for (const candidate of candidates) {
        if (!candidate.faceDescriptor || candidate.faceDescriptor.length !== 128) continue;
        const otherDist = euclideanDistance(faceDescriptor, candidate.faceDescriptor);
        if (otherDist < 0.45) {
          crossAccountFlag = {
            matchedUserId: candidate._id,
            matchedEmail: candidate.email,
            distance: otherDist,
          };
          user.riskScore = Math.min((user.riskScore || 0) + 50, 100);
          if (!user.flaggedReasons) user.flaggedReasons = [];
          if (!user.flaggedReasons.includes("CROSS_ACCOUNT_FACE_MATCH")) {
            user.flaggedReasons.push("CROSS_ACCOUNT_FACE_MATCH");
          }
          break;
        }
      }
    }

    // Track device fingerprint
    let newDevice = false;
    if (deviceFingerprint) {
      if (!user.deviceFingerprints) user.deviceFingerprints = [];
      if (!user.deviceFingerprints.includes(deviceFingerprint)) {
        user.deviceFingerprints.push(deviceFingerprint);
        newDevice = true;
      }
    }

    // Update last active
    user.lastActiveAt = new Date();
    await user.save();

    // Ensure 10 starter credits are recorded on the blockchain ledger
    ensureInitialCreditsRecorded(user).catch(() => {});

    const token = generateToken(user);
    res.json({ token, user, faceMatch, crossAccountFlag, newDevice });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ─── REAL-TIME OTP & MAGIC LOGIN ─────────────────────────────────────────────
r.post("/auth/send-otp", async (req, res) => {
  try {
    const { email, type = "login" } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const domain = cleanEmail.split("@")[1] || "";

    // Check if this domain belongs to a recognized college
    const college = await College.findOne({ emailDomain: domain.toLowerCase() });

    // Generate 6-digit OTP code with 3-minute validity
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const magicToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    await Otp.create({
      email: cleanEmail,
      code,
      token: magicToken,
      type,
      expiresAt,
      used: false,
    });

    const user = await User.findOne({ email: cleanEmail });
    const collegeTitle = college ? college.name : (user?.college || "College Official Mail Gateway");

    // Send real email via SMTP / College Mail Gateway with HTML template and 1-click magic link
    sendOtpEmail({
      to: cleanEmail,
      code,
      magicToken,
      collegeName: collegeTitle,
      type,
    }).catch(err => {
      console.error(`Error sending OTP email to ${cleanEmail}:`, err.message);
    });

    // Respond immediately (< 15ms) to frontend so UI transitions instantaneously
    return res.json({
      success: true,
      message: `A verification code and 1-click login link has been sent to ${cleanEmail}. Please check your inbox or spam folder.`,
      collegeName: collegeTitle,
      expiresAt,
      previewUrl: null,
    });
  } catch (e) {
    console.error("Error sending OTP email:", e);
    res.status(500).json({ error: e.message || "Failed to dispatch verification code to email." });
  }
});

r.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp, deviceFingerprint } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and 6-digit verification code are required." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const otpDoc = await Otp.findOne({
      email: cleanEmail,
      code: cleanOtp,
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res.status(400).json({ error: "Invalid or expired verification code. Please request a new code." });
    }

    otpDoc.used = true;
    await otpDoc.save();
    // Invalidate all pending OTPs for this email now that verification succeeded
    await Otp.updateMany({ email: cleanEmail, used: false }, { used: true });

    // Check if user exists in database
    const user = await User.findOne({ email: cleanEmail });

    if (user) {
      if (user.isBlocked) {
        return res.status(403).json({ error: "Your account has been suspended/blocked due to policy violations." });
      }

      // Track device fingerprint
      let newDevice = false;
      if (deviceFingerprint) {
        if (!user.deviceFingerprints) user.deviceFingerprints = [];
        if (!user.deviceFingerprints.includes(deviceFingerprint)) {
          user.deviceFingerprints.push(deviceFingerprint);
          newDevice = true;
        }
      }

      user.lastActiveAt = new Date();
      await user.save();

      const token = generateToken(user);
      return res.json({
        success: true,
        isRegistered: true,
        token,
        user,
        newDevice,
        message: "Successfully logged in via one-time verification code! 🎉",
      });
    }

    // Auto-create and log in student if this is their first time signing in with this email
    const domain = cleanEmail.split("@")[1] || "";
    const college = await College.findOne({ emailDomain: domain.toLowerCase() });
    const rawName = cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const avatar = (rawName || "TB").slice(0, 2).toUpperCase();
    const referralCode = "TB-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const newUser = await User.create({
      name: rawName || "Student",
      email: cleanEmail,
      password: "otp_authenticated",
      role: "student", // default to student role so all student features are immediately unlocked
      college: college ? college.name : "Registered Institution",
      collegeId: college ? college._id : null,
      credits: 10,
      avatar,
      verificationStatus: "verified",
      welcomeShown: false,
      referralCode,
      lastActiveAt: new Date(),
    });

    const token = generateToken(newUser);
    await ensureInitialCreditsRecorded(newUser);
    return res.json({
      success: true,
      isRegistered: true,
      isNewUser: true,
      token,
      user: newUser,
      message: `Welcome to TimeBank! Your ${newUser.role === "student" ? "Student" : "User"} account was verified with 10 starter credits! 🚀`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to verify code." });
  }
});

r.get("/auth/magic-login/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const otpDoc = await Otp.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return res.status(400).json({ error: "Magic login link has expired or has already been used." });
    }

    otpDoc.used = true;
    await otpDoc.save();

    let user = await User.findOne({ email: otpDoc.email });
    if (!user) {
      const domain = otpDoc.email.split("@")[1] || "";
      const college = await College.findOne({ emailDomain: domain.toLowerCase() });
      const rawName = otpDoc.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const avatar = (rawName || "TB").slice(0, 2).toUpperCase();
      const referralCode = "TB-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      user = await User.create({
        name: rawName || "Student",
        email: otpDoc.email,
        password: "otp_authenticated",
        role: college ? "student" : (domain.includes(".edu") || domain.includes(".ac.") ? "student" : "general_user"),
        college: college ? college.name : (domain.includes(".edu") ? domain : ""),
        collegeId: college ? college._id : null,
        credits: 10,
        avatar,
        verificationStatus: "verified",
        welcomeShown: false,
        referralCode,
        lastActiveAt: new Date(),
      });
    } else {
      user.lastActiveAt = new Date();
      await user.save();
    }

    await ensureInitialCreditsRecorded(user);

    const jwtToken = generateToken(user);
    res.json({
      success: true,
      isRegistered: true,
      token: jwtToken,
      user,
      message: "One-click magic login successful! 🚀",
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Magic login failed." });
  }
});

// ─── STUDENT REGISTRATION ────────────────────────────────────────────────────
r.post("/auth/register/student", async (req, res) => {
  try {
    const {
      name, email, password, bio, wallet, referralCode: refCode,
      collegeId, college: collegeName, collegeIdNumber,
      faceDescriptor, faceEmbedding, deviceFingerprint, phone, otp,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Full legal name and college email are required." });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify OTP if provided
    if (otp) {
      const validOtp = await Otp.findOne({
        email: cleanEmail,
        code: otp.trim(),
        createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) },
      }).sort({ createdAt: -1 });
      if (!validOtp) {
        return res.status(400).json({ error: "Invalid or expired email verification code." });
      }
      validOtp.used = true;
      await validOtp.save();
    }

    // Resolve college if provided (without restricting student's email domain)
    let resolvedCollege = null;
    if (collegeId) {
      resolvedCollege = await College.findById(collegeId);
    }
    if (!resolvedCollege && collegeName) {
      resolvedCollege = await College.findOne({
        $or: [{ name: new RegExp(`^${collegeName}$`, "i") }, { code: new RegExp(`^${collegeName}$`, "i") }],
      });
    }

    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "";
    const activeFace = faceDescriptor || faceEmbedding;

    const fraudCheck = await checkDuplicateRegistration({
      email: cleanEmail, phone, collegeIdNumber, faceDescriptor: activeFace, deviceFingerprint, ip,
    });

    if (fraudCheck.blocked) {
      let specificMessage = "We could not create this account — it looks like it may already exist.";
      if (fraudCheck.reasons.includes("EMAIL_EXISTS")) {
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser && otp) {
          if (activeFace && (!existingUser.faceDescriptor || existingUser.faceDescriptor.length === 0)) {
            existingUser.faceDescriptor = activeFace;
          }
          if (resolvedCollege && !existingUser.college) {
            existingUser.college = resolvedCollege.name;
            existingUser.collegeId = resolvedCollege._id;
          }
          existingUser.lastActiveAt = new Date();
          await existingUser.save();
          const token = generateToken(existingUser);
          return res.json({
            success: true,
            token,
            user: existingUser,
            message: "Welcome back! Signed into your existing account 🎉",
          });
        }
        specificMessage = "An account with this email address already exists. Please switch to Sign In to log in.";
      } else if (fraudCheck.reasons.includes("PHONE_EXISTS")) {
        specificMessage = "This phone number is already registered under another account.";
      } else if (fraudCheck.reasons.includes("ID_NUMBER_EXISTS")) {
        specificMessage = "This College ID / USN is already registered.";
      } else if (fraudCheck.reasons.includes("FACE_MATCH")) {
        specificMessage = "This face scan matches another registered user account.";
      }

      return res.status(409).json({
        error: specificMessage,
        code: "DUPLICATE_ACCOUNT",
        reasons: fraudCheck.reasons,
      });
    }

    const avatar = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    let referralCode;
    let attempts = 0;
    do {
      referralCode = generateReferralCode();
      attempts++;
    } while (await User.findOne({ referralCode }) && attempts < 10);

    let referredBy = "";
    if (refCode) {
      const referrer = await User.findOne({ referralCode: refCode.toUpperCase() });
      if (referrer) referredBy = refCode.toUpperCase();
    }

    const phoneHash = phone ? hashIdentifier(phone) : undefined;
    const idNumberHash = collegeIdNumber ? hashIdentifier(collegeIdNumber) : undefined;
    const finalPassword = password || crypto.randomBytes(16).toString("hex");

    const user = await User.create({
      name,
      email: cleanEmail,
      password: finalPassword,
      bio: bio || "",
      avatar,
      role: "student",
      college: resolvedCollege ? resolvedCollege.name : (collegeName || ""),
      collegeId: resolvedCollege ? resolvedCollege._id : null,
      collegeIdNumber: collegeIdNumber || "",
      wallet: wallet || "",
      credits: 10,
      earned: 0,
      spent: 0,
      aictePoints: 0,
      rep: 0,
      reviews: 0,
      level: 1,
      xp: 0,
      referralCode,
      referredBy,
      welcomeShown: false,
      faceDescriptor: activeFace,
      deviceFingerprints: deviceFingerprint ? [deviceFingerprint] : [],
      phoneHash,
      idNumberHash,
      registrationIp: ip,
      verificationStatus: fraudCheck.flagged ? "flagged" : "pending",
      riskScore: fraudCheck.riskScore,
      flaggedReasons: fraudCheck.reasons,
    });

    if (fraudCheck.flagged) {
      await FraudReview.create({
        type: "user",
        targetId: user._id,
        userId: user._id,
        riskScore: fraudCheck.riskScore,
        reasons: fraudCheck.reasons,
        status: "pending",
      });

      await pushNotification(user._id, {
        type: "flagged_review",
        title: "Student Account Under Review ⚠️",
        body: "Your account triggered a soft security check and has been routed to your institute administrator for verification.",
        data: { reasons: fraudCheck.reasons },
      });
    }

    await ensureInitialCreditsRecorded(user);

    await pushNotification(user._id, {
      type: "welcome",
      title: "Welcome to TimeBank Student Network! 🎓",
      body: "You've received 10 starter credits. Start exchanging skills and earn AICTE activity points!",
      data: { credits: 10 },
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user,
      message: fraudCheck.flagged ? "Submitted for review." : "Student account created successfully.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Registration failed." });
  }
});

// ─── GENERAL USER REGISTRATION ───────────────────────────────────────────────
r.post("/auth/register/general", async (req, res) => {
  try {
    const {
      name, email, password, bio, wallet, referralCode: refCode,
      faceDescriptor, faceEmbedding, deviceFingerprint, phone, otp,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Full name and email address are required." });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify OTP if provided
    if (otp) {
      const validOtp = await Otp.findOne({
        email: cleanEmail,
        code: otp.trim(),
        createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) },
      }).sort({ createdAt: -1 });
      if (!validOtp) {
        return res.status(400).json({ error: "Invalid or expired email verification code." });
      }
      validOtp.used = true;
      await validOtp.save();
    }

    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "";
    const activeFace = faceDescriptor || faceEmbedding;

    const fraudCheck = await checkDuplicateRegistration({
      email: cleanEmail, phone, faceDescriptor: activeFace, deviceFingerprint, ip,
    });

    if (fraudCheck.blocked) {
      let specificMessage = "We could not create this account — it looks like it may already exist.";
      if (fraudCheck.reasons.includes("EMAIL_EXISTS")) {
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser && otp) {
          if (activeFace && (!existingUser.faceDescriptor || existingUser.faceDescriptor.length === 0)) {
            existingUser.faceDescriptor = activeFace;
          }
          existingUser.lastActiveAt = new Date();
          await existingUser.save();
          const token = generateToken(existingUser);
          return res.json({
            success: true,
            token,
            user: existingUser,
            message: "Welcome back! Signed into your existing account 🎉",
          });
        }
        specificMessage = "An account with this email address already exists. Please switch to Sign In to log in.";
      } else if (fraudCheck.reasons.includes("PHONE_EXISTS")) {
        specificMessage = "This phone number is already registered under another account.";
      } else if (fraudCheck.reasons.includes("FACE_MATCH")) {
        specificMessage = "This face scan matches another registered user account.";
      }

      return res.status(409).json({
        error: specificMessage,
        code: "DUPLICATE_ACCOUNT",
        reasons: fraudCheck.reasons,
      });
    }

    const avatar = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    let referralCode;
    let attempts = 0;
    do {
      referralCode = generateReferralCode();
      attempts++;
    } while (await User.findOne({ referralCode }) && attempts < 10);

    let referredBy = "";
    if (refCode) {
      const referrer = await User.findOne({ referralCode: refCode.toUpperCase() });
      if (referrer) referredBy = refCode.toUpperCase();
    }

    const phoneHash = phone ? hashIdentifier(phone) : undefined;
    const finalPassword = password || crypto.randomBytes(16).toString("hex");

    const user = await User.create({
      name,
      email: cleanEmail,
      password: finalPassword,
      bio: bio || "",
      avatar,
      role: "general_user",
      college: "",
      wallet: wallet || "",
      credits: 10,
      earned: 0,
      spent: 0,
      aictePoints: 0,
      rep: 0,
      reviews: 0,
      level: 1,
      xp: 0,
      referralCode,
      referredBy,
      welcomeShown: false,
      faceDescriptor: activeFace,
      deviceFingerprints: deviceFingerprint ? [deviceFingerprint] : [],
      phoneHash,
      registrationIp: ip,
      verificationStatus: fraudCheck.flagged ? "flagged" : "verified",
      riskScore: fraudCheck.riskScore,
      flaggedReasons: fraudCheck.reasons,
    });

    if (fraudCheck.flagged) {
      await FraudReview.create({
        type: "user",
        targetId: user._id,
        userId: user._id,
        riskScore: fraudCheck.riskScore,
        reasons: fraudCheck.reasons,
        status: "pending",
      });

      await pushNotification(user._id, {
        type: "flagged_review",
        title: "Account Under Review ⚠️",
        body: "Your account triggered a soft security check and has been queued for administrator verification.",
        data: { reasons: fraudCheck.reasons },
      });
    }

    await ensureInitialCreditsRecorded(user);

    await pushNotification(user._id, {
      type: "welcome",
      title: "Welcome to TimeBank! 🎉",
      body: "You've received 10 starter credits to begin exchanging skills!",
      data: { credits: 10 },
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user,
      message: fraudCheck.flagged ? "Submitted for review." : "Account created successfully.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Registration failed." });
  }
});

// ─── GENERAL REGISTRATION (Backward Compatible) ──────────────────────────────
r.post("/auth/register", async (req, res) => {
  try {
    const { role } = req.body;
    if (role === "student" || req.body.college || req.body.collegeId) {
      // Delegate to student registration logic
      req.url = "/auth/register/student";
      return r.handle(req, res);
    }
    req.url = "/auth/register/general";
    return r.handle(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── ADMIN VERIFICATION & FLAGGED ACCOUNTS ────────────────────────────────────
r.get("/admin/flagged-accounts", requireAuth, requireRole("super_admin", "websiteAdmin", "institute_admin", "collegeAdmin"), async (req, res) => {
  try {
    let query = { verificationStatus: { $in: ["flagged", "pending"] } };
    if (req.user.role === "institute_admin" || req.user.role === "collegeAdmin") {
      query = {
        role: "student",
        verificationStatus: { $in: ["flagged", "pending"] },
        college: req.user.college,
      };
    }
    const flagged = await User.find(query)
      .select("name email role college collegeIdNumber riskScore flaggedReasons verificationStatus createdAt")
      .populate("collegeId", "name emailDomain")
      .sort({ createdAt: -1 });
    res.json(flagged);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/admin/verify/:userId", requireAuth, requireRole("super_admin", "websiteAdmin", "institute_admin", "collegeAdmin"), async (req, res) => {
  try {
    const { decision, reason } = req.body; // 'approve' | 'reject' | 'block'
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ error: "User not found." });

    if (req.user.role === "institute_admin" || req.user.role === "collegeAdmin") {
      if (target.role !== "student" || String(target.college).toLowerCase() !== String(req.user.college).toLowerCase()) {
        return res.status(403).json({ error: "Access denied. You can only verify students from your college." });
      }
    }

    target.verificationStatus = decision === "approve" ? "verified" : "rejected";
    if (decision === "block") {
      target.isBlocked = true;
    }
    target.reviewedBy = req.user.id;
    target.reviewedAt = new Date();
    if (decision !== "approve") target.rejectionReason = reason || "Verification not granted";
    if (decision === "approve") target.riskScore = 0;
    await target.save();

    // Push real-time notification to user
    await pushNotification(target._id, {
      type: "verification_decision",
      title: decision === "approve" ? "You're Verified! 🎉" : "Verification Update ⚠️",
      body: decision === "approve"
        ? "Your account has been officially verified. You have full access to peer exchanges!"
        : (reason || "Please check with your institute administrator."),
      data: { decision, reviewedAt: target.reviewedAt },
    });

    res.json({ message: `Account ${decision}d.`, user: target });
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

// ─── FACE VERIFICATION ENDPOINTS ──────────────────────────────────────────────

// Enroll or update face descriptor (authenticated)
r.post("/auth/face-verify", requireAuth, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: "Invalid face descriptor" });
    }

    // Check if this face belongs to a different user
    const allUsersWithFace = await User.find({ faceDescriptor: { $exists: true, $ne: [] }, _id: { $ne: req.user.id } });
    for (const existing of allUsersWithFace) {
      const dist = euclideanDistance(faceDescriptor, existing.faceDescriptor);
      if (dist <= FACE_MATCH_THRESHOLD) {
        return res.status(409).json({ error: "This face is already associated with another account." });
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, { faceDescriptor }, { new: true });
    res.json({ ok: true, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Check face against stored descriptor (authenticated)
r.post("/auth/face-check", requireAuth, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: "Invalid face descriptor" });
    }
    const user = await User.findById(req.user.id);
    if (!user || !user.faceDescriptor || user.faceDescriptor.length !== 128) {
      return res.json({ match: false, distance: null, enrolled: false });
    }
    const distance = euclideanDistance(faceDescriptor, user.faceDescriptor);
    res.json({ match: distance <= FACE_MATCH_THRESHOLD, distance, enrolled: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mark welcome shown
r.post("/auth/welcome-shown/:userId", async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { welcomeShown: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GRADUATE / ALUMNI TRANSITION ENDPOINT ────────────────────────────────────
r.post("/user/graduate", requireAuth, async (req, res) => {
  try {
    const { graduationYear, personalEmail, otp, bio } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Handle personal email transition if provided and different
    if (personalEmail && personalEmail.toLowerCase().trim() !== user.email) {
      const cleanPersonal = personalEmail.toLowerCase().trim();
      const existingUser = await User.findOne({ email: cleanPersonal, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(409).json({ error: "This personal email address is already linked to another TimeBank account." });
      }

      if (otp) {
        const validOtp = await Otp.findOne({
          email: cleanPersonal,
          code: String(otp).trim(),
          createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) },
        }).sort({ createdAt: -1 });

        if (!validOtp) {
          return res.status(400).json({ error: "Invalid or expired verification code for personal email." });
        }
        validOtp.used = true;
        await validOtp.save();
      }

      user.collegeEmail = user.email; // preserve historical college email
      user.email = cleanPersonal; // update primary login email
    }

    // Preserve alma mater and convert role
    if (user.college && !user.almaMater) {
      user.almaMater = user.college;
    }
    user.isAlumni = true;
    user.graduatedAt = new Date();
    user.graduationYear = parseInt(graduationYear, 10) || new Date().getFullYear();
    user.role = "general_user";
    if (bio) user.bio = bio;

    // Add Alumni Badge
    if (!user.badges) user.badges = [];
    if (!user.badges.includes("🎓 Verified Alumni")) {
      user.badges.push("🎓 Verified Alumni");
    }

    await user.save();

    const token = generateToken(user);
    res.json({
      success: true,
      message: `🎉 Congratulations on graduating! Your account has been upgraded to a Verified Alumni General Account from ${user.almaMater || user.college}.`,
      user,
      token,
    });
  } catch (e) {
    console.error("Graduation transition error:", e);
    res.status(500).json({ error: e.message || "Failed to process graduation transition." });
  }
});

// ─── 1-CLICK INSTANT TESTNET FAUCET / GAS STATION ───────────────────────────
const DAILY_DRIP_LIMIT = 5; // Exactly 5 claims per 24 hours (0.25 POL total)
const COOLDOWN_MS = 60 * 1000; // 60s cooldown between claims

r.get("/faucet/status", async (req, res) => {
  try {
    const status = await relayer.getRelayerStatus();
    let claimsRemaining = DAILY_DRIP_LIMIT;
    let claimsMade = 0;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          const now = Date.now();
          const resetTime = user.gasClaims?.resetAt ? new Date(user.gasClaims.resetAt).getTime() : 0;
          if (now < resetTime) {
            claimsMade = user.gasClaims?.count || 0;
            claimsRemaining = Math.max(0, DAILY_DRIP_LIMIT - claimsMade);
          }
        }
      } catch (err) {
        console.warn("[Faucet Status] JWT Decode warn:", err.message);
      }
    }

    res.json({
      ...status,
      dailyLimit: DAILY_DRIP_LIMIT,
      amountPerClaim: "0.05 POL",
      claimsMadeToday: claimsMade,
      claimsRemainingToday: claimsRemaining,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post("/faucet/drip", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const targetAddress = req.body.address || user.wallet;
    if (!targetAddress) {
      return res.status(400).json({ error: "No wallet address specified for gas drip." });
    }

    const now = Date.now();
    const resetTime = user.gasClaims?.resetAt ? new Date(user.gasClaims.resetAt).getTime() : 0;
    const lastTime = user.gasClaims?.lastClaimAt ? new Date(user.gasClaims.lastClaimAt).getTime() : 0;

    // Reset daily counter if window has passed or not initialized
    if (!user.gasClaims || now >= resetTime) {
      user.gasClaims = {
        count: 0,
        resetAt: new Date(now + 24 * 60 * 60 * 1000),
        lastClaimAt: null,
      };
    }

    // 1. Strict Check: Maximum 5 claims per day
    if (user.gasClaims.count >= DAILY_DRIP_LIMIT) {
      const hoursLeft = Math.max(1, Math.ceil((new Date(user.gasClaims.resetAt).getTime() - now) / (60 * 60 * 1000)));
      return res.status(429).json({
        error: `Daily gas limit reached (${DAILY_DRIP_LIMIT}/${DAILY_DRIP_LIMIT} claims used today). Resets in ~${hoursLeft} hour(s).`,
        dailyLimitReached: true,
        claimsRemainingToday: 0,
        claimsMadeToday: DAILY_DRIP_LIMIT,
      });
    }

    // 2. Cooldown check
    if (lastTime && now - lastTime < COOLDOWN_MS) {
      const waitSecs = Math.ceil((COOLDOWN_MS - (now - lastTime)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSecs}s before claiming gas again.` });
    }

    const dripRes = await relayer.dripGas(targetAddress, "0.05");
    
    // Update user gas claims counter & POL balance in MongoDB
    user.gasClaims.count += 1;
    user.gasClaims.lastClaimAt = new Date(now);
    user.polBalance = Number(((user.polBalance || 0) + 0.05).toFixed(4));
    await user.save();

    const claimsRemaining = Math.max(0, DAILY_DRIP_LIMIT - user.gasClaims.count);

    // Record on transaction log
    await Transaction.create({
      fromId: "SYSTEM",
      toId: user._id.toString(),
      bookingId: null,
      amount: 0.05,
      type: "gas_faucet_claim",
      desc: `1-Click Gas Claim — 0.05 POL (Claim ${user.gasClaims.count}/${DAILY_DRIP_LIMIT})`,
      txHash: dripRes.txHash,
      blockNumber: dripRes.blockNumber,
    });

    // Record on blockchain ledger
    let bcEntry = null;
    if (dripRes.txHash && dripRes.blockNumber) {
      bcEntry = await Blockchain.create({
        block: dripRes.blockNumber,
        txHash: dripRes.txHash,
        from: "FAUCET_TREASURY",
        to: targetAddress,
        amount: 0.05,
        type: "GAS_DRIP",
      });
      broadcastRealtimeEvent("blockchain_ledger_entry", bcEntry);
    }

    // Broadcast real-time event for UI sync
    broadcastRealtimeEvent("faucet_drip", {
      userId,
      address: targetAddress,
      txHash: dripRes.txHash,
      amount: "0.05",
      polBalance: user.polBalance,
      claimsMadeToday: user.gasClaims.count,
      claimsRemainingToday: claimsRemaining,
      entry: bcEntry,
    });

    broadcastRealtimeEvent("wallet_update", {
      userId,
      polBalance: user.polBalance,
      claimsRemainingToday: claimsRemaining,
    });

    res.json({
      ...dripRes,
      polBalance: user.polBalance,
      claimsMadeToday: user.gasClaims.count,
      claimsRemainingToday: claimsRemaining,
      dailyLimit: DAILY_DRIP_LIMIT,
      entry: bcEntry,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── BLOCKCHAIN LEDGER ENDPOINTS ─────────────────────────────────────────────
r.get("/blockchain", async (_req, res) => {
  try {
    const records = await Blockchain.find().sort({ createdAt: -1 }).limit(100);
    res.json(records);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.get("/blockchain/user/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    const records = await Blockchain.find({
      $or: [{ from: wallet }, { to: wallet }]
    }).sort({ createdAt: -1 });
    res.json(records);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GASLESS BLOCKCHAIN RELAY ENDPOINT ───────────────────────────────────────
r.post("/blockchain/relay-transfer", requireAuth, async (req, res) => {
  try {
    const { toAddress, credits, bookingId } = req.body;
    const relayRes = await relayer.relayCreditTransfer(toAddress, credits || 1, {
      bookingId,
      senderId: req.user.id,
    });

    broadcastRealtimeEvent("blockchain_relay", {
      toAddress,
      txHash: relayRes.txHash,
      blockNumber: relayRes.blockNumber,
    });

    res.json(relayRes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

// ── Public Enhanced Profile ──
r.get("/users/:id/profile", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -email -phone -wallet");
    if (!user) return res.status(404).json({ error: "User not found" });

    const activeServices = await Service.find({ providerId: req.params.id, status: "active" }).populate("skillId");
    const pastReviews = await Review.find({ revieweeId: req.params.id, direction: "requester_to_provider" })
      .populate("reviewerId", "name avatar avatarUrl")
      .populate("serviceId", "title category")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ user, activeServices, pastReviews });
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
    const { requesterId, providerId, hours, deviceFingerprint } = req.body;
    const requester = await User.findById(requesterId);
    if (!requester) return res.status(404).json({ error: "Requester not found" });

    // Transaction Fraud & Wash-Trading Check
    const txRisk = await calculateTransactionRisk({
      senderId: requesterId,
      receiverId: providerId,
      deviceFingerprint,
    });

    if (txRisk.blocked) {
      return res.status(403).json({
        error: `Booking blocked due to security risk detection (${txRisk.reasons.join(", ")}).`,
        code: "TRANSACTION_RISK_BLOCKED",
        reasons: txRisk.reasons,
      });
    }

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
    const requester = await User.findById(booking.requesterId);
    const provider = await User.findById(booking.providerId);

    if (requester && (!requester.wallet || !requester.wallet.startsWith("0x"))) {
      requester.wallet = ethers.Wallet.createRandom().address;
      await requester.save();
    }
    if (provider && (!provider.wallet || !provider.wallet.startsWith("0x"))) {
      provider.wallet = ethers.Wallet.createRandom().address;
      await provider.save();
    }

    let finalTxHash = txHash || null;
    let finalBlockNumber = blockNumber || null;
    let isStateProof = false;

    if (!finalTxHash && provider?.wallet) {
      try {
        const relayRes = await relayer.relayCreditTransfer(provider.wallet, booking.hours, {
          bookingId: booking._id,
          from: requester?.wallet,
          to: provider?.wallet,
          type: "service_completion",
        });
        finalTxHash = relayRes.txHash;
        finalBlockNumber = relayRes.blockNumber;
        isStateProof = Boolean(relayRes.isStateProof);
      } catch (err) {
        console.warn("[Booking] Relayer auto-execution fallback:", err.message);
        const mock = generateMockTx();
        finalTxHash = mock.txHash;
        finalBlockNumber = mock.blockNumber;
        isStateProof = true;
      }
    }

    // Update booking status
    booking.status = "completed";
    booking.providerConfirmed = true;
    booking.requesterConfirmed = true;
    booking.txHash = finalTxHash;
    booking.blockNumber = finalBlockNumber;
    booking.escrowHeld = false;
    await booking.save();

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
    const newTx = await Transaction.create({
      fromId: booking.requesterId.toString(),
      toId: booking.providerId.toString(),
      bookingId: booking._id,
      amount: booking.hours,
      type: "service_completed",
      desc: `Service completed: ${booking.serviceId?.title || "Skill Exchange"}`,
      txHash: finalTxHash,
      blockNumber: finalBlockNumber,
    });

    // Record blockchain entry on immutable ledger
    if (finalTxHash && finalBlockNumber) {
      const bcEntry = await Blockchain.create({
        block: finalBlockNumber,
        txHash: finalTxHash,
        from: requester?.wallet || booking.requesterId.toString(),
        to: provider?.wallet || booking.providerId.toString(),
        amount: booking.hours,
        type: "TRANSFER",
      });

      broadcastRealtimeEvent("blockchain_ledger_entry", bcEntry);
    }

    broadcastRealtimeEvent("wallet_update", {
      requesterId: booking.requesterId,
      providerId: booking.providerId,
    });

    res.json({
      booking,
      providerCredits: provider?.credits,
      requesterCredits: requester?.credits,
      providerLevel: provider?.level,
      levelUp: provider?.level > (req.body._oldProviderLevel || 0),
      txHash: finalTxHash,
      blockNumber: finalBlockNumber,
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

r.post("/reviews", requireAuth, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const isRequester = booking.requesterId.toString() === reviewerId;
    const isProvider = booking.providerId.toString() === reviewerId;

    if (!isRequester && !isProvider) {
      return res.status(403).json({ error: "You are not part of this booking" });
    }

    const revieweeId = isRequester ? booking.providerId : booking.requesterId;
    const direction = isRequester ? "requester_to_provider" : "provider_to_requester";

    const review = await Review.create({
      reviewerId,
      revieweeId,
      bookingId,
      serviceId: booking.serviceId || null,
      rating: Math.max(1, Math.min(5, Number(rating) || 5)),
      comment: comment || "",
      direction,
    });

    if (isRequester) {
      booking.requesterReviewed = true;
    }
    await booking.save();

    // Update reviewee rating & review count
    const allReviews = await Review.find({ revieweeId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / (allReviews.length || 1);
    const reviewee = await User.findById(revieweeId);
    if (reviewee) {
      reviewee.rep = Math.round(avg * 10) / 10;
      reviewee.reviews = allReviews.length;
      await reviewee.save();
    }

    await pushNotification(revieweeId, {
      type: "review",
      title: "New Review Received! ⭐",
      body: `You received a ${rating}★ review: "${comment || 'Great service!'}"`,
      data: { bookingId, rating },
    });

    res.status(201).json(review);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

// ─── AICTE & ACTIVITY POINTS ──────────────────────────────────────────────────
r.get("/aicte/activity-points", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const studentId = req.user.id;

    // Completed exchanges where user was provider or requester
    const completedBookings = await Booking.find({
      $or: [{ providerId: studentId }, { requesterId: studentId }],
      status: "completed",
    });

    const completedTxns = await Transaction.find({
      $or: [{ fromId: String(studentId) }, { toId: String(studentId) }],
      type: "service_completed",
    });

    const manualAicte = await Aicte.find({ userId: studentId, verified: true });
    const manualPts = manualAicte.reduce((sum, a) => sum + (a.pts || 0), 0);

    const bookingHours = completedBookings.reduce((sum, b) => sum + (b.hours || 0), 0);
    const totalHours = bookingHours > 0 ? bookingHours : completedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const exchangeCount = completedBookings.length > 0 ? completedBookings.length : completedTxns.length;
    
    // AICTE Activity Points scheme: 1 credit/hour = 1 point + bonus for verified workshops/projects
    const activityPoints = totalHours + manualPts;

    res.json({
      totalHours,
      activityPoints,
      exchangeCount,
      manualActivitiesCount: manualAicte.length,
      manualPoints: manualPts,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Issue Verifiable AICTE Certificate
r.post("/aicte/certificate/issue", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.body;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: "Please provide periodStart and periodEnd dates." });
    }

    const student = await User.findById(req.user.id);
    if (!student) return res.status(404).json({ error: "Student not found." });

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    endDate.setHours(23, 59, 59, 999);

    const completedBookings = await Booking.find({
      $or: [{ providerId: student._id }, { requesterId: student._id }],
      status: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const completedTxns = await Transaction.find({
      $or: [{ fromId: String(student._id) }, { toId: String(student._id) }],
      type: "service_completed",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const bookingHours = completedBookings.reduce((sum, b) => sum + (b.hours || 0), 0);
    const totalHours = bookingHours > 0 ? bookingHours : completedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const exchangeCount = completedBookings.length > 0 ? completedBookings.length : completedTxns.length;

    // Fetch verified academic activities in the period
    const manualAicte = await Aicte.find({
      userId: student._id,
      verified: true,
      createdAt: { $gte: startDate, $lte: endDate },
    });
    const manualPts = manualAicte.reduce((sum, a) => sum + (a.pts || 0), 0);
    const activityPoints = totalHours + manualPts;

    // Anchor on mock Polygon blockchain
    const { txHash, blockNumber } = generateMockTx();
    await Blockchain.create({
      block: blockNumber,
      txHash,
      from: student.wallet || student._id.toString(),
      to: "0x000000000000000000000000000000000000CERT",
      amount: activityPoints,
      type: "MINT_CERT",
    });

    const cert = await issueCertificate({
      userId: student._id,
      collegeId: student.collegeId || student.college,
      activityPoints,
      totalHours,
      exchangeCount,
      periodStart: startDate,
      periodEnd: endDate,
      txHash,
      blockNumber,
    });

    await pushNotification(student._id, {
      type: "badge",
      title: "AICTE Certificate Issued! 📜",
      body: `Your certificate for ${activityPoints} points has been cryptographically generated and anchored to Polygon Amoy.`,
      data: { certId: cert.certId, activityPoints, txHash },
    });

    res.status(201).json({
      certId: cert.certId,
      cert,
      message: "Certificate generated successfully.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to issue certificate." });
  }
});

// Download PDF Certificate
r.get("/aicte/certificate/:certId/download", async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certId: req.params.certId });
    if (!cert) return res.status(404).json({ error: "Certificate not found." });

    const student = await User.findById(cert.user);
    let college = null;
    if (cert.college) {
      if (typeof cert.college === "string" && cert.college.match(/^[0-9a-fA-F]{24}$/)) {
        college = await College.findById(cert.college);
      } else if (typeof cert.college === "string") {
        college = await College.findOne({ name: cert.college }) || { name: cert.college };
      } else {
        college = await College.findById(cert.college);
      }
    }
    if (!college && student?.college) {
      college = { name: student.college };
    }

    const host = req.get("host");
    const protocol = req.protocol;
    const clientUrl = process.env.CLIENT_URL || `${protocol}://${host}`;

    const pdfBuffer = await renderCertificatePdf(cert, student, college, clientUrl);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=aicte-certificate-${cert.certId.slice(0, 8)}.pdf`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PUBLIC Verification Endpoint — QR Code scan target
r.get("/aicte/verify/:certId", async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certId: req.params.certId });
    if (!cert) {
      return res.status(404).json({ valid: false, message: "Certificate not found or invalid ID." });
    }

    const student = await User.findById(cert.user).select("name email college");
    let collegeName = "Recognized Technical Institution";
    if (cert.college) {
      if (typeof cert.college === "string" && cert.college.match(/^[0-9a-fA-F]{24}$/)) {
        const colDoc = await College.findById(cert.college);
        if (colDoc) collegeName = colDoc.name;
      } else if (typeof cert.college === "string") {
        collegeName = cert.college;
      }
    } else if (student?.college) {
      collegeName = student.college;
    }

    const recomputed = computeHash({
      userId: cert.user,
      collegeId: cert.college,
      activityPoints: cert.activityPoints,
      totalHours: cert.totalHours,
      exchangeCount: cert.exchangeCount,
      periodStart: cert.periodStart,
      periodEnd: cert.periodEnd,
    });

    const isValid = recomputed === cert.integrityHash;

    res.json({
      valid: isValid,
      certId: cert.certId,
      studentName: student?.name || "Student",
      studentEmail: student?.email || "",
      college: collegeName,
      activityPoints: cert.activityPoints,
      totalHours: cert.totalHours,
      exchangeCount: cert.exchangeCount,
      period: {
        start: cert.periodStart,
        end: cert.periodEnd,
      },
      integrityHash: cert.integrityHash,
      txHash: cert.txHash,
      blockNumber: cert.blockNumber,
      issuedAt: cert.createdAt,
    });
  } catch (e) {
    res.status(500).json({ valid: false, error: e.message });
  }
});

// List certificates for a user
r.get("/aicte/certificates/user/:userId", requireAuth, async (req, res) => {
  try {
    const certs = await Certificate.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(certs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
r.get("/notifications", requireAuth, async (req, res) => {
  try {
    const notifs = await Notification.find({
      $or: [{ userId: req.user.id }, { user: req.user.id }],
    }).sort({ createdAt: -1 }).limit(50);
    res.json(notifs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.get("/notifications/user/:userId", async (req, res) => {
  try {
    const notifs = await Notification.find({
      $or: [{ userId: req.params.userId }, { user: req.params.userId }],
    }).sort({ createdAt: -1 }).limit(50);
    res.json(notifs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, $or: [{ userId: req.user.id }, { user: req.user.id }] },
      { read: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.put("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, $or: [{ userId: req.user.id }, { user: req.user.id }] },
      { read: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { $or: [{ userId: req.user.id }, { user: req.user.id }], read: false },
      { read: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.put("/notifications/read-all/:userId", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { $or: [{ userId: req.params.userId }, { user: req.params.userId }], read: false },
      { read: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.get("/aicte", requireAuth, requireRole(["websiteAdmin", "collegeAdmin", "super_admin", "institute_admin"]), async (req, res) => {
  try { 
    if (req.user.role === "collegeAdmin" || req.user.role === "institute_admin") {
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

// ── Reviews ──
r.post("/reviews", requireAuth, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.requesterId.toString() !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    if (booking.status !== "completed") return res.status(400).json({ error: "Booking must be completed to leave a review" });
    if (booking.requesterReviewed) return res.status(400).json({ error: "Already reviewed" });

    // Create review
    const review = await Review.create({
      reviewerId: req.user.id,
      revieweeId: booking.providerId,
      bookingId: booking._id,
      serviceId: booking.serviceId,
      rating: Number(rating),
      comment: comment || "",
      direction: "requester_to_provider"
    });

    // Update booking
    booking.requesterReviewed = true;
    await booking.save();

    // Update provider stats (recalculate rep and total reviews)
    const provider = await User.findById(booking.providerId);
    if (provider) {
      provider.reviews = (provider.reviews || 0) + 1;
      // Simple rolling average for rep, assuming rep is out of 5, or just raw sum. Currently rep in schema defaults to 0. Let's make rep the average rating scaled out of 100? No, rating is 1-5, so rep is 1-5.
      // Wait, let's just make rep the average rating.
      const allReviews = await Review.find({ revieweeId: provider._id, direction: "requester_to_provider" });
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      provider.rep = Math.round(avgRating * 10) / 10; // round to 1 decimal

      // Recompute level (rating may have changed)
      const newLevel = computeLevel(provider);
      const oldLevel = provider.level;

      // Check for demotion
      if (newLevel < oldLevel) {
        if (!provider.demotionWarned) {
          provider.demotionWarned = true;
          provider.demotionWarningAt = new Date();
          await createNotification(provider._id, "demotion_warning",
            "Level At Risk ⚠️",
            `Your rating has dropped. Maintain a ${LEVEL_CFG[oldLevel].ratingReq}+ rating to keep Level ${oldLevel}. You have 7 days to recover.`,
            { currentLevel: oldLevel, requiredRating: LEVEL_CFG[oldLevel].ratingReq }
          );
        } else {
          // Check if grace period (7 days) has passed
          const gracePeriod = 7 * 24 * 60 * 60 * 1000;
          if (provider.demotionWarningAt && (Date.now() - new Date(provider.demotionWarningAt).getTime()) > gracePeriod) {
            provider.level = newLevel;
            provider.demotionWarned = false;
            provider.demotionWarningAt = null;
            await createNotification(provider._id, "level_up",
              `Level Changed to ${newLevel}`,
              `Your level has been adjusted to "${LEVEL_CFG[newLevel].name}" due to rating changes.`,
              { oldLevel, newLevel, levelName: LEVEL_CFG[newLevel].name }
            );
          }
        }
      } else {
        provider.demotionWarned = false;
        provider.demotionWarningAt = null;
        if (newLevel > oldLevel) {
          provider.level = newLevel;
          await createNotification(provider._id, "level_up",
            `Level Up! 🎉 You're now Level ${newLevel}`,
            `Congratulations! You've reached "${LEVEL_CFG[newLevel].name}" status.`,
            { oldLevel, newLevel, levelName: LEVEL_CFG[newLevel].name }
          );
        }
      }

      provider.trustScore = computeTrustScore(provider);
      await provider.save();
      await checkAndAwardBadges(provider);
      
      const reviewer = await User.findById(req.user.id);
      if (reviewer) await checkAndAwardBadges(reviewer);
    }

    // Create Notification
    await Notification.create({
      userId: booking.providerId,
      type: "review",
      title: "New Review Received",
      message: `You received a ${rating}-star review for a completed service.`,
      data: { reviewId: review._id }
    });

    res.status(201).json(review);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ML-POWERED SKILL MATCHING ──────────────────────────────────────────────
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// AI Smart Recommendations (legacy — kept for backward compatibility)
r.get("/recommendations", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const activeServices = await Service.find({ status: "active" }).populate("providerId");
    // Simple heuristic fallback: return services not owned by the user
    const filtered = activeServices.filter(s => s.providerId && s.providerId._id.toString() !== req.user.id);
    res.json(filtered.slice(0, 6));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ML Skill Matching Recommendations
r.get("/ml-recommend", requireAuth, async (req, res) => {
  try {
    const { skill } = req.query;
    if (!skill) return res.status(400).json({ error: "Missing 'skill' query parameter" });

    // Find all users who have the requested skill (or related skills)
    const allUsers = await User.find({ _id: { $ne: req.user.id } });
    
    // Build candidate list with stats from the DB
    const candidates = [];
    for (const u of allUsers) {
      const userSkills = u.skills || ["General"];
      // if (userSkills.length === 0) continue; // Removed so users without skills still show up in ML matches

      // Count transactions
      const bookingsAsProvider = await Booking.find({ providerId: u._id });
      const completedBookings = bookingsAsProvider.filter(b => b.status === "completed");
      const cancelledBookings = bookingsAsProvider.filter(b => b.status === "cancelled");
      const totalBookings = bookingsAsProvider.length;

      candidates.push({
        user_id: u._id.toString(),
        name: u.name,
        skills: userSkills,
        rating: u.rep || 3.0,
        experience_years: Math.max(0, Math.floor((Date.now() - new Date(u.createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000))),
        completion_rate: totalBookings > 0 ? completedBookings.length / totalBookings : 0.5,
        cancellation_rate: totalBookings > 0 ? cancelledBookings.length / totalBookings : 0.0,
        response_rate: u.responseTime ? Math.max(0.1, 1 - u.responseTime / 1440) : 0.5,
        previous_transactions: totalBookings,
        successful_transactions: completedBookings.length,
        reputation_score: u.trustScore || 50,
        time_credits: u.credits || 0,
        availability: u.availability || "offline",
        distance_km: Math.round(Math.random() * 15 * 10) / 10, // Simulated since no geo data
        avatar: u.avatar || "",
        avatarUrl: u.avatarUrl || "",
      });
    }

    if (candidates.length === 0) {
      return res.json({ recommendations: [], model_type: "none", total_candidates: 0 });
    }

    // Call the ML FastAPI service
    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/api/ml/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requested_skill: skill, candidates }),
      });

      if (mlResponse.ok) {
        const mlData = await mlResponse.json();
        return res.json(mlData);
      }
    } catch (mlError) {
      console.log("ML service unavailable, using heuristic fallback:", mlError.message);
    }

    // Fallback: simple heuristic scoring
    const fallbackResults = candidates.map(c => {
      const hasSkill = c.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()));
      const score = (hasSkill ? 40 : 10) + (c.rating / 5) * 20 + c.completion_rate * 20 + (c.successful_transactions * 2);
      return {
        ...c,
        match_score: Math.min(99, Math.round(score)),
        reasons: [
          hasSkill ? "Skill match" : "Related experience",
          `${c.rating}/5 rating`,
          `${Math.round(c.completion_rate * 100)}% completion rate`,
        ],
        skill_similarity: hasSkill ? 0.9 : 0.3,
      };
    }).sort((a, b) => b.match_score - a.match_score).slice(0, 10);

    res.json({ recommendations: fallbackResults, model_type: "heuristic_fallback", total_candidates: candidates.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ML Dashboard metrics (proxied from FastAPI)
r.get("/ml-dashboard", requireAuth, async (req, res) => {
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/api/ml/dashboard`);
    if (mlResponse.ok) {
      const data = await mlResponse.json();
      return res.json(data);
    }
    res.json({ status: "offline", message: "ML service is not running" });
  } catch (e) {
    res.json({ status: "offline", message: "ML service is not running" });
  }
});

// ML Health check
r.get("/ml-health", async (_req, res) => {
  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/api/ml/health`);
    if (mlResponse.ok) return res.json(await mlResponse.json());
    res.json({ status: "offline" });
  } catch (e) { res.json({ status: "offline" }); }
});


// Admin verify AICTE activity (AI OCR validation)
r.post("/aicte/:id/ai-verify", requireAuth, requireRole(["websiteAdmin", "collegeAdmin"]), async (req, res) => {
  try {
    const activity = await Aicte.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    const user = await User.findById(activity.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (req.user.role === "collegeAdmin" && activity.college !== req.user.college) {
      return res.status(403).json({ error: "Cannot verify activity outside your college" });
    }

    const { score, feedback } = await verifyAicteCertificate(activity.certUrl, user.name, activity.title);
    
    activity.aiScore = score;
    activity.aiFeedback = feedback;
    await activity.save();

    res.json(activity);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI Chatbot
r.post("/ai-chat", requireAuth, async (req, res) => {
  try {
    const { history, message } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const reply = await handleWebsiteChat(history, message, user);
    res.json({ reply });
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

    const finalCredits = credits !== undefined ? credits : (activity.credits || 1);
    const finalPts = pts !== undefined ? pts : (activity.pts || 1);

    let finalTxHash = txHash || null;
    let finalBlockNumber = blockNumber || null;

    if (!finalTxHash && (user?.wallet || activity.userId)) {
      try {
        const relayRes = await relayer.relayCreditTransfer(
          user?.wallet || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          finalCredits,
          { aicteId: activity._id, title: activity.title }
        );
        finalTxHash = relayRes.txHash;
        finalBlockNumber = relayRes.blockNumber;
      } catch (err) {
        console.warn("[AICTE] Relayer auto-execution fallback:", err.message);
      }
    }

    activity.verified = true;
    activity.txHash = finalTxHash;
    activity.blockNumber = finalBlockNumber;
    activity.pts = finalPts;
    activity.credits = finalCredits;
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
      fromId: "SYSTEM",
      toId: activity.userId.toString(),
      bookingId: null,
      amount: activity.credits,
      type: "aicte_reward",
      desc: `AICTE Verified: ${activity.title}`,
      txHash: finalTxHash,
      blockNumber: finalBlockNumber,
    });

    if (finalTxHash && finalBlockNumber) {
      const bcEntry = await Blockchain.create({
        block: finalBlockNumber,
        txHash: finalTxHash,
        from: "SYSTEM_AICTE_AUTHORITY",
        to: user?.wallet || activity.userId.toString(),
        amount: activity.credits,
        type: "MINT",
      });

      broadcastRealtimeEvent("blockchain_ledger_entry", bcEntry);
    }

    broadcastRealtimeEvent("wallet_update", { userId: activity.userId });

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

// ─── ADMIN FRAUD QUEUE ENDPOINTS ─────────────────────────────────────────────
r.get("/website-admin/fraud-queue", requireAuth, requireRole(["websiteAdmin"]), async (_req, res) => {
  try {
    const items = await FraudReview.find({ status: "pending" })
      .populate("userId", "name email college faceDescriptor verificationStatus riskScore flaggedReasons")
      .populate("senderId", "name email")
      .populate("receiverId", "name email")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/website-admin/fraud-review/:id/action", requireAuth, requireRole(["websiteAdmin"]), async (req, res) => {
  try {
    const { action, note } = req.body; // action: "approve" | "block"
    const item = await FraudReview.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Fraud review item not found" });

    item.status = action === "approve" ? "approved" : "rejected";
    item.reviewedBy = req.user.id;
    item.reviewedAt = new Date();
    item.note = note || "";
    await item.save();

    if (item.type === "user" && item.userId) {
      const user = await User.findById(item.userId);
      if (user) {
        if (action === "approve") {
          user.verificationStatus = "verified";
          user.riskScore = 0;
          await user.save();
          await createNotification(user._id, "welcome", "Account Verified ✅", "An administrator has verified your account.", {});
        } else if (action === "block") {
          user.verificationStatus = "rejected";
          user.isBlocked = true;
          await user.save();
          await createNotification(user._id, "restriction", "Account Suspended 🚫", "Your account has been rejected following fraud review.", {});
        }
      }
    }
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.get("/college-admin/fraud-queue", requireAuth, requireRole(["collegeAdmin"]), async (req, res) => {
  try {
    const collegeUsers = await User.find({ college: req.user.college }).select("_id");
    const userIds = collegeUsers.map((u) => u._id);
    const items = await FraudReview.find({ status: "pending", userId: { $in: userIds } })
      .populate("userId", "name email college verificationStatus riskScore flaggedReasons")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/college-admin/fraud-review/:id/action", requireAuth, requireRole(["collegeAdmin"]), async (req, res) => {
  try {
    const { action, note } = req.body;
    const item = await FraudReview.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Fraud review item not found" });

    item.status = action === "approve" ? "approved" : "rejected";
    item.reviewedBy = req.user.id;
    item.reviewedAt = new Date();
    item.note = note || "";
    await item.save();

    if (item.type === "user" && item.userId) {
      const user = await User.findById(item.userId);
      if (user) {
        if (action === "approve") {
          user.verificationStatus = "verified";
          user.riskScore = 0;
          await user.save();
          await createNotification(user._id, "welcome", "Account Verified ✅", "Your college admin has verified your account.", {});
        } else if (action === "block") {
          user.verificationStatus = "rejected";
          user.isBlocked = true;
          await user.save();
          await createNotification(user._id, "restriction", "Account Suspended 🚫", "Your account has been rejected following fraud review.", {});
        }
      }
    }
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── AI WEBSITE CHATBOT ENDPOINT ─────────────────────────────────────────────
r.post("/ai-chat", async (req, res) => {
  try {
    const { history, message } = req.body;
    let currentUser = { name: "Guest User", role: "user" };
    
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "timebank_secret_key");
          const dbUser = await User.findById(decoded.id);
          if (dbUser) currentUser = dbUser;
        }
      } catch {}
    }

    const reply = await handleWebsiteChat(history || [], message || "", currentUser);
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;

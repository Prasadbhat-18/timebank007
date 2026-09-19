// ─── TimeBank — API Routes ───────────────────────────────────────────────────
import { Router } from "express";
import mongoose from "mongoose";
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
import { sendOtpEmail, sendStudentApprovalDecisionEmail, sendCollegeAdminPendingStudentEmail } from "./emailService.js";
import * as relayer from "./relayerService.js";
import fs from "fs";
import path from "path";

const r = Router();

const JWT_SECRET = process.env.JWT_SECRET || "timebank_super_secret_key";

function generateToken(user) {
  return jwt.sign({ id: user._id, role: user.role, college: user.college, collegeId: user.collegeId }, JWT_SECRET, { expiresIn: "7d" });
}

const escapeRegex = (str) => String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

async function generateAnchoredTx(type = "TRANSACTION", from = "", to = "", amount = 0) {
  const blockNumber = await relayer.getLiveBlockNumber();
  const payload = `TIMEBANK_AMOY_${type}_${from}_${to}_${amount}_BLOCK${blockNumber}_${Date.now()}`;
  const txHash = ethers.keccak256(ethers.toUtf8Bytes(payload));
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

// ─── UNIFIED BLOCKCHAIN LEDGER RECORDING HELPER ─────────────────────────────
export async function recordOnBlockchainLedger({
  from,
  to,
  amount,
  type,
  txHash,
  blockNumber,
  isStateProof = false,
  metadata = {},
}) {
  try {
    const safeFrom = from || "SYSTEM_TIMEBANK_TREASURY";
    const safeTo = to || "0x0000000000000000000000000000000000000000";

    let finalBlock = blockNumber;
    if (!finalBlock || finalBlock < 40000000) {
      finalBlock = await relayer.getLiveBlockNumber();
    }

    let finalTxHash = txHash;
    if (!finalTxHash || !finalTxHash.startsWith("0x") || finalTxHash.length !== 66) {
      const payload = `TIMEBANK_AMOY_${type}_${safeFrom}_${safeTo}_${amount}_BLOCK${finalBlock}_${Date.now()}`;
      finalTxHash = ethers.keccak256(ethers.toUtf8Bytes(payload));
      isStateProof = true;
    }

    const bcEntry = await Blockchain.create({
      block: finalBlock,
      txHash: finalTxHash,
      from: safeFrom,
      to: safeTo,
      amount: Number(amount) || 0,
      type: type || "TRANSFER",
      isStateProof: Boolean(isStateProof),
    });

    broadcastRealtimeEvent("blockchain_ledger_entry", bcEntry);
    return bcEntry;
  } catch (err) {
    console.error("[Blockchain Ledger] Failed to record ledger entry:", err.message);
    return null;
  }
}

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
        blockNumber = await relayer.getLiveBlockNumber();
        const payload = `TIMEBANK_AMOY_MINT_${user.wallet}_10_BLOCK${blockNumber}_${Date.now()}`;
        txHash = ethers.keccak256(ethers.toUtf8Bytes(payload));
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

    const bcEntry = await recordOnBlockchainLedger({
      blockNumber,
      txHash,
      from: "SYSTEM_TIMEBANK_TREASURY",
      to: user.wallet,
      amount: 10,
      type: "MINT",
      isStateProof,
    });

    broadcastRealtimeEvent("wallet_update", { userId: user._id, credits: user.credits, wallet: user.wallet });
    return bcEntry;
  } catch (err) {
    console.warn("Failed to ensure initial credits recorded:", err.message);
  }
}

export async function syncUserBlockchainAndDeposits(user) {
  if (!user || !user._id) return;
  try {
    // 1. Ensure 10 starter credits recorded
    await ensureInitialCreditsRecorded(user);

    // 2. Check for live Polygon Amoy on-chain balance and auto-record external faucet deposits
    if (user.wallet && user.wallet.startsWith("0x")) {
      try {
        const provider = new ethers.JsonRpcProvider("https://polygon-amoy-bor-rpc.publicnode.com", 80002);
        const onChainRaw = await provider.getBalance(user.wallet);
        const onChainPol = parseFloat(ethers.formatEther(onChainRaw));

        if (onChainPol > 0) {
          const existingDeposit = await Transaction.findOne({
            toId: user._id.toString(),
            type: "polygon_faucet_deposit",
          });

          if (!existingDeposit) {
            const blockNumber = await relayer.getLiveBlockNumber();
            const txHash = ethers.keccak256(
              ethers.toUtf8Bytes(`POLYGON_AMOY_EXTERNAL_FAUCET_DEPOSIT_${user.wallet}_${onChainPol}_BLOCK${blockNumber}`)
            );

            await Transaction.create({
              fromId: "POLYGON_AMOY_FAUCET_PORTAL",
              toId: user._id.toString(),
              amount: onChainPol,
              type: "polygon_faucet_deposit",
              desc: `Polygon Amoy Official Faucet — ${onChainPol.toFixed(2)} POL on-chain deposit`,
              txHash,
              blockNumber,
            });

            await recordOnBlockchainLedger({
              blockNumber,
              txHash,
              from: "0x00000000000000000000000000000000000POLYGON",
              to: user.wallet,
              amount: onChainPol,
              type: "GAS_DEPOSIT",
              isStateProof: true,
            });

            user.polBalance = Math.max(user.polBalance || 0, onChainPol);
            await user.save();
          }
        }
      } catch (rpcErr) {
        console.warn("[OnChain Sync] Balance check warn:", rpcErr.message);
      }
    }

    // 3. Backfill missing blockchain entries for user's past transactions
    const txs = await Transaction.find({
      $or: [{ fromId: user._id.toString() }, { toId: user._id.toString() }],
      type: { $in: ["service_completed", "aicte_reward", "referral_bonus"] }
    });

    for (const tx of txs) {
      let hash = tx.txHash;
      let blk = tx.blockNumber;

      if (!hash) {
        blk = await relayer.getLiveBlockNumber();
        const payload = `TIMEBANK_AMOY_${tx.type.toUpperCase()}_${tx._id}_${tx.amount}_BLOCK${blk}`;
        hash = ethers.keccak256(ethers.toUtf8Bytes(payload));
        tx.txHash = hash;
        tx.blockNumber = blk;
        await tx.save();
      }

      const existingBc = await Blockchain.findOne({
        $or: [
          { txHash: hash },
          { from: user.wallet, amount: tx.amount, type: tx.type === "service_completed" ? "TRANSFER" : "AICTE_MINT" },
          { to: user.wallet, amount: tx.amount, type: tx.type === "service_completed" ? "TRANSFER" : "AICTE_MINT" },
        ]
      });

      if (!existingBc) {
        const isIncoming = tx.toId === user._id.toString();
        const typeMap = {
          service_completed: "TRANSFER",
          aicte_reward: "AICTE_MINT",
          referral_bonus: "REFERRAL_MINT",
        };

        await recordOnBlockchainLedger({
          blockNumber: blk || (await relayer.getLiveBlockNumber()),
          txHash: hash,
          from: isIncoming ? "0x0000000000000000000000000000000000000P2P" : user.wallet,
          to: isIncoming ? user.wallet : "0x0000000000000000000000000000000000000P2P",
          amount: tx.amount,
          type: typeMap[tx.type] || "TRANSFER",
          isStateProof: true,
        });
      }
    }
  } catch (err) {
    console.warn("Failed to sync user blockchain ledger:", err.message);
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

    // Students awaiting college admin approval cannot log in yet
    if (user.role === "student" && user.approvalStatus === "pending") {
      return res.json({
        success: true,
        waitingApproval: true,
        userId: user._id,
        message: "Your account is pending approval by your college administrator. Please check back soon.",
      });
    }

    if (user.role === "student" && user.approvalStatus === "rejected") {
      return res.status(403).json({
        error: `Your account application was rejected. ${user.approvalNote ? "Reason: " + user.approvalNote : "Please contact your college administration."}`,
      });
    }

    // Face match check & Cross-Account Biometric Impersonation Detection
    let faceMatch = null;
    let crossAccountFlag = null;
    if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
      if (user.faceDescriptor && user.faceDescriptor.length === 128) {
        const dist = euclideanDistance(faceDescriptor, user.faceDescriptor);
        faceMatch = dist <= FACE_MATCH_THRESHOLD;
        if (!faceMatch) {
          return res.status(401).json({
            error: "Biometric face verification failed. Scanned face does not match the registered owner.",
            faceMatch: false,
          });
        }
      } else {
        user.faceDescriptor = faceDescriptor;
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
          await user.save();
          return res.json({
            crossAccountFlag,
            error: `This face matches an existing account (${candidate.email}). Please sign in with that account.`,
          });
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

// ─── AUTH ME (SESSION RESTORATION) ──────────────────────────────────────────
r.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.role === "student" && user.approvalStatus === "pending") {
      return res.status(403).json({
        error: "Your student account is pending college administrator approval.",
        waitingApproval: true,
        userId: user._id,
      });
    }

    if (user.role === "student" && user.approvalStatus === "rejected") {
      return res.status(403).json({
        error: `Your account application was rejected. ${user.approvalNote ? "Reason: " + user.approvalNote : "Please contact your college administration."}`,
        rejected: true,
      });
    }

    // Update last active
    user.lastActiveAt = new Date();
    await user.save();

    // Ensure all transactions & on-chain deposits are synchronized to the blockchain ledger
    syncUserBlockchainAndDeposits(user).catch(() => {});

    res.json({ user });
  } catch (e) {
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

    // If registering, reject upfront if an account with this email already exists
    if (type === "register") {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(409).json({
          error: `An account with ${cleanEmail} already exists. Please sign in instead.`,
          code: "EMAIL_EXISTS",
          email: cleanEmail,
        });
      }
    }

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
    let emailResult = null;
    let emailSendError = null;
    try {
      emailResult = await sendOtpEmail({
        to: cleanEmail,
        code,
        magicToken,
        collegeName: collegeTitle,
        type,
      });
    } catch (err) {
      emailSendError = err.message;
      console.error(`Error sending OTP email to ${cleanEmail}:`, err.message);
    }

    if (emailSendError) {
      return res.status(500).json({
        error: `Could not send verification email: ${emailSendError}. Please try again later.`,
      });
    }

    return res.json({
      success: true,
      message: `A verification code and 1-click login link has been sent to ${cleanEmail}. Please check your inbox or spam folder.`,
      collegeName: collegeTitle,
      expiresAt,
      previewUrl: emailResult?.previewUrl || null,
    });
  } catch (e) {
    console.error("Error sending OTP email:", e);
    res.status(500).json({ error: e.message || "Failed to dispatch verification code to email." });
  }
});

r.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp, deviceFingerprint, faceDescriptor, type } = req.body;
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

      // Students awaiting college admin approval cannot log in yet
      if (user.role === "student" && user.approvalStatus === "pending") {
        return res.json({
          success: true,
          waitingApproval: true,
          userId: user._id,
          message: "Your account is pending approval by your college administrator. Please check back soon.",
        });
      }

      if (user.role === "student" && user.approvalStatus === "rejected") {
        return res.status(403).json({
          error: `Your account application was rejected. ${user.approvalNote ? "Reason: " + user.approvalNote : "Please contact your college administration."}`,
        });
      }

      // Biometric check if face was provided
      let crossAccountFlag = null;
      if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
        if (user.faceDescriptor && user.faceDescriptor.length === 128) {
          const dist = euclideanDistance(faceDescriptor, user.faceDescriptor);
          if (dist > FACE_MATCH_THRESHOLD) {
            return res.status(401).json({
              error: "Biometric face verification failed. Scanned face does not match the registered account owner.",
              faceMatch: false,
            });
          }
        } else {
          user.faceDescriptor = faceDescriptor;
        }

        // Cross-account face check
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
            return res.json({
              crossAccountFlag,
              error: `This face matches an existing account (${candidate.email}). Please sign in with that account.`,
            });
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

      user.lastActiveAt = new Date();
      await user.save();

      const token = generateToken(user);
      return res.json({
        success: true,
        isRegistered: true,
        token,
        user,
        newDevice,
        crossAccountFlag,
        message: "Successfully logged in via one-time verification code! 🎉",
      });
    }

    // If this verification is part of user registration, don't auto-create a stub user yet
    if (otpDoc.type === "register" || otpDoc.type === "verify_email" || type === "register") {
      return res.json({
        success: true,
        verified: true,
        message: "Email verified successfully! ✓",
      });
    }

    // If user not found and this was a login attempt, do NOT auto-create a user without face scan!
    return res.status(404).json({
      error: `No TimeBank account found for ${cleanEmail}. Please switch to Sign Up to create your account.`,
      code: "USER_NOT_FOUND",
      notRegistered: true,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to verify code." });
  }
});

// ─── REAL-TIME BIOMETRIC DUPLICATE FACE CHECK ─────────────────────────────────
r.post("/auth/check-face", async (req, res) => {
  try {
    const { faceDescriptor, email } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: "Invalid face descriptor. Expected 128-dimensional embedding array." });
    }

    const cleanEmail = email ? String(email).toLowerCase().trim() : "";

    // Query all existing users who have a registered faceDescriptor, excluding current email
    const filter = {
      faceDescriptor: { $exists: true, $ne: [] },
    };
    if (cleanEmail) {
      filter.email = { $ne: cleanEmail };
    }

    const candidates = await User.find(filter);

    let bestMatch = null;
    let bestDistance = Infinity;

    for (const candidate of candidates) {
      if (!candidate.faceDescriptor || candidate.faceDescriptor.length !== 128) continue;
      const dist = euclideanDistance(faceDescriptor, candidate.faceDescriptor);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = candidate;
      }
    }

    // High confidence match threshold
    if (bestMatch && bestDistance < 0.45) {
      // Flag existing user for multi-accounting attempt
      bestMatch.flagged = true;
      bestMatch.riskScore = Math.max(bestMatch.riskScore || 0, 85);
      if (!bestMatch.flaggedReasons) bestMatch.flaggedReasons = [];
      if (!bestMatch.flaggedReasons.includes("DUPLICATE_FACE_ATTEMPT")) {
        bestMatch.flaggedReasons.push("DUPLICATE_FACE_ATTEMPT");
      }
      await bestMatch.save();

      // Create a pending FraudReview entry for admin visibility
      try {
        await FraudReview.create({
          type: "user",
          targetId: bestMatch._id,
          userId: bestMatch._id,
          riskScore: 95,
          reasons: ["DUPLICATE_FACE_DETECTED", "MULTI_ACCOUNT_ATTEMPT"],
          status: "pending",
          note: `Real-time biometric scan during signup matched existing account ${bestMatch.email} (distance: ${bestDistance.toFixed(3)}). New attempt email: ${cleanEmail || "unspecified"}.`,
        });
      } catch (err) {
        console.error("FraudReview log error:", err.message);
      }

      return res.json({
        duplicate: true,
        matchedEmail: bestMatch.email,
        matchedName: bestMatch.name,
        distance: bestDistance,
        message: `Biometric face scan matches an existing registered account (${bestMatch.email}).`,
      });
    }

    return res.json({
      duplicate: false,
      message: "Biometric face scan verified. No duplicate registered face found.",
    });
  } catch (e) {
    console.error("Error in /auth/check-face:", e);
    res.status(500).json({ error: e.message || "Failed to check biometric face." });
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
      return res.status(404).json({
        error: "No registered TimeBank account found with this email. Please complete registration first.",
        code: "USER_NOT_FOUND",
      });
    }

    if (user.role === "student" && user.approvalStatus === "pending") {
      return res.json({
        success: true,
        waitingApproval: true,
        userId: user._id,
        message: "Your student account is pending approval by your college administrator. Please check back soon.",
      });
    }

    if (user.role === "student" && user.approvalStatus === "rejected") {
      return res.status(403).json({
        error: `Your account application was rejected. ${user.approvalNote ? "Reason: " + user.approvalNote : "Please contact your college administration."}`,
      });
    }

    user.lastActiveAt = new Date();
    await user.save();

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
      collegeId, college: colBody, collegeName: colNameBody, collegeIdNumber,
      faceDescriptor, faceEmbedding, deviceFingerprint, phone, otp,
    } = req.body;
    const collegeName = (colBody || colNameBody || "").trim();

    if (!name || !email) {
      return res.status(400).json({ error: "Full legal name and college email are required." });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Strictly enforce OTP verification
    if (!otp) {
      return res.status(400).json({
        error: "Email verification code is required. Please verify your college email first.",
        code: "OTP_REQUIRED",
      });
    }

    const validOtp = await Otp.findOne({
      email: cleanEmail,
      code: String(otp).trim(),
      createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) },
    }).sort({ createdAt: -1 });
    if (!validOtp) {
      return res.status(400).json({
        error: "Invalid or expired email verification code. Please request a new code.",
        code: "INVALID_OTP",
      });
    }
    validOtp.used = true;
    await validOtp.save();

    // Strictly enforce live biometric face scan
    const activeFace = faceDescriptor || faceEmbedding;
    if (!activeFace || !Array.isArray(activeFace) || activeFace.length !== 128) {
      return res.status(400).json({
        error: "Live biometric face scan (128-dimensional embedding) is mandatory for student verification.",
        code: "FACE_REQUIRED",
      });
    }

    // Resolve college if provided (without restricting student's email domain)
    let resolvedCollege = null;
    if (collegeId) {
      try {
        resolvedCollege = await College.findById(collegeId);
      } catch {}
    }
    if (!resolvedCollege && collegeName) {
      resolvedCollege = await College.findOne({
        $or: [
          { name: new RegExp(`^${escapeRegex(collegeName)}$`, "i") },
          { code: new RegExp(`^${escapeRegex(collegeName)}$`, "i") },
          { name: new RegExp(escapeRegex(collegeName), "i") }
        ],
      });
    }

    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "";

    const fraudCheck = await checkDuplicateRegistration({
      email: cleanEmail, phone, collegeIdNumber, faceDescriptor: activeFace, deviceFingerprint, ip,
    });

    if (fraudCheck.blocked) {
      if (fraudCheck.reasons.includes("FACE_MATCH")) {
        let matchedCandidate = null;
        if (fraudCheck.matchedUserId) {
          matchedCandidate = await User.findById(fraudCheck.matchedUserId);
        }
        if (!matchedCandidate && fraudCheck.matchedEmail) {
          matchedCandidate = await User.findOne({ email: fraudCheck.matchedEmail });
        }

        if (matchedCandidate) {
          matchedCandidate.flagged = true;
          matchedCandidate.riskScore = Math.max(matchedCandidate.riskScore || 0, 85);
          if (!matchedCandidate.flaggedReasons) matchedCandidate.flaggedReasons = [];
          if (!matchedCandidate.flaggedReasons.includes("DUPLICATE_FACE_ATTEMPT")) {
            matchedCandidate.flaggedReasons.push("DUPLICATE_FACE_ATTEMPT");
          }
          await matchedCandidate.save();

          try {
            await FraudReview.create({
              type: "user",
              targetId: matchedCandidate._id,
              userId: matchedCandidate._id,
              riskScore: 95,
              reasons: ["DUPLICATE_FACE_DETECTED", "MULTI_ACCOUNT_ATTEMPT"],
              status: "pending",
              note: `Student signup attempt under ${cleanEmail} matched existing user ${matchedCandidate.email} (distance: ${fraudCheck.matchDistance?.toFixed(3)}).`,
            });
          } catch (err) {
            console.error("FraudReview error:", err.message);
          }
        }

        return res.status(409).json({
          error: `This face scan matches an existing registered account (${fraudCheck.matchedEmail || matchedCandidate?.email}). Multi-accounting is not allowed.`,
          code: "DUPLICATE_FACE",
          duplicateFace: true,
          matchedEmail: fraudCheck.matchedEmail || matchedCandidate?.email || null,
          matchedName: matchedCandidate?.name || "",
          reasons: fraudCheck.reasons,
        });
      }

      if (fraudCheck.reasons.includes("EMAIL_EXISTS")) {
        return res.status(409).json({
          error: "An account with this email address already exists. Please switch to Sign In to log in.",
          code: "EMAIL_EXISTS",
          matchedEmail: cleanEmail,
          reasons: fraudCheck.reasons,
        });
      }

      let specificMessage = "We could not create this account — duplicate credentials detected.";
      if (fraudCheck.reasons.includes("PHONE_EXISTS")) {
        specificMessage = "This phone number is already registered under another account.";
      } else if (fraudCheck.reasons.includes("ID_NUMBER_EXISTS")) {
        specificMessage = "This College ID / USN is already registered.";
      }

      return res.status(409).json({
        error: specificMessage,
        code: "DUPLICATE_ACCOUNT",
        reasons: fraudCheck.reasons,
        matchedEmail: fraudCheck.matchedEmail || null,
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

    const { idCardImage } = req.body;

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
      // Students require college admin approval before accessing the app
      approvalStatus: "pending",
      idCardImage: idCardImage || "",
      idCardUploadedAt: idCardImage ? new Date() : null,
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
    }

    await ensureInitialCreditsRecorded(user);

    // Notify all college admins for this college about the pending student
    const collegeConditions = [];
    if (resolvedCollege) {
      if (resolvedCollege._id) {
        collegeConditions.push({ collegeId: resolvedCollege._id });
      }
      if (resolvedCollege.name) {
        collegeConditions.push({ college: new RegExp(`^${escapeRegex(resolvedCollege.name.trim())}$`, "i") });
        collegeConditions.push({ college: new RegExp(escapeRegex(resolvedCollege.name.trim()), "i") });
      }
      if (resolvedCollege.code) {
        collegeConditions.push({ college: new RegExp(`^${escapeRegex(resolvedCollege.code.trim())}$`, "i") });
      }
    }
    if (user.college && user.college.trim()) {
      collegeConditions.push({ college: new RegExp(escapeRegex(user.college.trim()), "i") });
    }

    const adminFilter = {
      role: { $in: ["collegeAdmin", "institute_admin"] },
      ...(collegeConditions.length > 0 ? { $or: collegeConditions } : {})
    };

    let collegeAdmins = await User.find(adminFilter);

    // If no specific college admin matched, alert platform admins so student is not orphaned
    if (!collegeAdmins || collegeAdmins.length === 0) {
      collegeAdmins = await User.find({ role: { $in: ["websiteAdmin", "super_admin"] } });
    }

    for (const admin of collegeAdmins) {
      // 1. In-app notification
      try {
        await Notification.create({
          user: admin._id,
          type: "pending_student",
          title: "New Student ID Verification Awaiting Approval 🎓",
          body: `${name} (${cleanEmail}) from ${user.college || "your institution"} has submitted their ID card for verification.`,
          data: { studentId: user._id, studentName: name, studentEmail: cleanEmail, collegeIdNumber: user.collegeIdNumber || "" },
          read: false,
        });
      } catch (notifErr) {
        console.error("Failed to create admin notification:", notifErr);
      }

      // 2. Web push / Socket notification
      await pushNotification(admin._id, {
        type: "pending_student",
        title: `New Student Awaiting Approval 🎓`,
        body: `${name} (${cleanEmail}) has registered and submitted their ID card for verification.`,
        data: { studentId: user._id, studentName: name, studentEmail: cleanEmail, collegeIdNumber: user.collegeIdNumber || "" },
      });

      // 3. Real-time Email Alert to college admin
      if (admin.email) {
        try {
          await sendCollegeAdminPendingStudentEmail({
            to: admin.email,
            adminName: admin.name || "College Administrator",
            studentName: name,
            studentEmail: cleanEmail,
            collegeName: user.college || resolvedCollege?.name || "Your Institution",
            collegeIdNumber: user.collegeIdNumber || "",
          });
          console.log(`[Admin Alert Email] Dispatched pending student email to admin ${admin.email}`);
        } catch (emailErr) {
          console.error(`[Admin Alert Email Error] Could not send email to ${admin.email}:`, emailErr);
        }
      }
    }

    // No JWT token yet — student must wait for college admin approval
    res.status(201).json({
      success: true,
      waitingApproval: true,
      userId: user._id,
      message: "Registration submitted! Your account is pending approval by your college administrator. You will be notified once approved.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Registration failed." });
  }
});

// ─── STUDENT APPROVAL STATUS POLLING ─────────────────────────────────────────
r.get("/auth/approval-status/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("approvalStatus approvalNote approvedAt name college");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      approvalStatus: user.approvalStatus,
      approvalNote: user.approvalNote,
      approvedAt: user.approvedAt,
      name: user.name,
      college: user.college,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── COLLEGE ADMIN — PENDING STUDENTS ─────────────────────────────────────────
r.get("/college-admin/pending-students", requireAuth, requireRole("collegeAdmin", "institute_admin", "websiteAdmin", "super_admin"), async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    const filter = { role: "student", approvalStatus: "pending" };

    if (admin.role !== "websiteAdmin" && admin.role !== "super_admin") {
      const matchCriteria = [];
      if (admin.collegeId) {
        matchCriteria.push({ collegeId: admin.collegeId });
      }
      if (admin.college && admin.college.trim()) {
        const trimmed = admin.college.trim();
        matchCriteria.push({ college: new RegExp(`^${escapeRegex(trimmed)}$`, "i") });
        matchCriteria.push({ college: new RegExp(escapeRegex(trimmed), "i") });

        const matchedCol = await College.findOne({
          $or: [
            { code: new RegExp(`^${escapeRegex(trimmed)}$`, "i") },
            { name: new RegExp(escapeRegex(trimmed), "i") }
          ]
        });
        if (matchedCol) {
          matchCriteria.push({ collegeId: matchedCol._id });
          if (matchedCol.name) {
            matchCriteria.push({ college: new RegExp(`^${escapeRegex(matchedCol.name.trim())}$`, "i") });
            matchCriteria.push({ college: new RegExp(escapeRegex(matchedCol.name.trim()), "i") });
          }
          if (matchedCol.code) {
            matchCriteria.push({ college: new RegExp(`^${escapeRegex(matchedCol.code.trim())}$`, "i") });
          }
        }
      }
      if (matchCriteria.length > 0) {
        filter.$or = matchCriteria;
      }
    }

    const students = await User.find(filter)
      .select("name email college collegeIdNumber idCardImage idCardUploadedAt createdAt")
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.get("/college-admin/all-students", requireAuth, requireRole("collegeAdmin", "institute_admin", "websiteAdmin", "super_admin"), async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    const filter = { role: "student" };

    if (admin.role !== "websiteAdmin" && admin.role !== "super_admin") {
      const matchCriteria = [];
      if (admin.collegeId) {
        matchCriteria.push({ collegeId: admin.collegeId });
      }
      if (admin.college && admin.college.trim()) {
        const trimmed = admin.college.trim();
        matchCriteria.push({ college: new RegExp(`^${escapeRegex(trimmed)}$`, "i") });
        matchCriteria.push({ college: new RegExp(escapeRegex(trimmed), "i") });

        const matchedCol = await College.findOne({
          $or: [
            { code: new RegExp(`^${escapeRegex(trimmed)}$`, "i") },
            { name: new RegExp(escapeRegex(trimmed), "i") }
          ]
        });
        if (matchedCol) {
          matchCriteria.push({ collegeId: matchedCol._id });
          if (matchedCol.name) {
            matchCriteria.push({ college: new RegExp(`^${escapeRegex(matchedCol.name.trim())}$`, "i") });
            matchCriteria.push({ college: new RegExp(escapeRegex(matchedCol.name.trim()), "i") });
          }
          if (matchedCol.code) {
            matchCriteria.push({ college: new RegExp(`^${escapeRegex(matchedCol.code.trim())}$`, "i") });
          }
        }
      }
      if (matchCriteria.length > 0) {
        filter.$or = matchCriteria;
      }
    }

    const students = await User.find(filter)
      .select("name email college collegeIdNumber approvalStatus idCardImage createdAt approvedAt approvalNote")
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post("/college-admin/approve-student/:userId", requireAuth, requireRole("collegeAdmin", "institute_admin", "websiteAdmin", "super_admin"), async (req, res) => {
  try {
    const { decision, note } = req.body;
    if (!decision || !["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'" });
    }
    const student = await User.findById(req.params.userId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    student.approvalStatus = decision;
    student.approvalNote = note || "";
    student.approvedBy = req.user.id;
    student.approvedAt = new Date();
    if (decision === "approved") {
      student.verificationStatus = "verified";
    } else {
      student.verificationStatus = "rejected";
    }
    await student.save();

    const notifTitle = decision === "approved"
      ? "Account Approved! Welcome to TimeBank 🎉"
      : "Account Application Update";
    const notifBody = decision === "approved"
      ? "Your student account has been approved by your college administrator. You can now sign in!"
      : `Your account application was not approved. ${note ? "Reason: " + note : "Please contact your college administration."}`;

    // Create persistent DB notification
    try {
      await Notification.create({
        user: student._id,
        type: decision === "approved" ? "account_approved" : "account_rejected",
        title: notifTitle,
        body: notifBody,
        data: { approvalStatus: decision, note: note || "" },
        read: false,
      });
    } catch (notifErr) {
      console.error("Failed to create student notification:", notifErr);
    }

    // Push socket/web-push notification
    await pushNotification(student._id, {
      type: decision === "approved" ? "account_approved" : "account_rejected",
      title: notifTitle,
      body: notifBody,
      data: { approvalStatus: decision, note: note || "" },
    });

    // Send real-time decision email to the student
    if (student.email) {
      try {
        await sendStudentApprovalDecisionEmail({
          to: student.email,
          studentName: student.name,
          collegeName: student.college || "Your Institution",
          decision,
          note: note || "",
        });
        console.log(`[Approval Email] Real-time decision email (${decision}) sent to ${student.email}`);
      } catch (mailErr) {
        console.error(`[Approval Email Error] Failed to send decision email to ${student.email}:`, mailErr);
      }
    }

    res.json({
      success: true,
      message: `Student ${decision} successfully. Real-time notification and email dispatched to ${student.email}.`,
      student: { _id: student._id, name: student.name, email: student.email, approvalStatus: student.approvalStatus },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GENERAL USER REGISTRATION ────────────────────────────────────────────────
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

    // Strictly enforce OTP verification
    if (!otp) {
      return res.status(400).json({
        error: "Email verification code is required. Please verify your email first.",
        code: "OTP_REQUIRED",
      });
    }

    const validOtp = await Otp.findOne({
      email: cleanEmail,
      code: String(otp).trim(),
      createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) },
    }).sort({ createdAt: -1 });
    if (!validOtp) {
      return res.status(400).json({
        error: "Invalid or expired email verification code. Please request a new code.",
        code: "INVALID_OTP",
      });
    }
    validOtp.used = true;
    await validOtp.save();

    // Strictly enforce live biometric face scan
    const activeFace = faceDescriptor || faceEmbedding;
    if (!activeFace || !Array.isArray(activeFace) || activeFace.length !== 128) {
      return res.status(400).json({
        error: "Live biometric face scan (128-dimensional embedding) is mandatory to create an account.",
        code: "FACE_REQUIRED",
      });
    }

    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "";

    const fraudCheck = await checkDuplicateRegistration({
      email: cleanEmail, phone, faceDescriptor: activeFace, deviceFingerprint, ip,
    });

    if (fraudCheck.blocked) {
      if (fraudCheck.reasons.includes("FACE_MATCH")) {
        let matchedCandidate = null;
        if (fraudCheck.matchedUserId) {
          matchedCandidate = await User.findById(fraudCheck.matchedUserId);
        }
        if (!matchedCandidate && fraudCheck.matchedEmail) {
          matchedCandidate = await User.findOne({ email: fraudCheck.matchedEmail });
        }

        if (matchedCandidate) {
          matchedCandidate.flagged = true;
          matchedCandidate.riskScore = Math.max(matchedCandidate.riskScore || 0, 85);
          if (!matchedCandidate.flaggedReasons) matchedCandidate.flaggedReasons = [];
          if (!matchedCandidate.flaggedReasons.includes("DUPLICATE_FACE_ATTEMPT")) {
            matchedCandidate.flaggedReasons.push("DUPLICATE_FACE_ATTEMPT");
          }
          await matchedCandidate.save();

          try {
            await FraudReview.create({
              type: "user",
              targetId: matchedCandidate._id,
              userId: matchedCandidate._id,
              riskScore: 95,
              reasons: ["DUPLICATE_FACE_DETECTED", "MULTI_ACCOUNT_ATTEMPT"],
              status: "pending",
              note: `General user signup attempt under ${cleanEmail} matched existing user ${matchedCandidate.email} (distance: ${fraudCheck.matchDistance?.toFixed(3)}).`,
            });
          } catch (err) {
            console.error("FraudReview error:", err.message);
          }
        }

        return res.status(409).json({
          error: `This face scan matches an existing registered account (${fraudCheck.matchedEmail || matchedCandidate?.email}). Multi-accounting is prohibited on TimeBank.`,
          code: "DUPLICATE_FACE",
          duplicateFace: true,
          matchedEmail: fraudCheck.matchedEmail || matchedCandidate?.email || null,
          matchedName: matchedCandidate?.name || "",
          reasons: fraudCheck.reasons,
        });
      }

      if (fraudCheck.reasons.includes("EMAIL_EXISTS")) {
        return res.status(409).json({
          error: "An account with this email address already exists. Please switch to Sign In to log in.",
          code: "EMAIL_EXISTS",
          matchedEmail: cleanEmail,
          reasons: fraudCheck.reasons,
        });
      }

      let specificMessage = "We could not create this account — duplicate credentials detected.";
      if (fraudCheck.reasons.includes("PHONE_EXISTS")) {
        specificMessage = "This phone number is already registered under another account.";
      }

      return res.status(409).json({
        error: specificMessage,
        code: "DUPLICATE_ACCOUNT",
        reasons: fraudCheck.reasons,
        matchedEmail: fraudCheck.matchedEmail || null,
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
      approvalStatus: "approved", // general users don't need college admin approval
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
      bcEntry = await recordOnBlockchainLedger({
        from: "0x00000000000000000000000000000000FAUCET01",
        to: targetAddress,
        amount: 0.05,
        type: "GAS_DRIP",
        txHash: dripRes.txHash,
        blockNumber: dripRes.blockNumber,
        isStateProof: !dripRes.onChain,
      });
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
    const user = await User.findOne({
      $or: [
        { wallet: { $regex: new RegExp(`^${wallet}$`, "i") } },
        ...(mongoose.isValidObjectId(wallet) ? [{ _id: wallet }] : [])
      ]
    });

    if (user) {
      await syncUserBlockchainAndDeposits(user);
    }

    const records = await Blockchain.find({
      $or: [
        { from: { $regex: new RegExp(`^${wallet}$`, "i") } },
        { to: { $regex: new RegExp(`^${wallet}$`, "i") } },
        ...(user ? [
          { from: user.wallet },
          { to: user.wallet },
          { from: user._id.toString() },
          { to: user._id.toString() },
        ] : [])
      ]
    }).sort({ createdAt: -1 });

    res.json(records);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SYNC ON-CHAIN POL & FAUCET DEPOSITS ────────────────────────────────────
r.post("/faucet/sync-onchain", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await syncUserBlockchainAndDeposits(user);

    const provider = new ethers.JsonRpcProvider("https://polygon-amoy-bor-rpc.publicnode.com", 80002);
    let onChainBal = "0.0000";
    if (user.wallet && user.wallet.startsWith("0x")) {
      const raw = await provider.getBalance(user.wallet);
      onChainBal = parseFloat(ethers.formatEther(raw)).toFixed(4);
    }

    res.json({
      ok: true,
      onChainBalance: onChainBal,
      polBalance: user.polBalance,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GASLESS BLOCKCHAIN RELAY ENDPOINT ───────────────────────────────────────
r.post("/blockchain/relay-transfer", requireAuth, async (req, res) => {
  try {
    const { toAddress, credits, bookingId } = req.body;
    const amount = Number(credits) || 1;
    const relayRes = await relayer.relayCreditTransfer(toAddress, amount, {
      bookingId,
      senderId: req.user.id,
    });

    const bcEntry = await recordOnBlockchainLedger({
      from: req.user.wallet || `0x${req.user.id}`,
      to: toAddress,
      amount,
      type: "TRANSFER",
      txHash: relayRes.txHash,
      blockNumber: relayRes.blockNumber,
      isStateProof: !relayRes.onChain,
    });

    broadcastRealtimeEvent("blockchain_relay", {
      toAddress,
      txHash: relayRes.txHash,
      blockNumber: relayRes.blockNumber,
      entry: bcEntry,
    });

    res.json({ ...relayRes, entry: bcEntry });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SMART CONTRACT DEPLOYMENT & INFO ────────────────────────────────────────
r.get("/blockchain/contract-info", async (_req, res) => {
  try {
    const contractAddress = relayer.getContractAddress();
    if (!contractAddress) {
      return res.json({
        deployed: false,
        contractAddress: null,
        tokenName: "TimeBank Credit",
        tokenSymbol: "TBC",
        decimals: 18,
      });
    }

    const provider = await relayer.getProvider();
    const contract = await relayer.getTimeCreditContract(provider);
    let totalSupply = "0";
    if (contract) {
      try {
        const rawSupply = await contract.totalSupply();
        totalSupply = ethers.formatUnits(rawSupply, 18);
      } catch (err) {
        console.warn("Error fetching total supply:", err.message);
      }
    }

    res.json({
      deployed: true,
      contractAddress,
      tokenName: "TimeBank Credit",
      tokenSymbol: "TBC",
      decimals: 18,
      totalSupply,
      explorerUrl: `${relayer.EXPLORER_BASE}token/${contractAddress}`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post("/blockchain/deploy-contract", requireAuth, async (req, res) => {
  try {
    const { privateKey, contractAddress } = req.body;
    
    // If an existing contract address was passed, just update it
    if (contractAddress && ethers.isAddress(contractAddress)) {
      relayer.setContractAddress(contractAddress);
      return res.json({
        success: true,
        contractAddress,
        explorerUrl: `${relayer.EXPLORER_BASE}token/${contractAddress}`,
      });
    }

    const { deployTimeCreditContract } = await import("./deployContract.js");
    const result = await deployTimeCreditContract(privateKey || null);
    res.json({
      success: true,
      ...result,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── WEB PUSH NOTIFICATIONS ──────────────────────────────────────────────────
r.get("/notifications/vapid-public-key", async (_req, res) => {
  try {
    const { getVapidPublicKey } = await import("./pushService.js");
    res.json({ publicKey: getVapidPublicKey() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post("/notifications/subscribe", requireAuth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "Invalid subscription object." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.pushSubscriptions) {
      user.pushSubscriptions = [];
    }

    const exists = user.pushSubscriptions.some((s) => s.endpoint === subscription.endpoint);
    if (!exists) {
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: req.headers["user-agent"] || "",
        createdAt: new Date(),
      });
      await user.save();
    }

    res.json({ success: true, count: user.pushSubscriptions.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post("/notifications/unsubscribe", requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.pushSubscriptions = (user.pushSubscriptions || []).filter((s) => s.endpoint !== endpoint);
    await user.save();

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post("/notifications/test-push", requireAuth, async (req, res) => {
  try {
    const { sendPushToUser } = await import("./pushService.js");
    const sentCount = await sendPushToUser(req.user.id, {
      title: "TimeBank Push Alert 🚀",
      body: "Web Push notifications are now active on your device! You'll receive real-time offline alerts.",
      url: "/wallet",
    });
    res.json({ success: true, sentCount });
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
        const anchored = await generateAnchoredTx("BOOKING_COMPLETION", requester?.wallet || "", provider?.wallet || "", booking.hours || 1);
        finalTxHash = anchored.txHash;
        finalBlockNumber = anchored.blockNumber;
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

          const refTx1 = await generateAnchoredTx("REFERRAL", "SYSTEM_REFERRAL_TREASURY", referrer.wallet || referrer._id.toString(), bonus);
          await Transaction.create({
            fromId: "SYSTEM", toId: referrer._id.toString(),
            amount: bonus, type: "referral_bonus",
            desc: `Referral bonus: ${provider.name} completed first service`,
            txHash: refTx1.txHash, blockNumber: refTx1.blockNumber,
          });
          await recordOnBlockchainLedger({
            blockNumber: refTx1.blockNumber,
            txHash: refTx1.txHash,
            from: "SYSTEM_REFERRAL_TREASURY",
            to: referrer.wallet || referrer._id.toString(),
            amount: bonus,
            type: "MINT",
            isStateProof: true,
          });

          const refTx2 = await generateAnchoredTx("REFERRAL", "SYSTEM_REFERRAL_TREASURY", provider.wallet || provider._id.toString(), bonus);
          await Transaction.create({
            fromId: "SYSTEM", toId: provider._id.toString(),
            amount: bonus, type: "referral_bonus",
            desc: `Referral bonus: completed first service`,
            txHash: refTx2.txHash, blockNumber: refTx2.blockNumber,
          });
          await recordOnBlockchainLedger({
            blockNumber: refTx2.blockNumber,
            txHash: refTx2.txHash,
            from: "SYSTEM_REFERRAL_TREASURY",
            to: provider.wallet || provider._id.toString(),
            amount: bonus,
            type: "MINT",
            isStateProof: true,
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
    await recordOnBlockchainLedger({
      blockNumber: finalBlockNumber,
      txHash: finalTxHash,
      from: requester?.wallet || booking.requesterId.toString(),
      to: provider?.wallet || booking.providerId.toString(),
      amount: booking.hours,
      type: "TRANSFER",
      isStateProof,
    });

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

r.post("/notifications/:id/read", async (req, res) => {
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

r.post("/notifications/read-all/:userId", async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId, read: false }, { read: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
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

    // Anchor on Polygon blockchain
    const { txHash, blockNumber } = await generateAnchoredTx("MINT_CERT", student.wallet || student._id.toString(), "0x000000000000000000000000000000000000CERT", activityPoints);
    await recordOnBlockchainLedger({
      blockNumber,
      txHash,
      from: student.wallet || student._id.toString(),
      to: "0x000000000000000000000000000000000000CERT",
      amount: activityPoints,
      type: "MINT_CERT",
      isStateProof: true,
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
    const user = await User.findById(req.body.userId);
    let aiScore = null;
    let aiFeedback = null;

    if (req.body.certUrl && user) {
      try {
        const verifyRes = await verifyAicteCertificate(req.body.certUrl, user.name, req.body.title);
        aiScore = verifyRes.score;
        aiFeedback = verifyRes.feedback;
      } catch (err) {
        console.warn("[AICTE] Submission AI verification notice:", err.message);
      }
    }

    const activity = await Aicte.create({
      ...req.body,
      pts: 0,
      credits: 0,
      verified: false,
      aiScore,
      aiFeedback,
    });
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
      await recordOnBlockchainLedger({
        blockNumber: finalBlockNumber,
        txHash: finalTxHash,
        from: "SYSTEM_AICTE_AUTHORITY",
        to: user?.wallet || activity.userId.toString(),
        amount: activity.credits,
        type: "MINT",
      });
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

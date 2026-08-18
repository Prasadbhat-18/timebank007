// ─── TimeBank — Multi-Layer Fraud Detection Service ──────────────────────────
import crypto from "crypto";
import { User, Transaction, Booking } from "./models.js";

const FACE_MATCH_THRESHOLD = 0.6; // Euclidean distance <= 0.6 = same person
const FRAUD_HASH_SECRET = process.env.FRAUD_HASH_SECRET || "timebank_fraud_hash_secret_2026";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export function hashIdentifier(value) {
  if (!value) return null;
  return crypto
    .createHmac("sha256", FRAUD_HASH_SECRET)
    .update(String(value).trim().toLowerCase())
    .digest("hex");
}

// ─── REGISTRATION DUPLICATE & RISK CHECK ──────────────────────────────────────
export async function checkDuplicateRegistration({
  email,
  phone,
  collegeIdNumber,
  faceDescriptor,
  deviceFingerprint,
  ip,
}) {
  const reasons = [];
  let riskScore = 0;

  // 1. Email check (Hard Signal)
  const cleanEmail = email ? email.toLowerCase().trim() : "";
  const existingUser = cleanEmail ? await User.findOne({ email: cleanEmail }) : null;
  if (existingUser) {
    reasons.push("EMAIL_EXISTS");
    riskScore += 100;
  }

  // 2. Phone Hash check (Hard Signal) — only if phone is provided
  const cleanPhone = phone ? String(phone).trim() : "";
  const phoneHash = cleanPhone ? hashIdentifier(cleanPhone) : null;
  if (phoneHash) {
    const existingPhone = await User.findOne({ phoneHash, email: { $ne: cleanEmail } });
    if (existingPhone) {
      reasons.push("PHONE_EXISTS");
      riskScore += 100;
    }
  }

  // 3. College ID Hash check (Hard Signal) — only if ID is provided
  const cleanId = collegeIdNumber ? String(collegeIdNumber).trim() : "";
  const idHash = cleanId ? hashIdentifier(cleanId) : null;
  if (idHash) {
    const existingId = await User.findOne({ idNumberHash: idHash, email: { $ne: cleanEmail } });
    if (existingId) {
      reasons.push("ID_NUMBER_EXISTS");
      riskScore += 100;
    }
  }

  // 4. Device Fingerprint Reuse (Soft Signal — capped at 30, never blocks alone)
  if (deviceFingerprint) {
    const deviceCount = await User.countDocuments({ deviceFingerprints: deviceFingerprint });
    if (deviceCount >= 2) {
      reasons.push("DEVICE_REUSED");
      riskScore += Math.min(deviceCount * 10, 30);
    }
  }

  // 5. IP Registration Burst (Soft Signal — capped at 20, never blocks alone)
  if (ip) {
    const recentFromIp = await User.countDocuments({
      registrationIp: ip,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (recentFromIp >= 10) {
      reasons.push("IP_BURST");
      riskScore += 20;
    }
  }

  // 6. Face Embedding Match (Hard Signal) — only against different email accounts
  let bestMatch = null;
  let bestDistance = Infinity;

  if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
    const candidates = await User.find({
      email: { $ne: cleanEmail },
      faceDescriptor: { $exists: true, $ne: [] },
    });
    for (const candidate of candidates) {
      if (!candidate.faceDescriptor || candidate.faceDescriptor.length !== 128) continue;
      const distance = euclideanDistance(faceDescriptor, candidate.faceDescriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = candidate;
      }
    }
    // High-confidence threshold (distance < 0.45)
    if (bestMatch && bestDistance < 0.45) {
      reasons.push("FACE_MATCH");
      riskScore += 100;
      return {
        blocked: true,
        flagged: false,
        riskScore,
        reasons,
        matchedUserId: bestMatch._id,
        matchDistance: bestDistance,
      };
    }
  }

  return {
    blocked: riskScore >= 100,
    flagged: riskScore >= 40 && riskScore < 100,
    riskScore,
    reasons,
    matchedUserId: bestMatch ? bestMatch._id : null,
    matchDistance: bestDistance === Infinity ? null : bestDistance,
  };
}

// ─── TRANSACTION / BOOKING RISK CHECK ────────────────────────────────────────
export async function calculateTransactionRisk({
  senderId,
  receiverId,
  bookingId = null,
  deviceFingerprint = null,
}) {
  const reasons = [];
  let riskScore = 0;

  // 1. Self Transaction (Hard Signal)
  if (String(senderId) === String(receiverId)) {
    reasons.push("SELF_TRANSACTION");
    riskScore += 100;
  }

  const [sender, receiver] = await Promise.all([
    User.findById(senderId),
    User.findById(receiverId),
  ]);

  if (sender && receiver) {
    // 2. Same Device Check (Soft/Hard Signal)
    if (deviceFingerprint) {
      if (receiver.deviceFingerprints && receiver.deviceFingerprints.includes(deviceFingerprint)) {
        reasons.push("SAME_DEVICE");
        riskScore += 80;
      }
    } else if (
      sender.deviceFingerprints &&
      receiver.deviceFingerprints &&
      sender.deviceFingerprints.some((df) => receiver.deviceFingerprints.includes(df))
    ) {
      reasons.push("SAME_DEVICE");
      riskScore += 80;
    }

    // 3. Same Face Check (Hard Signal)
    if (
      sender.faceDescriptor &&
      sender.faceDescriptor.length === 128 &&
      receiver.faceDescriptor &&
      receiver.faceDescriptor.length === 128
    ) {
      const faceDist = euclideanDistance(sender.faceDescriptor, receiver.faceDescriptor);
      if (faceDist < FACE_MATCH_THRESHOLD) {
        reasons.push("SAME_FACE");
        riskScore += 100;
      }
    }
  }

  // 4. Pair Velocity Check (3+ transactions in 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentPairCount = await Transaction.countDocuments({
    $or: [
      { fromId: String(senderId), toId: String(receiverId) },
      { fromId: String(receiverId), toId: String(senderId) },
    ],
    createdAt: { $gte: oneHourAgo },
  });

  if (recentPairCount >= 3) {
    reasons.push("PAIR_VELOCITY");
    riskScore += 30;
  }

  // 5. Wash Trade Circular Flow Check (Receiver paid sender within 24h)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const reverseFlow = await Transaction.findOne({
    fromId: String(receiverId),
    toId: String(senderId),
    createdAt: { $gte: twentyFourHoursAgo },
  });

  if (reverseFlow) {
    reasons.push("CIRCULAR_FLOW");
    riskScore += 40;
  }

  return {
    blocked: riskScore >= 100,
    flagged: riskScore >= 40 && riskScore < 100,
    riskScore,
    reasons,
  };
}

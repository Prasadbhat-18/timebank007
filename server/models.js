// ─── TimeBank — Mongoose Models ──────────────────────────────────────────────
import mongoose from "mongoose";

const { Schema, model } = mongoose;

// ─── User ────────────────────────────────────────────────────────────────────
const endorsementSubSchema = new Schema({
  skill:      { type: String, required: true },
  endorserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const userSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true },
  bio:         { type: String, default: "" },
  avatar:      { type: String, default: "" },        // initials or base64 image data URL
  avatarUrl:   { type: String, default: "" },         // uploaded profile picture URL/data URI
  role:        { 
    type: String, 
    enum: ["student", "general_user", "institute_admin", "super_admin", "user", "collegeAdmin", "websiteAdmin"], 
    default: "general_user" 
  },
  welcomeShown:{ type: Boolean, default: false },
  college:     { type: String, default: "" }, // Institution for scoping collegeAdmin capabilities
  collegeId:   { type: Schema.Types.ObjectId, ref: "College", default: null },
  collegeIdNumber: { type: String, default: "" },
  wallet:      { type: String, default: "" },
  credits:     { type: Number, default: 10 },
  earned:      { type: Number, default: 0 },
  spent:       { type: Number, default: 0 },
  aictePoints: { type: Number, default: 0 },
  rep:         { type: Number, default: 0 },
  reviews:     { type: Number, default: 0 },

  // ── Gamified Level System ──
  level:              { type: Number, default: 1 },
  xp:                 { type: Number, default: 0 },   // completed services as provider
  servicesOffered:    { type: Number, default: 0 },
  servicesTaken:      { type: Number, default: 0 },

  // ── Enhanced Profile ──
  skills:        [{ type: String }],
  interests:     [{ type: String }],
  education:      { type: String, default: "" },
  phone:          { type: String, default: "" },
  phoneVerified:  { type: Boolean, default: false },
  location:       { type: String, default: "" },
  languages:     [{ type: String }],
  availability:   { type: String, enum: ["online", "offline", "available"], default: "offline" },

  // ── Freeloader Restriction ──
  restrictionUntil:  { type: Date, default: null },
  restrictionReason: { type: String, default: "" },
  freeloaderWarned:  { type: Boolean, default: false },
  isBlocked:         { type: Boolean, default: false },

  // ── Trust Score ──
  trustScore:     { type: Number, default: 100 },
  cancellations:  { type: Number, default: 0 },
  responseTime:   { type: Number, default: 0 },    // avg response in minutes
  completionRate: { type: Number, default: 100 },

  // ── Referral ──
  referralCode:          { type: String, unique: true, sparse: true },
  referredBy:            { type: String, default: "" },
  firstServiceCompleted: { type: Boolean, default: false },
  referralCredited:      { type: Boolean, default: false },

  // ── Badges & Endorsements ──
  badges:       [{ type: String }],
  endorsements: [endorsementSubSchema],

  // ── Onboarding ──
  welcomeShown: { type: Boolean, default: false },

  // ── Level Demotion Tracking ──
  lastActiveAt:       { type: Date, default: Date.now },
  demotionWarned:     { type: Boolean, default: false },
  demotionWarningAt:  { type: Date, default: null },

  // ── Face & Device Verification ──
  faceDescriptor:     [{ type: Number }],           // 128-dim face embedding from face-api.js
  deviceFingerprints: [{ type: String }],            // known FingerprintJS visitorIds

  // ── Fraud & Multi-Layer Security ──
  phoneHash:          { type: String, sparse: true },
  idNumberHash:       { type: String, sparse: true },
  registrationIp:     { type: String, default: "" },
  verificationStatus: { type: String, enum: ["pending", "verified", "flagged", "rejected"], default: "pending" },
  riskScore:          { type: Number, default: 0 },
  flaggedReasons:     [{ type: String }],
  reviewedBy:         { type: Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt:         { type: Date, default: null },
  rejectionReason:    { type: String, default: "" },

  // ── Alumni & Graduate Transition ──
  isAlumni:           { type: Boolean, default: false },
  graduatedAt:        { type: Date, default: null },
  graduationYear:     { type: Number, default: null },
  almaMater:          { type: String, default: "" },
  collegeEmail:       { type: String, default: "" },
}, { timestamps: true });

// ─── Skill ───────────────────────────────────────────────────────────────────
const skillSchema = new Schema({
  name:     { type: String, required: true },
  category: { type: String, required: true },
});

// ─── Service ─────────────────────────────────────────────────────────────────
const serviceSchema = new Schema({
  providerId:  { type: Schema.Types.ObjectId, ref: "User", required: true },
  skillId:     { type: Schema.Types.ObjectId, ref: "Skill", required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true },
  hours:       { type: Number, required: true, min: 0.5 },
  images:      { type: [String], default: [] },
  status:      { type: String, enum: ["active", "paused", "deleted"], default: "active" },
}, { timestamps: true });

// ─── Booking ─────────────────────────────────────────────────────────────────
const bookingSchema = new Schema({
  serviceId:      { type: Schema.Types.ObjectId, ref: "Service", required: true },
  providerId:     { type: Schema.Types.ObjectId, ref: "User", required: true },
  requesterId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  status:         { type: String, enum: ["pending", "confirmed", "completed", "cancelled", "disputed"], default: "pending" },
  scheduledStart: { type: String, required: true },
  hours:          { type: Number, required: true },
  notes:          { type: String, default: "" },
  txHash:         { type: String, default: null },
  blockNumber:    { type: Number, default: null },

  // ── Escrow ──
  escrowHeld:         { type: Boolean, default: false },

  // ── Mutual Completion Confirmation ──
  providerConfirmed:  { type: Boolean, default: false },
  requesterConfirmed: { type: Boolean, default: false },
  requesterReviewed:  { type: Boolean, default: false },
  autoConfirmAt:      { type: Date, default: null },
}, { timestamps: true });

// ─── Transaction ─────────────────────────────────────────────────────────────
const transactionSchema = new Schema({
  fromId:      { type: String, required: true }, // ObjectId string or "SYSTEM"
  toId:        { type: String, required: true },
  bookingId:   { type: Schema.Types.ObjectId, ref: "Booking", default: null },
  amount:      { type: Number, required: true },
  type:        { type: String, required: true }, // service_completed, aicte_reward, initial_credits, escrow_hold, escrow_release, escrow_refund, referral_bonus
  desc:        { type: String, default: "" },
  txHash:      { type: String, default: null },
  blockNumber: { type: Number, default: null },
}, { timestamps: true });

// ─── Review ──────────────────────────────────────────────────────────────────
const reviewSchema = new Schema({
  reviewerId:  { type: Schema.Types.ObjectId, ref: "User", required: true },
  revieweeId:  { type: Schema.Types.ObjectId, ref: "User", required: true },
  bookingId:   { type: Schema.Types.ObjectId, ref: "Booking", required: true },
  serviceId:   { type: Schema.Types.ObjectId, ref: "Service", default: null },
  rating:      { type: Number, required: true, min: 1, max: 5 },
  comment:     { type: String, default: "" },
  direction:   { type: String, enum: ["requester_to_provider", "provider_to_requester"], default: "requester_to_provider" },
}, { timestamps: true });

// ─── College ─────────────────────────────────────────────────────────────────
const collegeSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  emailDomain: { type: String, required: true, lowercase: true, trim: true },
  code:        { type: String, default: "", uppercase: true, trim: true },
  city:        { type: String, default: "" },
  state:       { type: String, default: "" },
}, { timestamps: true });

// ─── Notification ────────────────────────────────────────────────────────────
const notificationSchema = new Schema({
  userId:  { type: Schema.Types.ObjectId, ref: "User", index: true },
  user:    { type: Schema.Types.ObjectId, ref: "User", index: true },
  type:    { type: String, required: true },
  // Types: match_request, match_accepted, transaction_confirmed, verification_decision,
  //        low_balance, flagged_review, credit, level_up, warning, restriction, badge,
  //        referral, chat, booking, review, dispute, completion, welcome, demotion_warning
  title:   { type: String, required: true },
  body:    { type: String, default: "" },
  message: { type: String, default: "" },
  data:    { type: Schema.Types.Mixed, default: {} },
  read:    { type: Boolean, default: false },
}, { timestamps: true });

// ─── Certificate (Verifiable AICTE) ──────────────────────────────────────────
const certificateSchema = new Schema({
  certId:         { type: String, required: true, unique: true, index: true },
  user:           { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  college:        { type: Schema.Types.Mixed, default: null },
  activityPoints: { type: Number, required: true },
  totalHours:     { type: Number, required: true },
  exchangeCount:  { type: Number, required: true },
  periodStart:    { type: Date, required: true },
  periodEnd:      { type: Date, required: true },
  integrityHash:  { type: String, required: true },
  txHash:         { type: String, default: null },
  blockNumber:    { type: Number, default: null },
}, { timestamps: true });

// ─── Dispute ─────────────────────────────────────────────────────────────────
const disputeSchema = new Schema({
  bookingId:   { type: Schema.Types.ObjectId, ref: "Booking", required: true },
  raisedBy:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  againstUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reason:      { type: String, required: true },
  status:      { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
  resolution:  { type: String, default: "" },
  resolvedBy:  { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

// ─── AICTE Activity ──────────────────────────────────────────────────────────
const aicteSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
  college:     { type: String, default: "" }, // The target institution for verification
  type:        { type: String, required: true }, // workshop, hackathon, internship, fdp, paper, course
  title:       { type: String, required: true },
  organizer:   { type: String, required: true },
  date:        { type: String, required: true },
  pts:         { type: Number, required: true },
  credits:     { type: Number, required: true },
  certUrl:     { type: String, default: "" },
  verified:    { type: Boolean, default: false },
  txHash:      { type: String, default: null },
  blockNumber: { type: Number, default: null },
  aiScore:     { type: Number, default: null },
  aiFeedback:  { type: String, default: "" }
}, { timestamps: true });

// ─── Chat ────────────────────────────────────────────────────────────────────
const messageSubSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text:     { type: String, required: true },
  readAt:   { type: Date, default: null },
}, { timestamps: true });

const chatSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
  messages:     [messageSubSchema],
}, { timestamps: true });

// ─── Emergency Contact ───────────────────────────────────────────────────────
const emergencySchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  name:     { type: String, required: true },
  phone:    { type: String, required: true },
  relation: { type: String, required: true }
}, { timestamps: true });

// ─── Blockchain Record ───────────────────────────────────────────────────────
const blockchainSchema = new Schema({
  block:   { type: Number, required: true },
  txHash:  { type: String, required: true },
  from:    { type: String, required: true },
  to:      { type: String, required: true },
  amount:  { type: Number, required: true },
  type:    { type: String, required: true }, // TRANSFER, MINT
}, { timestamps: true });

// ─── Fraud Review ─────────────────────────────────────────────────────────────
const fraudReviewSchema = new Schema({
  type:       { type: String, enum: ["user", "transaction", "booking"], required: true },
  targetId:   { type: Schema.Types.ObjectId, required: true },
  userId:     { type: Schema.Types.ObjectId, ref: "User", default: null },
  senderId:   { type: Schema.Types.ObjectId, ref: "User", default: null },
  receiverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  bookingId:  { type: Schema.Types.ObjectId, ref: "Booking", default: null },
  riskScore:  { type: Number, required: true },
  reasons:    [{ type: String }],
  status:     { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  note:       { type: String, default: "" },
}, { timestamps: true });

// ─── OTP / Magic Link Verification ──────────────────────────────────────────
const otpSchema = new Schema({
  email:     { type: String, required: true, lowercase: true, trim: true, index: true },
  code:      { type: String, required: true },
  token:     { type: String, default: null }, // for magic link
  type:      { type: String, enum: ["login", "register", "verify_email"], default: "login" },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
}, { timestamps: true });

// ─── Export Models ───────────────────────────────────────────────────────────
export const College      = model("College", collegeSchema);
export const User         = model("User", userSchema);
export const Skill        = model("Skill", skillSchema);
export const Service      = model("Service", serviceSchema);
export const Booking      = model("Booking", bookingSchema);
export const Transaction  = model("Transaction", transactionSchema);
export const Review       = model("Review", reviewSchema);
export const Notification = model("Notification", notificationSchema);
export const Certificate  = model("Certificate", certificateSchema);
export const Dispute      = model("Dispute", disputeSchema);
export const Aicte        = model("Aicte", aicteSchema);
export const Chat         = model("Chat", chatSchema);
export const Emergency    = model("Emergency", emergencySchema);
export const Blockchain   = model("Blockchain", blockchainSchema);
export const FraudReview  = model("FraudReview", fraudReviewSchema);
export const Otp          = model("Otp", otpSchema);

// ─── TimeBank — Mongoose Models ──────────────────────────────────────────────
import mongoose from "mongoose";

const { Schema, model } = mongoose;

// ─── User ────────────────────────────────────────────────────────────────────
const userSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true },
  bio:         { type: String, default: "" },
  avatar:      { type: String, default: "" },
  role:        { type: String, enum: ["user", "admin"], default: "user" },
  wallet:      { type: String, default: "" },
  credits:     { type: Number, default: 2 },
  earned:      { type: Number, default: 0 },
  spent:       { type: Number, default: 0 },
  aictePoints: { type: Number, default: 0 },
  rep:         { type: Number, default: 0 },
  reviews:     { type: Number, default: 0 },
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
  status:         { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
  scheduledStart: { type: String, required: true },
  hours:          { type: Number, required: true },
  notes:          { type: String, default: "" },
  txHash:         { type: String, default: null },
  blockNumber:    { type: Number, default: null },
}, { timestamps: true });

// ─── Transaction ─────────────────────────────────────────────────────────────
const transactionSchema = new Schema({
  fromId:      { type: String, required: true }, // ObjectId string or "SYSTEM"
  toId:        { type: String, required: true },
  bookingId:   { type: Schema.Types.ObjectId, ref: "Booking", default: null },
  amount:      { type: Number, required: true },
  type:        { type: String, required: true }, // service_completed, aicte_reward, initial_credits
  desc:        { type: String, default: "" },
  txHash:      { type: String, default: null },
  blockNumber: { type: Number, default: null },
}, { timestamps: true });

// ─── Review ──────────────────────────────────────────────────────────────────
const reviewSchema = new Schema({
  reviewerId:  { type: Schema.Types.ObjectId, ref: "User", required: true },
  revieweeId:  { type: Schema.Types.ObjectId, ref: "User", required: true },
  bookingId:   { type: Schema.Types.ObjectId, ref: "Booking", required: true },
  rating:      { type: Number, required: true, min: 1, max: 5 },
  comment:     { type: String, default: "" },
}, { timestamps: true });

// ─── AICTE Activity ──────────────────────────────────────────────────────────
const aicteSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
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
}, { timestamps: true });

// ─── Chat ────────────────────────────────────────────────────────────────────
const messageSubSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text:     { type: String, required: true },
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
  relation: { type: String, required: true },
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

// ─── Export Models ───────────────────────────────────────────────────────────
export const User        = model("User", userSchema);
export const Skill       = model("Skill", skillSchema);
export const Service     = model("Service", serviceSchema);
export const Booking     = model("Booking", bookingSchema);
export const Transaction = model("Transaction", transactionSchema);
export const Review      = model("Review", reviewSchema);
export const Aicte       = model("Aicte", aicteSchema);
export const Chat        = model("Chat", chatSchema);
export const Emergency   = model("Emergency", emergencySchema);
export const Blockchain  = model("Blockchain", blockchainSchema);

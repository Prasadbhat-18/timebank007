// ─── TimeBank — Shared Config & Helpers ──────────────────────────────────────
// Data now lives in MongoDB. This file exports shared config.

export const AICTE_CFG = {
  workshop:   { pts: 5,  credits: 1, label: "Workshop" },
  hackathon:  { pts: 15, credits: 3, label: "Hackathon" },
  internship: { pts: 25, credits: 5, label: "Internship" },
  fdp:        { pts: 10, credits: 2, label: "FDP / Training" },
  paper:      { pts: 30, credits: 6, label: "Published Paper" },
  course:     { pts: 8,  credits: 2, label: "Online Course" },
};

// ─── LEVEL CONFIGURATION ─────────────────────────────────────────────────────
export const LEVEL_CFG = {
  1: { name: "Newcomer",         color: "#94a3b8", icon: "🌱", req: 0,  ratingReq: 0,   perks: "Can offer services at fixed minimum credit rate" },
  2: { name: "Contributor",      color: "#3b82f6", icon: "⭐", req: 3,  ratingReq: 0,   perks: "Profile badge, minor listing priority" },
  3: { name: "Skilled",          color: "#8b5cf6", icon: "💎", req: 7,  ratingReq: 4.0, perks: "Custom credit pricing unlocked" },
  4: { name: "Trusted Provider", color: "#f59e0b", icon: "🛡️", req: 15, ratingReq: 4.0, perks: "Reduced platform fee, Trusted badge" },
  5: { name: "Elite",            color: "#ef4444", icon: "👑", req: 30, ratingReq: 4.5, perks: "Featured placement, early access" },
};

// ─── BADGE DEFINITIONS ───────────────────────────────────────────────────────
export const BADGES = {
  first_service:    { name: "First Service",    icon: "🎯", desc: "Completed your first service as a provider", color: "#10b981" },
  five_star_streak: { name: "5-Star Streak",    icon: "⭐", desc: "Received 5 consecutive 5-star ratings",      color: "#f59e0b" },
  community_pillar: { name: "Community Pillar", icon: "🏛️", desc: "Completed 30+ services as a provider",      color: "#8b5cf6" },
  skill_master:     { name: "Skill Master",     icon: "🎓", desc: "10+ endorsements on a single skill",        color: "#3b82f6" },
  helpful_reviewer: { name: "Helpful Reviewer", icon: "📝", desc: "Left 10+ reviews for other users",          color: "#14b8a6" },
  trusted:          { name: "Trusted Provider", icon: "🛡️", desc: "Reached Level 4 — Trusted Provider",        color: "#f59e0b" },
  speed_demon:      { name: "Speed Demon",      icon: "⚡", desc: "Average response time under 30 minutes",    color: "#ef4444" },
};

// ─── NOTIFICATION TYPE ICONS ─────────────────────────────────────────────────
export const NOTIF_ICONS = {
  credit:           "💰",
  level_up:         "🎉",
  warning:          "⚠️",
  restriction:      "🚫",
  badge:            "🏆",
  referral:         "🎁",
  chat:             "💬",
  booking:          "📅",
  review:           "⭐",
  dispute:          "🚨",
  completion:       "✅",
  welcome:          "👋",
  demotion_warning: "📉",
};

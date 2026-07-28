// ─── TimeBank — Shared Config & Helpers ──────────────────────────────────────
// Data now lives in MongoDB. This file only exports shared config.

export const AICTE_CFG = {
  workshop:   { pts: 5,  credits: 1, label: "Workshop" },
  hackathon:  { pts: 15, credits: 3, label: "Hackathon" },
  internship: { pts: 25, credits: 5, label: "Internship" },
  fdp:        { pts: 10, credits: 2, label: "FDP / Training" },
  paper:      { pts: 30, credits: 6, label: "Published Paper" },
  course:     { pts: 8,  credits: 2, label: "Online Course" },
};

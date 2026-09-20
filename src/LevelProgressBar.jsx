import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LEVEL_CFG, getMaxCreditsForLevel } from "./store.js";
import * as api from "./api.js";

/**
 * LevelProgressBar
 * 
 * Genuine, authentic level progression widget for user profiles.
 * Avoids gimmicky AI-style animations (pulsing rainbow neon glows, bouncy jitter)
 * and focuses on clean typography, precise milestone tracking, authentic ease-out
 * transitions, and actionable tier perks.
 */
export default function LevelProgressBar({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronous initial fallback calculation so there is no layout shift or flicker
  const fallbackLevel = user?.level || 1;
  const fallbackNext = Math.min(fallbackLevel + 1, 5);
  const currentCfg = LEVEL_CFG[fallbackLevel] || LEVEL_CFG[1];
  const nextCfg = LEVEL_CFG[fallbackNext] || LEVEL_CFG[5];
  const userXp = user?.xp || 0;
  const xpForCurrent = currentCfg.req || 0;
  const xpForNext = nextCfg.req || 0;
  const progressXP = Math.max(0, userXp - xpForCurrent);
  const neededXP = Math.max(1, xpForNext - xpForCurrent);
  const fallbackPct = fallbackLevel >= 5 ? 100 : Math.min(100, Math.round((progressXP / neededXP) * 100));

  useEffect(() => {
    let mounted = true;
    if (user?._id) {
      api.fetchLevelProgress(user._id)
        .then((res) => {
          if (mounted && res && !res.error) {
            setData(res);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [user?._id, user?.xp, user?.level, user?.rep]);

  const level = data?.level || fallbackLevel;
  const levelName = data?.levelName || currentCfg.name;
  const cfg = LEVEL_CFG[level] || LEVEL_CFG[1];
  const xp = data?.xp !== undefined ? data.xp : userXp;
  const nextLevel = data?.nextLevel || fallbackNext;
  const nextLevelCfg = LEVEL_CFG[nextLevel] || LEVEL_CFG[5];
  const nextLevelName = data?.nextLevelName || nextLevelCfg.name;
  const progressPct = data?.progressPct !== undefined ? data.progressPct : fallbackPct;
  const isMaxLevel = data?.isMaxLevel !== undefined ? data.isMaxLevel : (level >= 5);

  const currentRating = user?.rep || 0;
  const ratingReq = nextLevelCfg.ratingReq || 0;
  const meetsRating = ratingReq === 0 || currentRating >= ratingReq;

  const currentCreditLimit = getMaxCreditsForLevel(level);
  const isDesiredUnlimited = currentCreditLimit === Infinity;

  // Milestone list for 5 levels
  const levels = [1, 2, 3, 4, 5];

  return (
    <div
      className="card mt2"
      style={{
        background: "linear-gradient(180deg, rgba(16, 24, 39, 0.7) 0%, rgba(12, 15, 23, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Top Header Row */}
      <div className="btwn" style={{ flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              background: `${cfg.color}15`,
              border: `1px solid ${cfg.color}35`,
              color: cfg.color,
              flexShrink: 0
            }}
          >
            {cfg.icon}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-0.01em" }}>
                Level {level} · {levelName}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: isMaxLevel ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.06)",
                  color: isMaxLevel ? "#ef4444" : "var(--text-secondary)",
                  border: isMaxLevel ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)"
                }}
              >
                {isMaxLevel ? "Max Level Achieved 👑" : `Next: Level ${nextLevel} (${nextLevelName})`}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
              {isMaxLevel
                ? "You have reached the highest platform tier."
                : `${xp} service${xp === 1 ? "" : "s"} delivered · ${Math.max(0, (nextLevelCfg.req || 0) - xp)} more to advance`}
            </div>
          </div>
        </div>

        {/* XP & Progress Badge */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: cfg.color, letterSpacing: "-0.02em" }}>
            {progressPct}%
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            {isMaxLevel ? "Tier 5 Elite" : `Tier ${level} of 5`}
          </div>
        </div>
      </div>

      {/* Genuine Progress Track (Clean, authentic transition, no AI glow/flutter) */}
      <div style={{ marginTop: 18, marginBottom: 14 }}>
        <div
          style={{
            width: "100%",
            height: 10,
            background: "rgba(255, 255, 255, 0.07)",
            borderRadius: 999,
            overflow: "hidden",
            position: "relative",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.4)"
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, Math.max(progressPct, 0))}%`,
              background: `linear-gradient(90deg, ${cfg.color}, ${nextLevelCfg.color || cfg.color})`,
              borderRadius: 999,
              transition: "width 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
              position: "relative"
            }}
          />
        </div>
      </div>

      {/* 5-Level Milestone Stepper */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(255, 255, 255, 0.05)"
        }}
      >
        {levels.map((lvl) => {
          const lCfg = LEVEL_CFG[lvl];
          const isCompleted = level > lvl;
          const isCurrent = level === lvl;
          const isFuture = level < lvl;

          return (
            <div
              key={lvl}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                position: "relative"
              }}
            >
              {/* Step indicator node */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 6,
                  transition: "all 0.3s ease",
                  ...(isCompleted
                    ? {
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1.5px solid #10b981",
                        color: "#10b981"
                      }
                    : isCurrent
                    ? {
                        background: `${lCfg.color}25`,
                        border: `2px solid ${lCfg.color}`,
                        color: lCfg.color,
                        boxShadow: `0 0 10px ${lCfg.color}30`
                      }
                    : {
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "var(--text-muted)",
                        opacity: 0.6
                      })
                }}
                title={`Level ${lvl}: ${lCfg.name} (${lCfg.req} services)`}
              >
                {isCompleted ? "✓" : lCfg.icon}
              </div>

              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? "#fff" : isCompleted ? "var(--text-secondary)" : "var(--text-muted)",
                  lineHeight: 1.2
                }}
              >
                L{lvl} {lCfg.name}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                {lvl === 1 ? "0 svcs" : `${lCfg.req} svcs`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Requirements & Status Breakdown Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
          marginTop: 16
        }}
      >
        {/* Metric 1: Services Completed (XP) */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.025)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: 10,
            padding: "10px 12px"
          }}
        >
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
            SERVICES DELIVERED
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginTop: 2 }}>
            {xp} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>/ {isMaxLevel ? "30 (Max)" : `${nextLevelCfg.req} required`}</span>
          </div>
          <div style={{ fontSize: 11, color: isMaxLevel ? "var(--em)" : (xp >= (nextLevelCfg.req || 0) ? "var(--em)" : "var(--amber)"), marginTop: 3 }}>
            {isMaxLevel ? "✓ Target completed" : xp >= (nextLevelCfg.req || 0) ? "✓ Ready for promotion" : `${Math.max(0, (nextLevelCfg.req || 0) - xp)} more needed`}
          </div>
        </div>

        {/* Metric 2: Rating Requirement */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.025)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: 10,
            padding: "10px 12px"
          }}
        >
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
            REPUTATION SCORE
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginTop: 2 }}>
            {currentRating ? `★ ${Number(currentRating).toFixed(1)}` : "★ 0.0"} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{ratingReq > 0 ? `/ ${ratingReq.toFixed(1)} min` : "(No min)"}</span>
          </div>
          <div style={{ fontSize: 11, color: meetsRating ? "var(--em)" : "#ef4444", marginTop: 3 }}>
            {meetsRating ? "✓ Rating criterion met" : `Needs at least ★ ${ratingReq.toFixed(1)}`}
          </div>
        </div>

        {/* Metric 3: Time Credit Limit */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.025)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: 10,
            padding: "10px 12px"
          }}
        >
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
            ASKING CREDIT RATE
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: isDesiredUnlimited ? "var(--em)" : "#f59e0b", marginTop: 2 }}>
            {isDesiredUnlimited ? "Custom Desired" : `Max ${currentCreditLimit} cr / session`}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
            {level >= 3 ? "⚡ Unlimited pricing unlocked" : "Level 3 unlocks desired pricing"}
          </div>
        </div>
      </div>

      {/* Genuine Perk Unlock Box */}
      <div
        style={{
          marginTop: 14,
          padding: "10px 14px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}
      >
        <span style={{ fontSize: 16 }}>{isMaxLevel ? "👑" : "🎁"}</span>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
          {isMaxLevel ? (
            <span>
              <strong style={{ color: "#fff" }}>Elite Status Perk: </strong>
              {cfg.perks}
            </span>
          ) : (
            <span>
              <strong style={{ color: "#fff" }}>Next Unlock (Level {nextLevel}): </strong>
              {nextLevelCfg.perks}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

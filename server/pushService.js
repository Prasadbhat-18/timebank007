// ─── server/pushService.js ─────────────────────────────────────────────────
import webpush from "web-push";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "./models.js";

let currentFile = "";
try {
  if (typeof import.meta !== "undefined" && import.meta?.url) {
    currentFile = fileURLToPath(import.meta.url);
  }
} catch {}
const __filename = currentFile || "";
const __dirname = __filename ? path.dirname(__filename) : process.cwd();
const envPath = path.join(__dirname, "..", ".env");

let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@timebank.app";

// Generate persistent VAPID keys if not present
if (!vapidPublicKey || !vapidPrivateKey) {
  try {
    const keys = webpush.generateVAPIDKeys();
    vapidPublicKey = keys.publicKey;
    vapidPrivateKey = keys.privateKey;
    process.env.VAPID_PUBLIC_KEY = vapidPublicKey;
    process.env.VAPID_PRIVATE_KEY = vapidPrivateKey;

    // Append to .env file for persistence if writable
    try {
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8");
        if (!envContent.includes("VAPID_PUBLIC_KEY=")) {
          envContent += `\nVAPID_PUBLIC_KEY=${vapidPublicKey}\nVAPID_PRIVATE_KEY=${vapidPrivateKey}\n`;
          fs.writeFileSync(envPath, envContent, "utf8");
        }
      }
    } catch {}
    console.log("[WebPush] Initialized ephemeral VAPID keys.");
  } catch (e) {
    console.warn("[WebPush] Could not generate VAPID keys automatically:", e.message);
  }
}

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log("[WebPush] Initialized VAPID details successfully.");
  } catch (err) {
    console.error("[WebPush] Failed to set VAPID details:", err.message);
  }
}

export function getVapidPublicKey() {
  return vapidPublicKey;
}

/**
 * Sends Web Push notification to all active devices for a user.
 * Prunes expired or unregistered subscription endpoints automatically.
 */
export async function sendPushToUser(userId, { title, body, icon = "/favicon.svg", badge = "/favicon.svg", url = "/", data = {} }) {
  if (!userId) return 0;

  try {
    const user = await User.findById(userId).select("pushSubscriptions");
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return 0;
    }

    const payload = JSON.stringify({
      title: title || "TimeBank Alert",
      body: body || "You have a new update in TimeBank",
      icon,
      badge,
      url,
      data: { url, ...data },
      timestamp: Date.now(),
    });

    const deadEndpoints = new Set();
    let sentCount = 0;

    const pushPromises = user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload,
          {
            TTL: 86400, // 24 hours
            urgency: "high",
          }
        );
        sentCount++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or unsubscribed
          deadEndpoints.add(sub.endpoint);
        } else {
          console.warn(`[WebPush] Push delivery error for user ${userId}:`, err.statusCode || err.message);
        }
      }
    });

    await Promise.allSettled(pushPromises);

    // Prune dead subscriptions
    if (deadEndpoints.size > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushSubscriptions: { endpoint: { $in: Array.from(deadEndpoints) } } },
      });
      console.log(`[WebPush] Pruned ${deadEndpoints.size} dead push subscriptions for user ${userId}`);
    }

    return sentCount;
  } catch (err) {
    console.error("[WebPush] sendPushToUser error:", err);
    return 0;
  }
}

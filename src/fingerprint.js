// ─── Device Fingerprinting Utility ───────────────────────────────────────────
// Generates a stable device fingerprint using @fingerprintjs/fingerprintjs
import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cachedId = null;

export async function getDeviceFingerprint() {
  if (cachedId) return cachedId;
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    cachedId = result.visitorId;
    return cachedId;
  } catch {
    // If fingerprinting fails (e.g. in a restricted environment), return null
    return null;
  }
}

// ─── src/pushManager.js ─────────────────────────────────────────────────────
import * as api from "./api.js";

function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== "string") {
    throw new Error("Invalid VAPID public key string.");
  }
  const cleanKey = base64String.trim();
  const padding = "=".repeat((4 - (cleanKey.length % 4)) % 4);
  const base64 = (cleanKey + padding).replace(/-/g, "+").replace(/_/g, "/");
  try {
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch {
    throw new Error("Unable to decode VAPID public key. Please verify VAPID configuration on the server.");
  }
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPermission() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission; // "default", "granted", "denied"
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    console.log("[PWA] Service Worker registered:", reg.scope);
    return reg;
  } catch (err) {
    console.warn("[PWA] Service Worker registration failed:", err);
    return null;
  }
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error("Web Push is not supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Push notification permission was not granted.");
  }

  const reg = await navigator.serviceWorker.ready;
  if (!reg) {
    throw new Error("Service Worker is not ready.");
  }

  const keyRes = await api.fetchVapidPublicKey().catch((e) => {
    throw new Error(`Failed to retrieve VAPID key from server: ${e.message}`);
  });
  const publicKey = keyRes?.publicKey;
  if (!publicKey || typeof publicKey !== "string" || publicKey.length < 20) {
    throw new Error(keyRes?.error || "VAPID public key is not configured on the server. Please check environment variables.");
  }

  const convertedVapidKey = urlBase64ToUint8Array(publicKey);
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey,
  });

  await api.subscribePush(subscription);
  return subscription;
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (subscription) {
    await api.unsubscribePush(subscription.endpoint).catch(() => {});
    await subscription.unsubscribe();
    return true;
  }
  return false;
}

export async function checkCurrentSubscription() {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

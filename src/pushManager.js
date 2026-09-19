// ─── src/pushManager.js ─────────────────────────────────────────────────────
import * as api from "./api.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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

  const { publicKey } = await api.fetchVapidPublicKey();
  if (!publicKey) {
    throw new Error("Server did not return a valid VAPID public key.");
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

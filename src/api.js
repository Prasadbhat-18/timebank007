// ─── TimeBank — API Client ───────────────────────────────────────────────────
// All fetch calls to the Express backend. Proxied via Vite in dev.

const BASE = import.meta.env.VITE_API_URL || "/api";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const register = (name, email, password, bio, wallet) =>
  req("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, bio, wallet }) });

export const adminLogin = (email, password) =>
  req("/auth/admin-login", { method: "POST", body: JSON.stringify({ email, password }) });

// ─── Users ───────────────────────────────────────────────────────────────────
export const fetchUsers = () => req("/users");
export const fetchUser = (id) => req(`/users/${id}`);
export const updateUser = (id, data) =>
  req(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) });

// ─── Skills ──────────────────────────────────────────────────────────────────
export const fetchSkills = () => req("/skills");

// ─── Services ────────────────────────────────────────────────────────────────
export const fetchServices = () => req("/services");
export const createService = (data) =>
  req("/services", { method: "POST", body: JSON.stringify(data) });
export const updateService = (id, data) =>
  req(`/services/${id}`, { method: "PUT", body: JSON.stringify(data) });

// ─── Bookings ────────────────────────────────────────────────────────────────
export const fetchAllBookings = () => req("/bookings");
export const fetchUserBookings = (userId) => req(`/bookings/user/${userId}`);
export const createBooking = (data) =>
  req("/bookings", { method: "POST", body: JSON.stringify(data) });
export const updateBooking = (id, data) =>
  req(`/bookings/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const completeBooking = (id, txHash, blockNumber) =>
  req(`/bookings/${id}/complete`, { method: "POST", body: JSON.stringify({ txHash, blockNumber }) });

// ─── Transactions ────────────────────────────────────────────────────────────
export const fetchAllTransactions = () => req("/transactions");
export const fetchUserTransactions = (userId) => req(`/transactions/user/${userId}`);
export const createTransaction = (data) =>
  req("/transactions", { method: "POST", body: JSON.stringify(data) });

// ─── Reviews ─────────────────────────────────────────────────────────────────
export const fetchAllReviews = () => req("/reviews");
export const fetchUserReviews = (userId) => req(`/reviews/user/${userId}`);
export const createReview = (data) =>
  req("/reviews", { method: "POST", body: JSON.stringify(data) });

// ─── AICTE ───────────────────────────────────────────────────────────────────
export const fetchAllAicte = () => req("/aicte");
export const fetchUserAicte = (userId) => req(`/aicte/user/${userId}`);
export const createAicte = (data) =>
  req("/aicte", { method: "POST", body: JSON.stringify(data) });
export const verifyAicte = (id, txHash, blockNumber) =>
  req(`/aicte/${id}/verify`, { method: "POST", body: JSON.stringify({ txHash, blockNumber }) });
export const rejectAicte = (id) =>
  req(`/aicte/${id}/reject`, { method: "POST" });

// ─── Chats ───────────────────────────────────────────────────────────────────
export const fetchUserChats = (userId) => req(`/chats/user/${userId}`);
export const createChat = (participants) =>
  req("/chats", { method: "POST", body: JSON.stringify({ participants }) });
export const sendMessage = (chatId, senderId, text) =>
  req(`/chats/${chatId}/message`, { method: "POST", body: JSON.stringify({ senderId, text }) });

// ─── Emergency ───────────────────────────────────────────────────────────────
export const fetchEmergencyContacts = (userId) => req(`/emergency/user/${userId}`);
export const addEmergencyContact = (data) =>
  req("/emergency", { method: "POST", body: JSON.stringify(data) });
export const removeEmergencyContact = (id) =>
  req(`/emergency/${id}`, { method: "DELETE" });

// ─── Blockchain ──────────────────────────────────────────────────────────────
export const fetchBlockchainRecords = () => req("/blockchain");
export const fetchUserBlockchain = (wallet) => req(`/blockchain/user/${wallet}`);

// ─── Admin ───────────────────────────────────────────────────────────────────
export const fetchAdminStats = () => req("/admin/stats");

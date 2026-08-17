// ─── TimeBank — API Client ───────────────────────────────────────────────────
// All fetch calls to the Express backend. Proxied via Vite in dev.

const BASE = import.meta.env.VITE_API_URL || "/api";

async function req(path, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers,
    ...opts,
  });
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || `Server error (${res.status})` };
    }
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const login = (email, password, faceDescriptor, deviceFingerprint) =>
  req("/auth/login", { method: "POST", body: JSON.stringify({ email, password, faceDescriptor, deviceFingerprint }) });

export const register = (name, email, password, bio, wallet, referralCode, college, faceDescriptor, deviceFingerprint, phone, collegeIdNumber) =>
  req("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, bio, wallet, referralCode, college, faceDescriptor, deviceFingerprint, phone, collegeIdNumber }) });

export const websiteAdminLogin = (email, password) =>
  req("/auth/website-admin-login", { method: "POST", body: JSON.stringify({ email, password }) });

export const collegeAdminLogin = (email, password) =>
  req("/auth/college-admin-login", { method: "POST", body: JSON.stringify({ email, password }) });

export const markWelcomeShown = (userId) =>
  req(`/auth/welcome-shown/${userId}`, { method: "POST" });

export const enrollFace = (faceDescriptor) =>
  req("/auth/face-verify", { method: "POST", body: JSON.stringify({ faceDescriptor }) });

export const checkFace = (faceDescriptor) =>
  req("/auth/face-check", { method: "POST", body: JSON.stringify({ faceDescriptor }) });

// ─── Users ───────────────────────────────────────────────────────────────────
export const fetchUsers = () => req("/users");
export const fetchUser = (id) => req(`/users/${id}`);
export const updateUser = (id, data) =>
  req(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const fetchLevelProgress = (id) => req(`/users/${id}/level-progress`);

export const uploadAvatar = (id, avatarUrl) =>
  req(`/users/${id}/upload-avatar`, { method: "POST", body: JSON.stringify({ avatarUrl }) });

export const endorseSkill = (userId, skill, endorserId) =>
  req(`/users/${userId}/endorse`, { method: "POST", body: JSON.stringify({ skill, endorserId }) });

// ─── Skills ──────────────────────────────────────────────────────────────────
export const fetchSkills = () => req("/skills");

// ─── Services ────────────────────────────────────────────────────────────────
export const fetchServices = () => req("/services");
export const createService = (data) =>
  req("/services", { method: "POST", body: JSON.stringify(data) });
export const updateService = (id, data) =>
  req(`/services/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteService = (id) =>
  req(`/services/${id}`, { method: "DELETE" });

// ─── Bookings ────────────────────────────────────────────────────────────────
export const fetchAllBookings = () => req("/bookings");
export const fetchUserBookings = (userId) => req(`/bookings/user/${userId}`);
export const createBooking = (data) =>
  req("/bookings", { method: "POST", body: JSON.stringify(data) });
export const updateBooking = (id, data) =>
  req(`/bookings/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const completeBooking = (id, txHash, blockNumber) =>
  req(`/bookings/${id}/complete`, { method: "POST", body: JSON.stringify({ txHash, blockNumber }) });
export const confirmCompletion = (id, userId) =>
  req(`/bookings/${id}/confirm-completion`, { method: "POST", body: JSON.stringify({ userId }) });

// ─── Transactions ────────────────────────────────────────────────────────────
export const fetchAllTransactions = () => req("/transactions");
export const fetchUserTransactions = (userId) => req(`/transactions/user/${userId}`);
export const createTransaction = (data) =>
  req("/transactions", { method: "POST", body: JSON.stringify(data) });

// ─── Reviews ─────────────────────────────────────────────────────────────────
export const fetchAllReviews = () => req("/reviews");
export const fetchUserReviews = (userId) => req(`/reviews/user/${userId}`);
export const fetchServiceReviews = (serviceId) => req(`/reviews/service/${serviceId}`);
export const createReview = (data) =>
  req("/reviews", { method: "POST", body: JSON.stringify(data) });

// ─── Notifications ───────────────────────────────────────────────────────────
export const fetchNotifications = (userId) => req(`/notifications/user/${userId}`);
export const fetchUnreadCount = (userId) => req(`/notifications/unread-count/${userId}`);
export const markNotificationRead = (id) =>
  req(`/notifications/${id}/read`, { method: "PUT" });
export const markAllNotificationsRead = (userId) =>
  req(`/notifications/read-all/${userId}`, { method: "PUT" });

// ─── Disputes ────────────────────────────────────────────────────────────────
export const fetchDisputes = () => req("/disputes");
export const createDispute = (data) =>
  req("/disputes", { method: "POST", body: JSON.stringify(data) });
export const resolveDispute = (id, data) =>
  req(`/disputes/${id}/resolve`, { method: "PUT", body: JSON.stringify(data) });
export const dismissDispute = (id, data) =>
  req(`/disputes/${id}/dismiss`, { method: "PUT", body: JSON.stringify(data) });

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export const fetchLeaderboard = (period = "all", category = "all") =>
  req(`/leaderboard?period=${period}&category=${category}`);

// ─── Referral ────────────────────────────────────────────────────────────────
export const validateReferral = (code) =>
  req("/referral/validate", { method: "POST", body: JSON.stringify({ code }) });

// ─── AICTE ───────────────────────────────────────────────────────────────────
export const fetchAllAicte = () => req("/aicte");
export const fetchUserAicte = (userId) => req(`/aicte/user/${userId}`);
export const createAicte = (data) =>
  req("/aicte", { method: "POST", body: JSON.stringify(data) });
export const verifyAicte = (id, txHash, blockNumber, pts, credits) =>
  req(`/aicte/${id}/verify`, { method: "POST", body: JSON.stringify({ txHash, blockNumber, pts, credits }) });
export const rejectAicte = (id) =>
  req(`/aicte/${id}/reject`, { method: "POST" });

export const fetchRecommendations = () =>
  req("/recommendations");

export const fetchMLRecommendations = (skill) =>
  req(`/ml-recommend?skill=${encodeURIComponent(skill)}`);

export const fetchMLDashboard = () =>
  req("/ml-dashboard");

export const fetchMLHealth = () =>
  req("/ml-health");

export const aiVerifyAicte = (id) =>
  req(`/aicte/${id}/ai-verify`, { method: "POST" });

export const fetchUserProfile = (userId) =>
  req(`/users/${userId}/profile`);

export const submitReview = (data) =>
  req("/reviews", { method: "POST", body: JSON.stringify(data) });

export const sendAiChatMessage = (history, message) =>
  req("/ai-chat", { method: "POST", body: JSON.stringify({ history, message }) });

// ─── Chats ───────────────────────────────────────────────────────────────────
export const fetchUserChats = (userId) => req(`/chats/user/${userId}`);
export const createChat = (participants) =>
  req("/chats", { method: "POST", body: JSON.stringify({ participants }) });
export const sendMessage = (chatId, senderId, text) =>
  req(`/chats/${chatId}/message`, { method: "POST", body: JSON.stringify({ senderId, text }) });
export const markChatRead = (chatId, userId) =>
  req(`/chats/${chatId}/read`, { method: "POST", body: JSON.stringify({ userId }) });

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
export const fetchAdminStats = (prefix) => req(`/${prefix}/stats`);
export const adminUpdateRestriction = (prefix, userId, data) =>
  req(`/${prefix}/users/${userId}/restriction`, { method: "PUT", body: JSON.stringify(data) });
export const adminUpdateLevel = (prefix, userId, data) =>
  req(`/${prefix}/users/${userId}/level`, { method: "PUT", body: JSON.stringify(data) });
export const createInstitutionAdmin = (data) =>
  req(`/website-admin/admins`, { method: "POST", body: JSON.stringify(data) });
export const fetchInstitutionAdmins = () => req(`/website-admin/admins`);
export const fetchFraudQueue = (prefix) => req(`/${prefix}/fraud-queue`);
export const resolveFraudItem = (prefix, id, action, note) =>
  req(`/${prefix}/fraud-review/${id}/action`, { method: "POST", body: JSON.stringify({ action, note }) });

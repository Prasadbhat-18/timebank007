# TimeBank — Skill Exchange Platform

TimeBank is a peer-to-peer skill exchange platform with real-time Polygon Amoy testnet blockchain verification and AICTE integration.

---

## 🛠️ Deployment Instructions

This app consists of a **Vite React Frontend** and an **Express.js Backend**. They can be deployed separately or as a monorepo.

### 1. Backend Deployment (Render, Railway, or Heroku)
Deploy the root repository to your host and configure the following parameters:
- **Build Command**: `npm install`
- **Start Command**: `npm run server`
- **Environment Variables**:
  - `MONGODB_URI`: Your MongoDB Atlas URI.
  - `PORT`: `5000` (or leave empty if the host injects it automatically).

### 2. Frontend Deployment (Netlify or Vercel)
Deploy the root repository to Netlify / Vercel:
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: The URL of your deployed Express backend (e.g. `https://timebank-api.onrender.com`). Do not append a trailing slash.

*Note: The frontend includes a `public/_redirects` file to handle React Router client-side routing on Netlify.*

---

## 💻 Local Development

1. Create a `.env` file at the root (refer to `.env.example`):
   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   PORT=5000
   ```
2. Start the backend server:
   ```bash
   npm run server
   ```
3. Start the frontend dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173/](http://localhost:5173/) in your browser.

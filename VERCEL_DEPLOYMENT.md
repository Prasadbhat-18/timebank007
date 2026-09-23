# Vercel Deployment & Serverless Guide for TimeBank

This document provides step-by-step instructions for deploying TimeBank to **Vercel** as a high-performance, token-unlimited alternative to Netlify.

---

## Why Vercel?

| Feature | Netlify (Free Tier) | Vercel (Hobby Free Tier) |
| :--- | :--- | :--- |
| **Monthly Build Minutes** | **300 minutes** (quickly exhausted) | **6,000 minutes** (20× more!) |
| **Serverless Function Invocations** | 125,000 / month | 1,000,000 / month |
| **Bandwidth** | 100 GB / month | 100 GB / month |
| **Fast Build Times** | ~1-2 min cloud overhead | Sub-minute builds |
| **Zero Token Lockout** | High risk of lockout after multiple commits | Extremely rare to hit quotas |

---

## Architecture Overview

```
                          ┌────────────────────────────┐
                          │     Vercel Global Edge     │
                          └─────────────┬──────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
            Static Client Routes (/ , /*)          Backend API (/api/*)
                    │                                       │
                    ▼                                       ▼
           ┌─────────────────┐                     ┌─────────────────┐
           │  Vite React SPA │                     │ Serverless Node │
           │   (dist/ folder)│                     │  (api/index.js) │
           └─────────────────┘                     └────────┬────────┘
                                                            │
                                           ┌────────────────┴────────────────┐
                                           │  Express Router + Atlas Mongoose│
                                           │  - Connection pooling & caching │
                                           │  - Gmail SMTP & Push dispatch   │
                                           │  - Web3 Polygon Amoy relayer    │
                                           │  - AICTE verification & PDFs    │
                                           └─────────────────────────────────┘
```

---

## How to Deploy on Vercel (3 Quick Steps)

### Step 1: Import GitHub Repository
1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** > **"Project"**.
3. Select the repository **`Prasadbhat-18/timebank007`** (or your active fork).
4. Select the branch to deploy (`main` or `feature/profiles-reviews-ai`).

### Step 2: Configure Environment Variables
In the **Environment Variables** section during project import, add the following keys from your `.env`:

| Key | Example / Description |
| :--- | :--- |
| `MONGODB_URI` | Your MongoDB Atlas connection string (`mongodb+srv://...`) |
| `JWT_SECRET` | Secret key used for signing authentication tokens |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Your production Vercel URL (e.g. `https://your-project.vercel.app`) |
| `EMAIL_USER` | Gmail address for OTP and approval notifications |
| `EMAIL_PASS` | Gmail 16-character App Password |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini API key for AI features |
| `RELAYER_PRIVATE_KEY` | *(Optional)* Web3 Relayer private key for Polygon Amoy |
| `FRAUD_HASH_SECRET` | Random secret string for SHA256 integrity checks |

> **Atlas Whitelist Reminder**: In [MongoDB Atlas](https://cloud.mongodb.com), ensure **Network Access** includes `0.0.0.0/0` (Allow Access from Anywhere) so Vercel's dynamic serverless IP ranges can connect.

### Step 3: Click Deploy
- Click **"Deploy"**.
- Vercel will run `npm run build` using the configuration in [`vercel.json`](file:///c:/Users/prasa/New%20folder%20(6)/vercel.json).
- Your site will be live at `https://<your-project-name>.vercel.app` with fully working frontend and `/api/*` endpoints!

---

## Health Check Verification

Once deployed, you can verify that both the Vercel function and the MongoDB database are live by visiting:
```
https://<your-project-name>.vercel.app/api/health
```

Expected JSON response:
```json
{
  "status": "ok",
  "environment": "vercel-serverless",
  "timestamp": "2026-09-23T...",
  "dbConnected": true
}
```

---

## Alternative: Zero-Build-Credit Deploy on Netlify (Local CLI)

If you must keep your existing Netlify URL without waiting for Netlify's monthly reset or paying for build minutes, run the local build and deploy directly:

```bash
# 1. Build locally on your computer (consumes 0 Netlify build minutes)
npm run build

# 2. Deploy pre-built static files and functions directly to Netlify
npx netlify deploy --prod --dir=dist --functions=netlify/functions
```
Because the build is executed on your local machine, Netlify cloud servers do not spend any build credits!

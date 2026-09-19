# Netlify Deployment Guide & Serverless Architecture for TimeBank

This document details the configuration and architecture implemented to deploy TimeBank onto Netlify, ensuring all frontend pages and backend API functions (authentication, student approvals, live emails, biometrics, blockchain, and certificates) operate seamlessly in the cloud.

---

## Architecture Summary

```
                  ┌───────────────────────────────────────────────┐
                  │              Netlify Edge Network             │
                  └───────┬───────────────────────────────┬───────┘
                          │                               │
             Static Assets / SPA Routes            API Requests (/api/*)
                          │                               │
                          ▼                               ▼
                 ┌─────────────────┐             ┌─────────────────┐
                 │  Vite React SPA │             │ Netlify Function│
                 │   (dist/ folder)│             │ (netlify/func-  │
                 │                 │             │  tions/api.js)  │
                 └─────────────────┘             └────────┬────────┘
                                                          │
                                         ┌────────────────┴────────────────┐
                                         │  Express Router + Database/API  │
                                         │  - MongoDB Atlas (cached conn)  │
                                         │  - Gmail SMTP Email Dispatch    │
                                         │  - WebPush Push Service         │
                                         │  - Polygon Amoy Relayer         │
                                         │  - Biometric & Fraud Services   │
                                         └─────────────────────────────────┘
```

---

## 1. Key Configuration Files Created & Updated

### `netlify.toml`
Defines the build pipeline, functions bundler, SPA rewrites, and security headers:
- `[build]`: Configured to execute `npm run build`, publish `dist`, and bundle functions from `netlify/functions`.
- `[functions]`: Uses `node_bundler = "esbuild"` for fast, optimized serverless bundling.
- `[[redirects]]`:
  1. Rewrites `/api/*` requests directly to `/.netlify/functions/api/:splat` (status 200).
  2. Rewrites all frontend routes `/*` to `/index.html` (status 200) for client-side React routing.
- `[[headers]]`: Injects security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) and long-lived caching for Vite hashed assets.

### `public/_redirects`
Copied automatically to `dist/_redirects` during `vite build`:
```
/api/*  /.netlify/functions/api/:splat  200
/*      /index.html                     200
```
This guarantees that even if `netlify.toml` is overridden or bypassed, Netlify's build crawler immediately preserves the API function rewrite and SPA fallback.

### `netlify/functions/api.js`
A serverless adapter powered by `serverless-http` that wraps the Express backend:
- Reuses MongoDB connections across serverless lambda cold starts using `mongoose.connection.readyState`.
- Mounts routes on both `/api` and `/` to handle any path rewrite variations.
- Gracefully initializes database seeds (`seedSkills`, `seedColleges`, `seedAdmin`) once per container lifecycle.
- Provides a dedicated health check endpoint at `/api/health`.

### `.gitignore` Safety & Preservation
Strictly tuned to prevent credential leaks while ensuring all required assets are tracked:
- **Ignored**:
  - `.env`, `.env.*` (prevents local passwords, database URIs, and private keys from leaking).
  - `.netlify/` (prevents Netlify local build state and CLI artifacts from polluting Git).
  - `dist/`, `dist-ssr/`, `node_modules/`, `*.log`.
- **Preserved & Explicitly Tracked**:
  - `!.env.example` (template with all required environment variable names).
  - `!public/models/` and `!public/models/**` (face-api AI neural network weights).
  - `!contracts/` (Solidity smart contracts and ABI artifacts).
  - `!netlify/` (serverless functions and configurations).

### `.env.example`
Created as a clean template for setting up Netlify Environment Variables.

---

## 2. Steps to Deploy on Netlify

### Step A: Push Code to GitHub / GitLab / Bitbucket
```bash
git add .
git commit -m "Configure Netlify deployment with serverless API functions and environment rules"
git push origin <your-branch>
```

### Step B: Connect Project in Netlify
1. Log in to [Netlify](https://app.netlify.com/).
2. Click **Add new site** > **Import an existing project**.
3. Select your Git provider (GitHub) and choose your TimeBank repository.
4. Netlify will auto-detect the build settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

### Step C: Add Environment Variables in Netlify
In Netlify, go to **Site configuration** > **Environment variables** > **Add a variable** (or import all from `.env.example`):

| Variable Name | Value Description | Example / Default |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas Connection String | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for signing user tokens | Random 32+ char string |
| `CLIENT_URL` | Your Netlify site domain | `https://your-site.netlify.app` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | TLS / STARTTLS | `false` |
| `SMTP_USER` | Email account for notifications | `timebank.verify@gmail.com` |
| `SMTP_PASS` | Gmail 16-character App Password | `your_16_character_app_password` |
| `SMTP_FROM` | Sender header display | `"TimeBank Verification" <timebank.verify@gmail.com>` |
| `VAPID_PUBLIC_KEY` | Public key for browser Web Push | *From `.env`* |
| `VAPID_PRIVATE_KEY`| Private key for browser Web Push | *From `.env`* |
| `POLYGON_AMOY_RPC` | Polygon Amoy testnet RPC endpoint | `https://polygon-amoy-bor-rpc.publicnode.com` |
| `RELAYER_PRIVATE_KEY` | Relayer signer private key | *From `.env`* |
| `GEMINI_API_KEY` | Google Gemini AI API key | *From `.env`* |
| `NODE_ENV` | Environment | `production` |

### Step D: Trigger Deploy
Click **Deploy site**. Netlify will run `npm run build`, bundle `netlify/functions/api.js`, and deploy the application live.
Once deployed, verify:
- `https://your-site.netlify.app/api/health` returns status `200` with `dbConnected: true`.
- Testing student registration, college admin review, and real-time emails.

# TimeBank: Comprehensive Platform Architecture, Machine Learning Techniques & Complete Feature Walkthrough

> **Document Purpose**: This master document contains an exhaustive, production-grade breakdown of the entire **TimeBank** ecosystem. It is specifically structured and formatted so you can directly translate it into a world-class PowerPoint / Keynote presentation (slide-by-slide structure, speaker notes, architectural diagrams, mathematical models, and bullet points included).

---

## Table of Contents
1. [Executive Summary & Core Value Proposition](#1-executive-summary--core-value-proposition)
2. [Slide-by-Slide Presentation Blueprint (Ready for PPT)](#2-slide-by-slide-presentation-blueprint-ready-for-ppt)
3. [Deep Dive: Machine Learning & Artificial Intelligence (All Techniques)](#3-deep-dive-machine-learning--artificial-intelligence-all-techniques)
   - 3.1 Client-Side Biometric Neural Network (`face-api.js`)
   - 3.2 Machine Learning Skill-Exchange Matcher (Random Forest Classifier)
   - 3.3 Google Gemini Multimodal Vision & OCR Credential Auditor
   - 3.4 Conversational AI Assistant & Semantic Service Recommender
   - 3.5 Multi-Layer Fraud Detection & Wash-Trade Graph Engine
4. [Platform Features & Functional Modules](#4-platform-features--functional-modules)
   - 4.1 Time Banking 1:1 Credit Economy
   - 4.2 Modern Stitch Onboarding & Registration Wizard
   - 4.3 Service Marketplace, Bookings & Escrow System
   - 4.4 AICTE Points Portal & Verifiable QR PDF Certificates
   - 4.5 5-Tier Gamification (Levels, XP & Reputation)
   - 4.6 Real-Time Sockets, Web Push & Email Verification
   - 4.7 Emergency SOS & In-Person Safety
5. [Blockchain & Web3 Architecture (Polygon Amoy Testnet)](#5-blockchain--web3-architecture-polygon-amoy-testnet)
   - 5.1 Smart Contract Specifications (`TimeCredit.sol`)
   - 5.2 Gasless Relayer Service (Meta-Transactions)
   - 5.3 Dual Wallet Paradigm (MetaMask & Inbuilt Cryptographic Keypair)
   - 5.4 Live Bor Block Streamer & Immutable Ledger
6. [System Architecture & Deployment Infrastructure](#6-system-architecture--deployment-infrastructure)
   - 6.1 Serverless Cloud Architecture (Netlify + MongoDB Atlas)
   - 6.2 Progressive Web Application (PWA) Offline Layer
   - 6.3 Security, Privacy & Zero-Knowledge Compliance

---

## 1. Executive Summary & Core Value Proposition

### What is TimeBank?
**TimeBank** is a decentralized, AI-driven, and biometric-verified peer-to-peer (P2P) skill and time exchange platform. It transforms human time and knowledge into a universal, equitable currency where:
$$\mathbf{1\text{ Hour of Skill Exchange}} = \mathbf{1\text{ Time Credit (TBC)}}$$

### The Problem It Solves
1. **Inequity in Skill Access**: Traditional education, tutoring, and freelance platforms demand fiat currency, creating socio-economic barriers for students and learners.
2. **Identity Fraud & Multi-Accounting**: Peer-to-peer and credit systems suffer from malicious actors creating multiple fake accounts to farm starter bonuses and manipulate reputation.
3. **Unverified Academic Credentials**: Students participating in extracurriculars and technical workshops struggle to have their activities recognized for academic compliance (such as AICTE activity points in India).
4. **Lack of Trust in Online Transactions**: Centralized platforms take high commissions, lack transparent escrow mechanisms, and provide zero immutable proof of completed work.

### The TimeBank Solution
- **Strict Biometric Uniqueness**: Client-side neural facial recognition (128-dimensional embedding) prevents duplicate account creation at the hardware and algorithmic level.
- **AI-Powered Accreditation**: Multimodal computer vision with Google Gemini verifies certificates, hackathon credentials, and participation documents in real time.
- **Predictive ML Matchmaking**: Scikit-Learn Random Forest model analyzes past transaction velocity, skill synergy, ratings, and response rates to maximize successful exchanges.
- **Decentralized Polygon Amoy Bor Ledger**: All minting, transfers, and escrows are recorded on the Polygon Amoy testnet with zero gas barrier for users via a backend relayer.

---

## 2. Slide-by-Slide Presentation Blueprint (Ready for PPT)

This section maps directly to a high-impact, 16-slide presentation deck.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIMEBANK SLIDE DECK MAP                         │
├───────────────┬────────────────────────────────────────────────────────┤
│ Slide 01-03   │ Title, Problem Statement, & Vision                     │
│ Slide 04-06   │ System Architecture & 1:1 Time Economy                 │
│ Slide 07-09   │ Machine Learning, Biometrics, & Multimodal Vision AI   │
│ Slide 10-12   │ Platform Features, AICTE Accreditation, & Escrow       │
│ Slide 13-14   │ Web3 Polygon Blockchain & Smart Contracts              │
│ Slide 15-16   │ Security Matrix, Live Deployment, & Conclusion         │
└───────────────┴────────────────────────────────────────────────────────┘
```

---

### Slide 1: Title Slide
- **Title**: TimeBank (TBC)
- **Subtitle**: Decentralized P2P Skill Exchange with Biometric Verification, Multimodal AI Credentialing & Polygon Blockchain
- **Visual**: TimeBank Logo, polygon lattice nodes, and biometric face scan HUD graphics.
- **Presenter Info**: Academic Project Presentation / Final Technical Showcase.
- **Key Talking Point**: "TimeBank is an ecosystem where human time and knowledge are the ultimate currency, protected by neural biometrics and anchored on the blockchain."

---

### Slide 2: The Core Problem & Motivation
- **Headline**: The Friction in Peer-to-Peer Learning & Credentialing
- **Key Points**:
  - **Financial Barrier**: High costs of professional skill training and private tutoring.
  - **Credential Farming & Bot Infiltration**: Sybil attacks and duplicate accounts draining promotional rewards.
  - **Verification Bottlenecks**: Manual university administration review of student activities takes weeks and is prone to counterfeit certificates.
  - **Centralized Counterparty Risk**: Platforms taking 20-30% platform cuts while offering zero cryptographic proof of work.
- **Speaker Note**: Highlight that existing platforms like Fiverr or Upwork monetize currency rather than time equity, excluding college students from trading high-value skills.

---

### Slide 3: The TimeBank Solution & Philosophy
- **Headline**: Equal Time, Verified Trust, Decentralized Settlement
- **Key Points**:
  - **Strict Time Equality**: 1 Hour = 1 Credit, regardless of whether you teach quantum physics or basic guitar chords.
  - **AI Biometric Lock**: 1 Person = 1 Account mathematically guaranteed by 128-D facial vector embeddings.
  - **Automated AICTE Accreditation**: Multimodal vision AI automatically validates student participation proofs.
  - **Zero-Gas Blockchain Settlement**: Polygon Amoy smart contracts ensure transparency without requiring users to own crypto.
- **Visual**: Diagram showing Student A teaching Coding -> Earning 1 Credit -> Spending 1 Credit on Graphic Design from Student B.

---

### Slide 4: High-Level System Architecture
- **Headline**: Full-Stack Serverless & Web3 Architecture
- **Key Points**:
  - **Frontend**: Vite 8 React Single Page Application (SPA), Vanilla CSS with Glassmorphism, Material Symbols Outlined, PWA capabilities.
  - **Backend Server**: Node.js + Express REST API & Socket.io Duplex WebSockets, wrapped in Netlify Serverless Lambda Functions (`api.js`).
  - **Database Layer**: MongoDB Atlas Multi-Region Cluster with connection reuse and Mongoose schemas.
  - **AI / ML Layer**: Client-side TensorFlow/`face-api.js`, Python Scikit-Learn Random Forest Matcher, and Google Gemini Multimodal SDK.
  - **Web3 Layer**: Polygon Amoy Testnet (Chain ID 80002), Solidity `TimeCredit.sol` contract, and automated Gasless Relayer.
- **Visual**: Comprehensive 4-tier architectural block diagram (Client -> Edge Serverless -> AI & ML Services -> Polygon Ledger).

---

### Slide 5: Role-Based User Architecture
- **Headline**: Four Distinct Personas with Tailored Portals
- **Key Points**:
  - **1. Student**: College-verified profile, Roll/USN tracking, AICTE activity submission portal, campus point exchange, and graduation alumni transition.
  - **2. General User**: Global peer profile, open marketplace access, email OTP + biometric onboarding.
  - **3. Institution (College) Admin**: Scoped to specific university, reviews student ID cards, approves AICTE certificates, inspects local college flags.
  - **4. Platform (Website) Admin**: Platform-wide metrics, global fraud queue audit, institution admin onboarding, blockchain contract management.
- **Visual**: 4-quadrant layout with distinct role badges and permission matrices.

---

### Slide 6: Modern Onboarding & 6-Step Registration Wizard
- **Headline**: High-Converting, Frictionless Institutional Verification
- **Key Points**:
  - **Stage 1 (Role Decision)**: 2-column Stitch-inspired selection card with real-time feature comparison accordion.
  - **Stage 2 (Academic & Profile)**: Name, institutional email, direct college entry with datalist autocomplete from recognized university directory.
  - **Stage 3 (OTP Dispatch)**: 6-digit real-time email verification code via SMTP.
  - **Stage 4 (ID Card Scan)**: Laser-scan animation, document upload with base64 client-side compression.
  - **Stage 5 (Biometric Face Capture)**: In-browser camera capture, real-time facial landmark extraction.
  - **Stage 6 (Review & Ledger Attestation)**: Verified credential review before submittal to college administration.
- **Visual**: Screenshots/wireframe of the 6-step progress bar and glowing ambient orbs.

---

### Slide 7: ML Technique #1 — Client-Side Biometric Face Embeddings
- **Headline**: Zero-Knowledge Facial Biometrics (`face-api.js`)
- **Key Points**:
  - **Model Architecture**: SSD MobileNet V1 for face bounding box detection + 68-Point Facial Landmark Predictor.
  - **Mathematical Vector**: Computes a 128-dimensional L2-normalized floating-point descriptor.
  - **Privacy by Design**: Raw webcam feeds and pictures are **never sent or stored on the server**. Only mathematical vectors are transmitted.
  - **Euclidean Vector Distance**:
    $$d(\mathbf{u}, \mathbf{v}) = \sqrt{\sum_{i=1}^{128} (u_i - v_i)^2}$$
  - **Calibrated Thresholds**:
    - $d \le 0.45$: 1:N Global Duplicate Match (Blocks fake multi-accounting).
    - $d \le 0.55$: 1:1 Login Identity Match (Ensures true account owner is signing in).
- **Visual**: 3D face mesh visualization with 68 landmark points and 128-D vector representation.

---

### Slide 8: ML Technique #2 — Predictive Skill-Exchange Matchmaker
- **Headline**: Scikit-Learn Random Forest Classifier (`ml/train_model.py`)
- **Key Points**:
  - **Problem**: Predicting whether a requested exchange between two users will be completed successfully based on historical compatibility.
  - **Algorithm**: Random Forest Classifier with Gini impurity splitting and ensemble voting.
  - **Key Features Evaluated**:
    - Skill Category & Text Similarity
    - Provider Experience Years & Average Star Rating
    - Geographical Proximity (Distance in km)
    - Schedule Availability Match Percentage
    - Historical Transaction Volume & Response Latency
    - Cancellation Rate & Completion Rate
  - **Inference & Recommendation**: Pairs with predicted success probability $> 0.75$ are surfaced to the user's dashboard as "Featured For You".
- **Visual**: Feature importance horizontal bar chart (Rating, Skill Similarity, Completion Rate).

---

### Slide 9: AI Technique #3 — Multimodal AICTE Certificate Auditor
- **Headline**: Google Gemini Vision OCR & Academic Fraud Detection
- **Key Points**:
  - **Models Utilized**: `gemini-2.5-flash`, `gemini-2.0-flash` with automatic fallback.
  - **Multimodal Ingestion**: Accepts Base64-encoded PNG, JPEG, WebP, and multi-page PDF documents.
  - **Scrutiny Criteria**:
    - Genuine title recognition ("Certificate of Participation / Merit / Completion")
    - University / Hackathon / Corporate logo & signature detection
    - Exact candidate legal name cross-verification
    - Topic relevance to technical / engineering domain
  - **Scoring Engine**:
    - $0 - 15$: Fake Document / Selfie / Meme / Screenshot $\rightarrow$ Auto-Reject.
    - $16 - 39$: Name mismatch / Non-accredited receipt $\rightarrow$ Flagged.
    - $40 - 69$: Minor discrepancies $\rightarrow$ Queued for Admin inspection.
    - $70 - 100$: Authenticated credential $\rightarrow$ Verified & Approved.
- **Visual**: Before/After image of a certificate with bounding boxes identifying student name, issuing seal, and AI verification badge.

---

### Slide 10: AI Technique #4 — Platform Chatbot & Semantic Recommender
- **Headline**: Dual-Layer Intelligent Support & Discovery
- **Key Points**:
  - **Conversational Assistant**: Gemini-powered contextual chatbot initialized with TimeBank's system knowledgebase.
  - **Instant Fallback Engine**: Deterministic regex and keyword matcher responds even during external network outages.
  - **Semantic Recommendation Engine**: Takes user bio, learning interests, and academic level to match available service listings semantically.
  - **Zero Cold-Start Friction**: New users with blank profiles are provided curated starter opportunities.
- **Visual**: Screenshot of floating AI Assistant widget answering credit and face-scan questions.

---

### Slide 11: Multi-Layer Fraud Prevention & Security
- **Headline**: Defense-in-Depth Against Malicious Exploits
- **Key Points**:
  - **Hard Signals (Immediate Block)**:
    - Duplicate Email Address
    - HMAC-SHA256 Phone Number Match
    - HMAC-SHA256 College ID / USN Match
    - 128-D Biometric Face Match ($d \le 0.45$)
    - Self-Transactions (Sender == Receiver)
  - **Soft Signals (Admin Fraud Queue Inspection)**:
    - Device Fingerprint Reuse via FingerprintJS visitor IDs
    - IP Registration Bursts ($> 10$ registrations/24h)
    - Pair Velocity ($> 3$ transactions between same pair/hour)
    - Circular Wash-Trading (A pays B, then B pays A within 24h)
- **Visual**: Fraud evaluation pipeline diagram showing Hard Gates vs Soft Queue routing.

---

### Slide 12: TimeBank Marketplace & Escrow Lifecycle
- **Headline**: Trustless Booking, Escrow Holds & Auto-Finalization
- **Key Points**:
  - **Listing Creation**: Multi-image preview, category tagging, level-gated credit duration.
  - **Booking Initiation**: Credits are automatically deducted from requester and locked in platform escrow.
  - **Session Execution**: Peer-to-peer online or offline meeting.
  - **Mutual Settlement**: Both parties confirm completion and submit mutual 5-star ratings with qualitative feedback.
  - **Dispute & Auto-Release**: If no dispute is raised, escrow auto-finalizes after 72 hours, releasing credits to the provider.
- **Visual**: State machine flowchart (Requested $\rightarrow$ Escrow Locked $\rightarrow$ Session Completed $\rightarrow$ Credits Released $\rightarrow$ Reviewed).

---

### Slide 13: Web3 Blockchain & Smart Contract Layer
- **Headline**: `TimeCredit.sol` on Polygon Amoy Testnet (Chain ID 80002)
- **Key Points**:
  - **Token Standard**: ERC-20 compliant (`TBC`), 18 decimals, 10,000 initial liquidity reserve.
  - **On-Chain Escrow Struct**: Stores `client`, `provider`, `amount`, `active`, `completed`, `refunded`.
  - **Gasless Relayer**: Platform signs transactions using dedicated relayer key so students never need to acquire POL cryptocurrency.
  - **Instant Gas Dispenser**: 1-click built-in testnet faucet dispensing 0.05 POL (max 5 claims / 0.25 POL per day).
  - **Dual Wallet Flexibility**: Native MetaMask Web3 browser extension OR automated local encrypted keypair (`tb_key_`).
- **Visual**: Solidity code snippet showing `EscrowCreated` and `EscrowReleased` events alongside Polygonscan block links.

---

### Slide 14: AICTE Accreditation & Verifiable QR Certificates
- **Headline**: Institutional Bridge for Technical Education Points
- **Key Points**:
  - **AICTE Activity Portal**: Aligned with official All India Council for Technical Education activity categories (Hackathons, Rural Development, Sports, Cultural).
  - **Dual Rewards**: Successful verification awards official academic points **plus** bonus Time Credits.
  - **Cryptographic Certificate Generation**:
    - Deterministic SHA-256 integrity hash over student ID, points, and hours.
    - Embedded dynamic QR code pointing to public verification endpoint: `/#verify/:certId`.
    - Generated as high-resolution PDF with official college branding.
- **Visual**: Sample generated PDF certificate with embedded QR code and verification badge.

---

### Slide 15: Gamification, Safety & Progressive Web App (PWA)
- **Headline**: Engagement, In-Person Security & Mobile Readiness
- **Key Points**:
  - **5-Tier Progression**: Level 1 (Novice) $\rightarrow$ Level 2 (Contributor) $\rightarrow$ Level 3 (Expert) $\rightarrow$ Level 4 (Master) $\rightarrow$ Level 5 (Legend).
  - **XP Formula**: Earned through completed sessions, 5-star feedback, and academic achievements.
  - **Emergency SOS Dispatcher**: 1-click emergency broadcaster with direct telephone link (`tel:`) for offline session security.
  - **Progressive Web App**: Complete `manifest.json` and Service Worker for mobile installation on Android / iOS with offline caching.
  - **WebPush Notifications**: Push alerts for session bookings, approvals, and reminders via VAPID keys.
- **Visual**: UI badges showing Level 5 Legend crown, SOS emergency red button, and mobile installation banner.

---

### Slide 16: Summary, Production Metrics & Future Roadmap
- **Headline**: The Future of Decentralized Human Capital
- **Key Points**:
  - **Completed Milestones**:
    - Full biometric anti-fraud engine tested with 0% duplicate bypass.
    - Multimodal Gemini AI OCR deployed on Netlify Serverless.
    - Polygon Amoy smart contract live with gasless meta-transactions.
    - Stitch-inspired dynamic design system with custom university inputs.
  - **Future Roadmap**:
    - Zero-Knowledge zk-SNARK face proofs to avoid transmitting descriptors.
    - Cross-campus inter-university federation.
    - AI-generated personalized skill development curricula.
- **Visual**: Project metrics summary table (Build Time $< 800\text{ms}$, 0 compilation warnings, live deployed link).

---

## 3. Deep Dive: Machine Learning & Artificial Intelligence (All Techniques)

### 3.1 Client-Side Biometric Neural Network (`face-api.js`)

TimeBank implements zero-knowledge client-side facial analysis using TensorFlow.js and `face-api.js`.

```
Webcam Feed ──► SSD MobileNet V1 ──► 68 Landmark Extractor ──► 128-D Vector Embeddings
                                                                         │
                                                                   Client / Server
                                                                         ▼
                                      Euclidean Distance Comparison: d(u, v) <= 0.45
```

#### Neural Network Architecture
1. **Face Detection Stage**:
   - Uses **Single Shot MultiBox Detector (SSD)** with a **MobileNet V1** backbone.
   - Operates on 160x160 RGB tensors.
   - Detects face presence with confidence scoring $\ge 0.5$.
2. **Landmark Extraction Stage**:
   - 68 distinct 3D facial landmarks are computed across jawline, eyebrows, eye contours, nose bridge, and lip contours.
   - Performs affine transformation to align the face horizontally regardless of head tilt.
3. **Face Descriptor Stage**:
   - A convolutional feature extraction network outputs a **128-dimensional floating point vector** $\mathbf{v} \in \mathbb{R}^{128}$.
   - The vector is L2-normalized:
     $$\|\mathbf{v}\|_2 = \sqrt{\sum_{i=1}^{128} v_i^2} = 1.0$$

#### Distance Metrics & Decision Rules
- **Euclidean Distance Formula**:
  $$D_{\text{Euclid}}(\mathbf{a}, \mathbf{b}) = \sqrt{\sum_{i=1}^{128} (a_i - b_i)^2}$$
- **Cosine Similarity Formula**:
  $$S_{\text{Cosine}}(\mathbf{a}, \mathbf{b}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \|\mathbf{b}\|} = \sum_{i=1}^{128} a_i b_i \quad (\text{since } \|\mathbf{a}\| = \|\mathbf{b}\| = 1)$$
- **Threshold Calibration in Production**:
  - **1:N Registration Duplicate Check**: $\text{Distance} \le 0.45$. If another user in the database matches within $0.45$, registration is blocked with `DUPLICATE_FACE`.
  - **1:1 Login Authentication Check**: $\text{Distance} \le 0.55$. Ensures the person sitting in front of the camera is indeed the registered account owner.

---

### 3.2 Machine Learning Skill-Exchange Matcher (Random Forest Classifier)

Located in `ml/train_model.py` and `ml/predict.py`.

#### Problem Formulation
Given a user $U_1$ seeking a skill and user $U_2$ offering a skill, predict the binary outcome $Y \in \{0, 1\}$ (where $1$ denotes a completed, highly-rated exchange and $0$ denotes cancellation or dispute).

#### Feature Vector Formulation
For each prospective pair, a 10-dimensional feature vector $\mathbf{x}$ is computed:
1. `skill_similarity` ($[0.0, 1.0]$): Text cosine similarity between requested and offered descriptions.
2. `experience_years` ($\mathbb{R}^+$): Self-reported and peer-validated years of practice.
3. `user_rating` ($[1.0, 5.0]$): Cumulative weighted Bayesian average rating of provider.
4. `distance_km` ($\mathbb{R}^+$): Haversine geographical distance between campus coordinates.
5. `availability_match` ($[0.0, 1.0]$): Overlap coefficient between user availability matrices.
6. `previous_transactions` ($\mathbb{N}$): Total transactions completed by provider.
7. `successful_transactions` ($\mathbb{N}$): Positive settlements.
8. `response_rate` ($[0.0, 1.0]$): Fraction of booking requests accepted within 24 hours.
9. `completion_rate` ($[0.0, 1.0]$): $\frac{\text{Completed}}{\text{Accepted}}$.
10. `cancellation_rate` ($[0.0, 1.0]$): $\frac{\text{Cancelled}}{\text{Total Bookings}}$.

#### Training Pipeline & Evaluation
- **Algorithm**: `RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)`
- **Cross-Validation**: 5-Fold Stratified K-Fold.
- **Target Metrics**:
  - Accuracy: $> 88\%$
  - ROC-AUC: $> 0.92$
  - F1-Score: $> 0.86$

---

### 3.3 Google Gemini Multimodal Vision & OCR Credential Auditor

Implemented in `server/ai.js` (`verifyAicteCertificate`).

```
Certificate Image / PDF ──► Gemini Multimodal API ──► Structured JSON Schema ──► Auto-Verdict
(Base64 PNG/JPG/PDF)        (gemini-2.5-flash)         - isCertificate (bool)     - GENUINE (>=70)
                                                       - score (0-100)            - SUSPICIOUS (40-69)
                                                       - recipientName            - FLAGGED (<40)
                                                       - issuingAuthority
```

#### Multimodal Prompting Pipeline
The server transmits raw file Base64 data with MIME type directly to `gemini-2.5-flash` along with a prompt enforcing strict academic verification:
1. **Candidate Match**: Checks if extracted name matches user profile.
2. **Authority Verification**: Scans for accredited signatures, institutional stamps, and verification QR/hashes.
3. **Meme / Junk Image Rejection**: Instant rejection ($0 - 15$ score) for selfies, random photos, code screenshots, or unrelated invoices.

---

### 3.4 Conversational AI Assistant & Semantic Service Recommender

- **Engine**: Google Gemini API (`gemini-2.0-flash`) with prompt-engineered system instructions containing the complete TimeBank knowledgebase.
- **Fail-Safe Offline Mode**: If external AI endpoints encounter rate-limiting or network issues, `getFallbackWebsiteAnswer` triggers a regex semantic parser to instantly answer questions about credits, biometrics, bookings, AICTE points, and emergency SOS.
- **Semantic Recommendation Engine**: Computes high-level profile matches to suggest the top 3 complementary peer services based on student bios.

---

### 3.5 Multi-Layer Fraud Detection & Wash-Trade Graph Engine

Implemented in `server/fraudService.js`.

```
Registration Input
        │
        ├──► Hard Signals (Risk +100): Email, Phone HMAC, USN HMAC, Face Distance <= 0.45 ──► IMMEDIATE BLOCK
        │
        └──► Soft Signals (Risk +20 to +40): FingerprintJS Reuse, IP Burst (>=10/day) ──────► ADMIN FRAUD QUEUE
```

#### Wash-Trading Graph Protection
- **Pair Velocity Detection**: If user $A$ and user $B$ trade more than 3 times in 1 hour, transactions are flagged.
- **Circular Flow Detection**: If user $B$ sends credits back to user $A$ within 24 hours of receiving credits, the transaction is marked as a potential wash-trade ring for admin audit.

---

## 4. Platform Features & Functional Modules

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIMEBANK CORE MODULES                           │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 1:1 Credit Economy │ Stitch Wizard      │ Service Marketplace & Escrow │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ AICTE Points & QR  │ 5-Tier Leveling    │ Socket.io Chat & Push Alerts │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

### 4.1 Time Banking 1:1 Credit Economy
- **Starter Allocation**: Every verified user receives **10 starter credits**.
- **Equivalence**: 1 hour of active service equals 1 Time Credit.
- **Level-Gated Pricing**:
  - Levels 1 & 2: Services capped at reasonable limits ($1 - 3$ credits) to prevent predatory pricing.
  - Level 3+ (Skilled / Expert): Unlocks custom desired credit rates for specialized technical consultations.

### 4.2 Modern Stitch Onboarding & Registration Wizard
- **Interactive Role Choice**: Switch between `Student` and `General User` profiles with animated ambient glowing orbs.
- **Custom University Entry**: Students can freely type their college name or choose from partner institutions via an interactive `<datalist>`.
- **6-Step Progress Pipeline**: Profile $\rightarrow$ OTP $\rightarrow$ ID Card $\rightarrow$ Biometric Face Scan $\rightarrow$ Review $\rightarrow$ Approval Status.

### 4.3 Service Marketplace, Bookings & Escrow System
- **Rich Media Listings**: Supports multiple service images via local upload or external image URLs.
- **Escrow Lock**: When a booking is requested, credits are held safely in escrow.
- **Mutual Review**: Requester and provider rate each other (1 to 5 stars) with written commentary upon session conclusion.
- **Auto-Confirm**: Bookings auto-finalize and release credits after 72 hours if no dispute is filed.

### 4.4 AICTE Points Portal & Verifiable QR PDF Certificates
- **Academic Point Categories**:
  - Technical Workshops & Hackathons (10-20 pts)
  - Sports & Cultural Achievements (10-15 pts)
  - Community Service & Blood Donation (10-20 pts)
  - Innovation & Patent Submissions (20-30 pts)
- **SHA-256 Verifiable PDF Certificates**:
  - Generated using `pdfkit`.
  - Embedded QR code links to `/#verify/:certId`.
  - Deterministic integrity hash ensures certificates cannot be forged or tampered with.

### 4.5 5-Tier Gamification (Levels, XP & Reputation)
- **Levels**:
  - Level 1: **Novice** (0 XP)
  - Level 2: **Contributor** (100 XP)
  - Level 3: **Skilled** (300 XP)
  - Level 4: **Master** (600 XP)
  - Level 5: **Legend** (1,000 XP)
- **Reputation System**: Displays verified review count and Bayesian star rating average.

### 4.6 Real-Time Sockets, Web Push & Email Verification
- **Socket.io**: Instant messaging between requester and provider, live blockchain block stream updates.
- **WebPush (VAPID)**: Native browser push notifications even when the tab is closed.
- **SMTP Nodemailer**: Dispatches real-time 6-digit verification codes and password recovery links.

### 4.7 Emergency SOS & In-Person Safety
- **Emergency Contact Directory**: Users can store trusted emergency contacts (name, phone, relation).
- **1-Click SOS Broadcast**: Red emergency button triggers instant notifications and provides direct telephone dialer (`tel:`) shortcuts.

---

## 5. Blockchain & Web3 Architecture (Polygon Amoy Testnet)

```
                       ┌───────────────────────────────────────────────┐
                       │          Polygon Amoy (Chain ID 80002)         │
                       └───────────────────────┬───────────────────────┘
                                               │
                                 ┌─────────────┴─────────────┐
                                 │                           │
                                 ▼                           ▼
                        ┌──────────────────┐       ┌──────────────────┐
                        │ TimeCredit (TBC) │       │ On-Chain Escrow  │
                        │ ERC-20 Contract  │       │ Structs & Events │
                        └────────┬─────────┘       └────────┬─────────┘
                                 │                           │
                                 └─────────────┬─────────────┘
                                               │
                                               ▼
                                   ┌──────────────────────┐
                                   │ Gasless Meta-Relayer │
                                   │ (Ethers.js Signer)   │
                                   └──────────────────────┘
```

### 5.1 Smart Contract Specifications (`TimeCredit.sol`)
- **Network**: Polygon Amoy Testnet (`Chain ID: 80002`).
- **Contract Name**: `TimeCredit` (`TBC`).
- **Standard**: ERC-20 with integrated escrow mappings.
- **Escrow Functions**:
  - `createEscrow(bytes32 escrowId, address provider, uint256 amount)`
  - `releaseEscrow(bytes32 escrowId)`
  - `refundEscrow(bytes32 escrowId)`

### 5.2 Gasless Relayer Service (Meta-Transactions)
- Implemented in `server/relayerService.js`.
- Students and users execute peer skill transactions **without needing native POL tokens**.
- The backend relayer signs and broadcasts transactions to the Polygon Bor RPC endpoint.

### 5.3 Dual Wallet Paradigm
1. **MetaMask / Web3 Browser Extension**: Connects directly via `window.ethereum` for users with crypto wallets.
2. **Inbuilt Cryptographic Keypair**: Automatically creates a local private key stored in `localStorage` (`tb_key_<id>`) for non-crypto users, ensuring 100% Web3 onboarding with zero friction.

### 5.4 Live Bor Block Streamer
- Real-time ticker and header widget displays latest block height, tx hash proofs, and Polygonscan links.

---

## 6. System Architecture & Deployment Infrastructure

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NETLIFY SERVERLESS CLOUD                        │
├──────────────────────────────┬─────────────────────────────────────────┤
│ Vite React SPA (dist/)       │ Netlify Function (netlify/functions/api)│
│ Static Assets & PWA Worker   │ Serverless Express Backend Adapter      │
└──────────────┬───────────────┴────────────────────┬────────────────────┘
               │                                    │
               ▼                                    ▼
       User Web Browser                     MongoDB Atlas Cluster
   (Webcam Biometrics, PWA)            (Cached Mongoose Connections)
```

### 6.1 Serverless Cloud Architecture (Netlify + MongoDB Atlas)
- **Edge Deployment**: Static React assets hosted on Netlify Edge CDN.
- **Serverless API**: Handled by `serverless-http` in `netlify/functions/api.js`.
- **Database Connection Caching**: Reuses `mongoose.connection.readyState` across cold starts to eliminate latency.
- **Production Health Endpoint**: `/api/health` continuously monitored.

### 6.2 Progressive Web Application (PWA) Offline Layer
- Configured via `public/manifest.json` and service worker.
- Installable on Android, iOS, Windows, and macOS.
- Caches UI assets for offline readiness.

### 6.3 Security, Privacy & Zero-Knowledge Compliance
- **HMAC Hashing**: Phone numbers and College IDs are hashed with `SHA-256` and secret salt before database storage.
- **Zero Raw Photos**: Facial images are processed entirely in memory in the client browser; only 128-D mathematical vectors are persisted.
- **JWT Authorization**: All private routes protected by Bearer token authentication.

---

## 7. Presentation Quick Reference (Q&A Cheatsheet)

| Question | Short Answer for Presentation / Viva |
|---|---|
| **What is the fundamental currency rate?** | 1 Hour of skill exchange = 1 Time Credit ($1\text{ TBC}$). |
| **How does biometric anti-fraud work?** | In-browser SSD MobileNet extracts a 128-D vector descriptor. Euclidean distance $\le 0.45$ blocks duplicate accounts across the network. |
| **What machine learning model matches skills?** | A Scikit-Learn Random Forest Classifier trained on 10 behavioral and compatibility features. |
| **How does AICTE certificate verification work?** | Google Gemini 2.5 Multimodal Vision inspects uploaded documents for genuine seals, student names, and topics, rejecting memes/screenshots with scores $< 15$. |
| **What blockchain does it use?** | Polygon Amoy Testnet (Chain ID 80002) with an automated gasless relayer so users pay zero transaction fees. |
| **Where is the platform deployed?** | Frontend and serverless backend are live on Netlify at `https://timebank017.netlify.app`. |

---
*Created for TimeBank Project Documentation & PowerPoint Presentation Preparation.*

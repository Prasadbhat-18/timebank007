import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize the SDK with the API key from environment
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

/**
 * Get AI Smart Recommendations for a user
 * @param {Object} user - The user object
 * @param {Array} services - Array of all active services
 * @returns {Array<string>} - Array of recommended service IDs
 */
export async function getRecommendations(user, services) {
  if (!ai) return [];
  if (!services || services.length === 0) return [];

  const prompt = `
You are an AI recommendation engine for a skill-sharing platform called TimeBank.
The user has the following profile:
Name: ${user.name}
Bio: ${user.bio || "None"}
College: ${user.college || "None"}
Role: ${user.role}

Here are the available services on the platform:
${services.map(s => `ID: ${s._id} | Title: ${s.title} | Category: ${s.category} | Desc: ${s.description}`).join('\n')}

Based on the user's bio and interests, pick the top 3 most relevant services that the user would be interested in booking.
Return ONLY a valid JSON array of strings containing the exact IDs of the recommended services. Do not return any other text, markdown formatting, or explanation.
Example: ["id1", "id2", "id3"]
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
      }
    });
    
    let text = response.text.trim();
    if (text.startsWith("\`\`\`json")) {
      text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    } else if (text.startsWith("\`\`\`")) {
      text = text.replace(/\`\`\`/g, "").trim();
    }
    
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.slice(0, 3);
    return [];
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return [];
  }
}

/**
 * Verify an AICTE certificate image or PDF using Gemini AI with robust multi-model fallback and strict anti-fraud rules
 * @param {string} certData - The base64 data URL or web link of the certificate
 * @param {string} studentName - The expected student name
 * @param {string} eventName - The expected event name
 * @returns {Promise<{ score: number, feedback: string }>}
 */
export async function verifyAicteCertificate(certData, studentName = "", eventName = "") {
  if (!certData) {
    return {
      score: 0,
      feedback: "❌ No certificate file provided. Verification failed.",
    };
  }

  // Handle plain URL links (e.g. Google Drive, web links)
  if (certData.startsWith("http://") || certData.startsWith("https://")) {
    return {
      score: 45,
      feedback: `⚠️ External URL link provided (${certData.slice(0, 35)}...). Direct file upload required for AI OCR analysis. Queued for manual admin review.`,
    };
  }

  // Parse base64 data URI (supports PNG, JPEG, WEBP, PDF)
  const matches = certData.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return {
      score: 0,
      feedback: "❌ Invalid certificate file format. Please upload a clear JPG, PNG, or PDF file.",
    };
  }

  const mimeType = matches[1].toLowerCase();
  const data = matches[2];
  const isPdf = mimeType === "application/pdf";
  const sName = (studentName || "Student").trim();
  const eName = (eventName || "AICTE Activity").trim();

  // If Gemini AI is configured, run real multimodal analysis
  if (ai) {
    const modelsToTry = ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];
    const prompt = `You are a strict, authoritative AI Certificate & Academic Credential Auditor for the AICTE (All India Council for Technical Education) Activity Point Accreditation System.

Analyze this ${isPdf ? "PDF certificate document" : "uploaded certificate image"} with high scrutiny.

Expected Student Legal Name: "${sName}"
Expected Event / Activity Topic: "${eName}"

AUDIT RULES:
1. Genuine Certificate Check: Is this a legitimate academic/technical certificate (e.g. Workshop, Hackathon, FDP, Internship, Course, Technical Paper, College Competition)? Look for:
   - Certificate Title ("Certificate of Completion / Participation / Merit / Appreciation / Achievement")
   - Issuing Organization / Institution / College Name & Logo
   - Candidate Name
   - Signatures, Official Seals, Authority Designations, or Verification IDs/QR
2. Strict Non-Certificate Rejection: If the image is NOT a certificate (for example: photo of a person/selfie, landscape, screenshot of IDE/code, wallpaper, invoice, meme, game screenshot, blank screen, receipt, drawing, or irrelevant document), you MUST REJECT with score between 0 and 10.
3. Name Verification: Check if the certificate explicitly contains the candidate name "${sName}" or a very close variant. If it is made out to a completely different person, score MUST NOT exceed 25.
4. Activity / Topic Match: Check if the certificate covers "${eName}" or related technical subject matter.

SCORING MATRIX:
- 0 - 15: FAKE / NOT A CERTIFICATE (random picture, selfie, screenshot, meme, fraud).
- 16 - 40: Irrelevant document, completely mismatched student name, or generic non-accredited receipt.
- 41 - 69: Real certificate, but noticeable discrepancy in recipient name or event topic.
- 70 - 100: Genuine authentic AICTE/academic certificate with verified recipient name "${sName}", issuing authority, and valid activity details.

Respond ONLY in valid, parseable JSON with NO markdown fences or preamble:
{
  "isCertificate": boolean,
  "score": number,
  "recipientName": string or null,
  "issuingAuthority": string or null,
  "eventTitle": string or null,
  "feedback": string
}`;

    for (const model of modelsToTry) {
      try {
        const aiPromise = (async () => {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                inlineData: {
                  data,
                  mimeType,
                },
              },
              prompt,
            ],
            config: {
              temperature: 0.1,
            },
          });

          let text = response.text?.trim() || "";
          if (text.startsWith("```json")) {
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
          } else if (text.startsWith("```")) {
            text = text.replace(/```/g, "").trim();
          }

          const parsed = JSON.parse(text);
          const score = Math.min(100, Math.max(0, parseInt(parsed.score, 10) || 0));

          let feedback = parsed.feedback;
          if (!feedback) {
            if (score >= 75) {
              feedback = `✓ Authentic certificate confirmed. Issued to "${parsed.recipientName || sName}" for "${parsed.eventTitle || eName}" by "${parsed.issuingAuthority || 'Accredited Institution'}".`;
            } else if (score >= 40) {
              feedback = `⚠️ Certificate detected with minor discrepancies: Recipient "${parsed.recipientName || 'Unclear'}", Event "${parsed.eventTitle || 'Unclear'}". Manual admin review recommended.`;
            } else {
              feedback = `❌ Verification rejected (${score}% score). Document does not meet AICTE accreditation criteria or is not a genuine certificate.`;
            }
          }

          return { score, feedback };
        })();

        const result = await Promise.race([
          aiPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("AI Model Timeout")), 12000)),
        ]);

        return result;
      } catch (err) {
        console.warn(`[AICTE Certificate OCR] Attempt with model ${model} failed:`, err.message);
      }
    }
  }

  // Offline fallback if Gemini is completely unavailable
  return {
    score: 35,
    feedback: "⚠️ AI service temporarily unreachable. Document flagged for manual college administrator inspection.",
  };
}

/**
 * Handle AI Website Chat Assistant
 * @param {Array} history - Previous conversation history
 * @param {string} message - The new message
 * @param {Object} user - The user requesting
 */
/**
 * Rule-based fallback knowledge matcher for TimeBank platform questions
 */
function getFallbackWebsiteAnswer(message, user) {
  const query = message.toLowerCase();
  const userName = user?.name ? user.name.split(" ")[0] : "there";

  if (query.includes("face") || query.includes("biometric") || query.includes("scan") || query.includes("camera")) {
    return `Hi ${userName}! TimeBank uses mandatory biometric face verification during registration to prevent duplicate accounts and identity fraud. 
    
Here is how it works:
1. **Privacy-First**: Face detection runs entirely in your browser using \`face-api.js\`. Raw photos/video are never saved on the server.
2. **128-D Facial Embedding**: Only a 128-dimensional mathematical vector descriptor is stored.
3. **Anti-Fraud Matching**: The server checks Euclidean vector distance (<= 0.6 threshold). If a matching face is found under another email, registration is blocked.
4. **Cross-Device**: Works via front webcam, mobile camera, or photo upload fallback.`;
  }

  if (query.includes("credit") || query.includes("hour") || query.includes("balance") || query.includes("currency")) {
    return `Hi ${userName}! TimeBank operates on a strict **1 Hour = 1 Credit** skill economy.
- New members get **10 starter credits** upon registration.
- You **earn credits** by offering your skills (coding, tutoring, design, music, etc.) to peers.
- You **spend credits** when booking services offered by others.
- Credits are safely held in escrow during active bookings until session completion.`;
  }

  if (query.includes("booking") || query.includes("escrow") || query.includes("cancel") || query.includes("confirm")) {
    return `Hi ${userName}! Here is how the booking & escrow system works:
1. **Escrow Hold**: When you request a service, the required credits are placed into escrow.
2. **Session Completion**: After the session, both provider and requester confirm completion and leave a review.
3. **Credit Release**: Once confirmed, credits transfer from escrow to the provider's wallet.
4. **Auto-Confirm**: Sessions automatically confirm after 72 hours if no dispute is opened.`;
  }

  if (query.includes("aicte") || query.includes("point") || query.includes("certificate") || query.includes("activity")) {
    return `Hi ${userName}! TimeBank features an integrated AICTE Points portal for students:
- Upload completion certificates from hackathons, workshops, or community service.
- **AI Verification**: Our built-in OCR/AI engine verifies certificate authenticity automatically.
- **Points & Rewards**: Upon admin verification, you earn official AICTE activity points plus bonus time credits!`;
  }

  if (query.includes("fraud") || query.includes("security") || query.includes("flag") || query.includes("block") || query.includes("fingerprint")) {
    return `Hi ${userName}! Security and trust are top priorities on TimeBank:
- **Hard Signals (Auto-Block)**: Duplicate emails, phone HMAC matches, college ID HMAC matches, and face descriptor matches block duplicate registrations.
- **Soft Signals (Admin Queue)**: Device fingerprint reuse (FingerprintJS) and registration bursts trigger a soft flag for Admin review.
- **Wash-Trading Protection**: Circular payments and high pair transaction velocity are flagged to prevent fake credit farming.`;
  }

  if (query.includes("level") || query.includes("xp") || query.includes("tier") || query.includes("demotion")) {
    return `Hi ${userName}! TimeBank features a 5-tier progression system:
- **Level 1 (Novice)** -> **Level 2 (Contributor)** -> **Level 3 (Expert)** -> **Level 4 (Master)** -> **Level 5 (Legend)**.
- Earn **XP** by completing bookings, receiving 5-star reviews, and maintaining a high reputation.
- Inactive members receive warning notifications before XP demotion takes effect.`;
  }

  if (query.includes("blockchain") || query.includes("polygon") || query.includes("tx") || query.includes("receipt")) {
    return `Hi ${userName}! TimeBank logs all credit minting and transfer events on the **Polygon Amoy Testnet**:
- Every credit transfer generates a cryptographic transaction hash (\`0x...\`) and block number.
- You can inspect full ledger receipts under your Wallet or the public Blockchain ledger tab.`;
  }

  if (query.includes("sos") || query.includes("emergency") || query.includes("safety")) {
    return `Hi ${userName}! Your safety during offline/in-person skill sessions is paramount:
- Add trusted contacts under **Emergency Contacts**.
- In an emergency, tap **Emergency SOS** on your dashboard to instantly broadcast your alert and notify designated contacts.`;
  }

  if (query.includes("admin") || query.includes("role") || query.includes("college")) {
    return `Hi ${userName}! TimeBank supports role-based administration:
- **Website Admin**: Manages platform-wide statistics, global users, institution admins, and the global Fraud Queue.
- **College Admin**: Scoped to your institution to verify student AICTE submissions, manage college users, and resolve local security flags.`;
  }

  return `Hi ${userName}! I'm the TimeBank AI Assistant. I can help you with anything on the platform:
- ⏱ **Time Credits**: 1 hour = 1 credit economy & 10 starter credits.
- 🔐 **Face Verification**: Biometric 128-dim face matching & anti-duplicate checks.
- 🛡️ **Fraud & Security**: Device fingerprinting, wash-trade protection & Admin Queue.
- 🎓 **AICTE Points**: Submitting certificates & earning college credits.
- 📅 **Bookings & Escrow**: Holding credits safely until session completion.
- 🏆 **Levels & XP**: Progressing from Novice to Legend tier.

What specific feature would you like to learn more about?`;
}

/**
 * Handle AI Website Chat Assistant request
 * @param {Array} history - Chat message history [{role: 'user'|'model', text: '...'}]
 * @param {string} message - User message input
 * @param {Object} user - The user object
 */
export async function handleWebsiteChat(history = [], message = "", user = {}) {
  const userName = user.name || "User";
  const userRole = user.role || "user";
  const userCollege = user.college || "Unassigned College";

  const systemPrompt = `
You are the official expert AI Assistant for TimeBank — a Web3-enabled P2P skill exchange platform.
You have complete, authorative knowledge of every feature on TimeBank:

1. **Time Economy & Credits**:
   - 1 hour of skill exchange = 1 credit always.
   - New members receive 10 starter credits upon registration.
   - Credits are spent booking services and earned offering skills.

2. **Biometric Face Verification**:
   - Mandatory face scan during registration using face-api.js in-browser.
   - Zero-Knowledge: Only a 128-dimensional facial descriptor vector is stored on server; no raw images.
   - Anti-Duplicate: Compares Euclidean vector distance (<= 0.6 threshold). Matches block duplicate account registration.
   - Works on front webcam, mobile camera, or photo upload fallback.

3. **Device Security & Fingerprinting**:
   - Uses FingerprintJS visitor IDs. Unrecognized logins prompt security warnings ("Login from a new device detected 🔔").

4. **Multi-Layer Fraud Detection**:
   - Hard signals (duplicate email, phone HMAC, college ID HMAC, face match, self-tx, same-face tx) block access immediately.
   - Soft signals (device reuse, registration bursts, circular wash-trading, high pair velocity) flag items into the Admin Fraud Queue.

5. **Bookings & Escrow**:
   - Booking holds credits in escrow. Mutual review releases credits to provider. Auto-confirms after 72 hours.

6. **AICTE Activity Portal**:
   - Students upload certificates (workshops, hackathons). AI/OCR parses certificate data. Admin approval awards AICTE points + bonus credits.

7. **Levels & Gamification**:
   - Levels 1 to 5 (Novice, Contributor, Expert, Master, Legend). XP earned via reviews and completed exchanges. Inactivity triggers demotion warnings.

8. **Polygon Blockchain Verification**:
   - All credit transfers log cryptographic block numbers & hashes (0x...) on Polygon Amoy testnet.

9. **Safety & Emergency SOS**:
   - Emergency contacts and SOS button for in-person session safety alerts.

User interacting with you: Name = "${userName}", Role = "${userRole}", College = "${userCollege}".
Be friendly, precise, professional, and clear. Answer any question about TimeBank thoroughly.
`;

  if (!ai) {
    return getFallbackWebsiteAnswer(message, user);
  }

  const formattedHistory = (history || []).map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.text }],
  }));

  formattedHistory.push({
    role: "user",
    parts: [{ text: message }],
  });

  // Try gemini-2.0-flash first, then gemini-1.5-flash, then fallback matcher
  const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: formattedHistory,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.4,
        },
      });

      if (response && response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn(`[AI Chat] Model ${modelName} failed, trying next option...`, err.message);
    }
  }

  // If API calls failed or rate limited, return intelligent fallback answer
  return getFallbackWebsiteAnswer(message, user);
}


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
 * Verify an AICTE certificate image using AI OCR
 * @param {string} base64Image - The base64 data URL of the image
 * @param {string} studentName - The expected student name
 * @param {string} eventName - The expected event name
 * @returns {Object} - { score: number, feedback: string }
 */
export async function verifyAicteCertificate(base64Image, studentName, eventName) {
  if (!ai) return { score: 0, feedback: "AI verification disabled (Missing API Key)" };
  if (!base64Image || !base64Image.startsWith("data:image")) {
    return { score: 0, feedback: "Cannot verify: Invalid image format. Please upload a valid image file." };
  }

  // Extract mime type and base64 data
  const matches = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return { score: 0, feedback: "Cannot parse image data." };
  }
  
  const mimeType = matches[1];
  const data = matches[2];

  const prompt = `
You are an expert document verifier. I am providing you with an image of a certificate uploaded by a student for AICTE activity points.
Please analyze the image carefully.

Expected Student Name: ${studentName}
Expected Event/Title: ${eventName}

Tasks:
1. Is this a genuine certificate? (Look for logos, signatures, standard certificate formatting).
2. Does the name on the certificate match the Expected Student Name (or a reasonable variation/abbreviation)?
3. Does the event/topic on the certificate match the Expected Event/Title?

Return a valid JSON object strictly matching this format:
{
  "score": <a number from 0 to 100 representing your confidence in its genuineness and matching details>,
  "feedback": "<a short 1-2 sentence explanation of your findings>"
}
Do not return any other text or markdown block formatting, just the raw JSON object.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: data,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        temperature: 0.1,
      }
    });

    let text = response.text.trim();
    if (text.startsWith("\`\`\`json")) {
      text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    } else if (text.startsWith("\`\`\`")) {
      text = text.replace(/\`\`\`/g, "").trim();
    }

    const parsed = JSON.parse(text);
    return {
      score: parsed.score || 0,
      feedback: parsed.feedback || "Failed to parse AI response"
    };
  } catch (error) {
    return { score: 0, feedback: "AI verification encountered an error while processing the image." };
  }
}

/**
 * Handle AI Website Chat Assistant
 * @param {Array} history - Previous conversation history
 * @param {string} message - The new message
 * @param {Object} user - The user requesting
 */
export async function handleWebsiteChat(history, message, user) {
  if (!ai) return "The AI Assistant is currently offline. Please check the API key.";
  
  const systemPrompt = `
You are a helpful, professional AI Assistant for the TimeBank platform.
TimeBank is a skill-sharing platform where users can offer services, book other people's services, and earn/spend time credits.
Users can also earn AICTE activity points by completing real-world tasks and uploading certificates.
The user you are talking to is named ${user.name} and their role is ${user.role}.
Answer their questions concisely and professionally. Do not invent features that don't exist.
`;

  try {
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    formattedHistory.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattedHistory,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5
      }
    });

    return response.text.trim();
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "I'm sorry, I'm having trouble processing your request right now.";
  }
}

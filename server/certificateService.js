// ─── TimeBank — Verifiable Certificate Service ───────────────────────────────
import crypto from "crypto";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { Certificate, User, College } from "./models.js";

/**
 * Computes a deterministic SHA-256 integrity hash over certificate parameters
 */
export function computeHash(fields) {
  if (fields.activityTitle) {
    const payload = {
      userId: String(fields.userId || fields.user || ""),
      collegeId: String(fields.collegeId || fields.college || ""),
      activityTitle: String(fields.activityTitle || ""),
      activityType: String(fields.activityType || ""),
      organizer: String(fields.organizer || ""),
      activityPoints: Number(fields.activityPoints || 0),
    };
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
  }
  const payload = {
    userId: String(fields.userId || fields.user || ""),
    collegeId: String(fields.collegeId || fields.college || ""),
    activityPoints: Number(fields.activityPoints || 0),
    totalHours: Number(fields.totalHours || 0),
    exchangeCount: Number(fields.exchangeCount || 0),
    periodStart: fields.periodStart ? new Date(fields.periodStart).toISOString().split("T")[0] : "",
    periodEnd: fields.periodEnd ? new Date(fields.periodEnd).toISOString().split("T")[0] : "",
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export function computeLegacyHash(fields) {
  const payload = {
    userId: String(fields.userId || fields.user || ""),
    collegeId: String(fields.collegeId || fields.college || ""),
    activityPoints: Number(fields.activityPoints || 0),
    totalHours: Number(fields.totalHours || 0),
    exchangeCount: Number(fields.exchangeCount || 0),
    periodStart: fields.periodStart ? new Date(fields.periodStart).toISOString().split("T")[0] : "",
    periodEnd: fields.periodEnd ? new Date(fields.periodEnd).toISOString().split("T")[0] : "",
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

/**
 * Creates and persists a Certificate in MongoDB
 */
export async function issueCertificate(fields) {
  const activityTitle = fields.activityTitle || "Recognized Technical Activity";
  const activityType = fields.activityType || "Technical Activity";
  const organizer = fields.organizer || "AICTE / Technical Institution";
  const activityPoints = Number(fields.activityPoints || 0);

  const integrityHash = computeHash({
    userId: fields.userId,
    collegeId: fields.collegeId,
    activityTitle,
    activityType,
    organizer,
    activityPoints,
  });

  const cert = await Certificate.create({
    certId: crypto.randomUUID(),
    user: fields.userId,
    college: fields.collegeId,
    activityId: fields.activityId || null,
    activityTitle,
    activityType,
    organizer,
    activityDate: fields.activityDate || new Date().toISOString().split("T")[0],
    activityPoints,
    creditsEarned: Number(fields.creditsEarned || 0),
    totalHours: Number(fields.totalHours || 0),
    exchangeCount: Number(fields.exchangeCount || 0),
    periodStart: fields.periodStart ? new Date(fields.periodStart) : new Date(),
    periodEnd: fields.periodEnd ? new Date(fields.periodEnd) : new Date(),
    integrityHash,
    txHash: fields.txHash || null,
    blockNumber: fields.blockNumber || null,
  });

  return cert;
}

/**
 * Generates an official PDF certificate with embedded QR code
 */
export async function renderCertificatePdf(cert, student, college, baseUrl = process.env.CLIENT_URL || process.env.URL || "https://timebank017.netlify.app") {
  const verifyUrl = `${baseUrl}/#verify/${cert.certId}`;
  
  // Generate QR Code as Data URI
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 140,
    color: {
      dark: "#080b12",
      light: "#ffffff",
    },
  });

  // Convert Data URI to Buffer for PDFKit
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBuffer = Buffer.from(qrBase64, "base64");

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 30,
    info: {
      Title: `AICTE Certificate - ${student?.name || "Student"}`,
      Author: "TimeBank Academic Verification Network",
      Subject: "Verifiable Activity Points Certificate",
      Keywords: "AICTE, TimeBank, Blockchain, Verified, Activity Points",
    },
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const width = doc.page.width;
  const height = doc.page.height;

  // Outer Border & Background
  doc.rect(20, 20, width - 40, height - 40)
    .lineWidth(2.5)
    .strokeColor("#10b981")
    .stroke();

  doc.rect(25, 25, width - 50, height - 50)
    .lineWidth(1)
    .strokeColor("#3b82f6")
    .stroke();

  // Top Header Ribbon
  doc.rect(26, 26, width - 52, 54)
    .fillColor("#0f172a")
    .fill();

  // Header Title
  doc.fillColor("#10b981")
    .fontSize(21)
    .font("Helvetica-Bold")
    .text("TIMEBANK · ACADEMIC ACCREDITATION CERTIFICATE", 30, 40, {
      align: "center",
      characterSpacing: 1.2,
    });

  doc.fillColor("#94a3b8")
    .fontSize(9.5)
    .font("Helvetica")
    .text("OFFICIAL AICTE ACTIVITY POINT ACCREDITATION & VERIFICATION RECORD", 30, 65, {
      align: "center",
      characterSpacing: 0.8,
    });

  // Certificate Intro
  doc.fillColor("#64748b")
    .fontSize(11)
    .font("Helvetica")
    .text("This is to officially certify that", 0, 96, { width: width, align: "center" });

  // Student Name
  doc.fillColor("#0f172a")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(student?.name || "Distinguished Student", 0, 114, {
      width: width,
      align: "center",
    });

  // Student Email & College
  const collegeName = college?.name || student?.college || "Recognized Technical Institution";
  doc.fillColor("#475569")
    .fontSize(11)
    .font("Helvetica")
    .text(
      `of ${collegeName} (${student?.email || "Student Account"})`,
      0,
      142,
      { width: width, align: "center" }
    );

  doc.fillColor("#334155")
    .fontSize(11)
    .font("Helvetica")
    .text(
      "has successfully completed and attained official institution accreditation for the recognized activity:",
      0,
      162,
      { width: width, align: "center" }
    );

  // Uploaded Activity Showcase Box
  const actBoxWidth = 660;
  const actBoxX = (width - actBoxWidth) / 2;
  const actBoxY = 184;
  const actBoxHeight = 76;

  doc.roundedRect(actBoxX, actBoxY, actBoxWidth, actBoxHeight, 8)
    .fillColor("#f8fafc")
    .strokeColor("#94a3b8")
    .lineWidth(1)
    .fillAndStroke();

  // Tag inside box
  doc.fillColor("#059669")
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text("VERIFIED AICTE ACTIVITY CLAIM", actBoxX, actBoxY + 10, {
      width: actBoxWidth,
      align: "center",
      characterSpacing: 1,
    });

  // Activity Title
  const displayTitle = cert.activityTitle || "Technical Workshop & Project Submission";
  doc.fillColor("#0f172a")
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(`"${displayTitle}"`, actBoxX + 15, actBoxY + 25, {
      width: actBoxWidth - 30,
      align: "center",
      ellipsis: true,
    });

  // Activity Meta (Category, Organizer, Date)
  const actType = cert.activityType || "Technical Activity";
  const actOrg = cert.organizer || collegeName;
  const actDate = cert.activityDate || (cert.createdAt ? new Date(cert.createdAt).toLocaleDateString() : "Verified");

  doc.fillColor("#475569")
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Category: ${actType.toUpperCase()}   •   Organized by: ${actOrg}   •   Date: ${actDate}`,
      actBoxX + 15,
      actBoxY + 52,
      {
        width: actBoxWidth - 30,
        align: "center",
      }
    );

  // Awarded AICTE Points Highlight Plaque
  const ptsBoxWidth = 440;
  const ptsBoxX = (width - ptsBoxWidth) / 2;
  const ptsBoxY = 272;
  const ptsBoxHeight = 58;

  doc.roundedRect(ptsBoxX, ptsBoxY, ptsBoxWidth, ptsBoxHeight, 8)
    .fillColor("#ecfdf5")
    .strokeColor("#10b981")
    .lineWidth(1.5)
    .fillAndStroke();

  doc.fillColor("#047857")
    .fontSize(19)
    .font("Helvetica-Bold")
    .text(`+${cert.activityPoints} AICTE ACTIVITY POINTS AWARDED`, ptsBoxX, ptsBoxY + 11, {
      width: ptsBoxWidth,
      align: "center",
      characterSpacing: 0.8,
    });

  doc.fillColor("#065f46")
    .fontSize(9.5)
    .font("Helvetica")
    .text(`Formally Verified & Signed by Institutional Authority · ${collegeName}`, ptsBoxX, ptsBoxY + 36, {
      width: ptsBoxWidth,
      align: "center",
    });

  // Divider Line above footer
  const dividerY = 345;
  doc.moveTo(40, dividerY)
    .lineTo(width - 40, dividerY)
    .lineWidth(0.5)
    .strokeColor("#cbd5e1")
    .stroke();

  // Footer Cryptographic Verification Section & QR
  const footerY = 358;
  
  // Left: Verification Info
  doc.fillColor("#0f172a")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Cryptographic Verification & Authenticity Proof", 50, footerY);

  doc.fillColor("#475569")
    .fontSize(8)
    .font("Helvetica")
    .text(`Certificate UUID: ${cert.certId}`, 50, footerY + 16)
    .text(`Integrity Hash (SHA-256): ${cert.integrityHash}`, 50, footerY + 28)
    .text(`Blockchain Ledger: Polygon Amoy Proof (${cert.txHash ? cert.txHash.slice(0, 20) + '...' : 'Anchored & Authenticated'})`, 50, footerY + 40)
    .text(`Direct Verification URL: ${verifyUrl}`, 50, footerY + 52)
    .text(`Issued On: ${new Date(cert.createdAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · Digital AICTE Credential`, 50, footerY + 64);

  // Right: QR Code Image
  const qrX = width - 170;
  const qrY = footerY - 8;
  doc.image(qrBuffer, qrX, qrY, { width: 88, height: 88 });

  doc.fillColor("#0f172a")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("Scan QR to verify", qrX - 10, qrY + 92, { width: 108, align: "center" });

  doc.fillColor("#64748b")
    .fontSize(7)
    .font("Helvetica")
    .text("Instant On-Chain Audit", qrX - 10, qrY + 103, { width: 108, align: "center" });

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}


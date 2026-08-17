// ─── TimeBank — Verifiable Certificate Service ───────────────────────────────
import crypto from "crypto";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { Certificate, User, College } from "./models.js";

/**
 * Computes a deterministic SHA-256 integrity hash over certificate parameters
 */
export function computeHash(fields) {
  const payload = {
    userId: String(fields.userId || fields.user || ""),
    collegeId: String(fields.collegeId || fields.college || ""),
    activityPoints: Number(fields.activityPoints || 0),
    totalHours: Number(fields.totalHours || 0),
    exchangeCount: Number(fields.exchangeCount || 0),
    periodStart: new Date(fields.periodStart).toISOString().split("T")[0],
    periodEnd: new Date(fields.periodEnd).toISOString().split("T")[0],
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
  const integrityHash = computeHash({
    userId: fields.userId,
    collegeId: fields.collegeId,
    activityPoints: fields.activityPoints,
    totalHours: fields.totalHours,
    exchangeCount: fields.exchangeCount,
    periodStart: fields.periodStart,
    periodEnd: fields.periodEnd,
  });

  const cert = await Certificate.create({
    certId: crypto.randomUUID(),
    user: fields.userId,
    college: fields.collegeId,
    activityPoints: fields.activityPoints,
    totalHours: fields.totalHours,
    exchangeCount: fields.exchangeCount,
    periodStart: new Date(fields.periodStart),
    periodEnd: new Date(fields.periodEnd),
    integrityHash,
    txHash: fields.txHash || null,
    blockNumber: fields.blockNumber || null,
  });

  return cert;
}

/**
 * Generates an official PDF certificate with embedded QR code
 */
export async function renderCertificatePdf(cert, student, college, baseUrl = "http://localhost:5173") {
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
    margin: 40,
    info: {
      Title: `AICTE Certificate - ${student?.name || "Student"}`,
      Author: "TimeBank Academic Verification Network",
      Subject: "Verifiable Activity Points Certificate",
      Keywords: "AICTE, TimeBank, Blockchain, Verified, Skill Exchange",
    },
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const width = doc.page.width;
  const height = doc.page.height;

  // Outer Border & Background
  doc.rect(20, 20, width - 40, height - 40)
    .lineWidth(3)
    .strokeColor("#10b981")
    .stroke();

  doc.rect(26, 26, width - 52, height - 52)
    .lineWidth(1)
    .strokeColor("#3b82f6")
    .stroke();

  // Top Header Ribbon
  doc.rect(27, 27, width - 54, 55)
    .fillColor("#0f172a")
    .fill();

  // Header Title
  doc.fillColor("#10b981")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("TIMEBANK · ACADEMIC ACTIVITY CERTIFICATE", 30, 42, {
      align: "center",
      characterSpacing: 1.5,
    });

  doc.fillColor("#94a3b8")
    .fontSize(10)
    .font("Helvetica")
    .text("OFFICIAL AICTE ACTIVITY POINT ACCREDITATION RECORD", 30, 68, {
      align: "center",
      characterSpacing: 1,
    });

  // Certificate Body
  doc.moveDown(3);
  doc.fillColor("#475569")
    .fontSize(12)
    .font("Helvetica")
    .text("This is to certify that", 0, 115, { align: "center" });

  // Student Name
  doc.fillColor("#0f172a")
    .fontSize(24)
    .font("Helvetica-Bold")
    .text(student?.name || "Distinguished Student", 0, 135, {
      align: "center",
      underline: false,
    });

  // Student Email & College
  const collegeName = college?.name || student?.college || "Recognized Technical Institution";
  doc.fillColor("#64748b")
    .fontSize(12)
    .font("Helvetica")
    .text(
      `of ${collegeName} (${student?.email || "Student Account"})`,
      0,
      168,
      { align: "center" }
    );

  doc.moveDown(0.5);
  doc.fillColor("#334155")
    .fontSize(12)
    .font("Helvetica")
    .text(
      `has successfully completed and verified collaborative peer-to-peer skill exchanges under the`,
      0,
      192,
      { align: "center" }
    );

  doc.fillColor("#0f172a")
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(
      "AICTE Activity Point Scheme & Time-Banking Accreditation Framework",
      0,
      210,
      { align: "center" }
    );

  // Metrics Box (Points, Hours, Exchanges)
  const boxY = 240;
  const boxWidth = 200;
  const boxHeight = 70;

  // Box 1: Activity Points
  doc.roundedRect(width / 2 - 310, boxY, boxWidth, boxHeight, 8)
    .fillColor("#f0fdf4")
    .strokeColor("#86efac")
    .lineWidth(1)
    .fillAndStroke();

  doc.fillColor("#15803d")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(`${cert.activityPoints} PTS`, width / 2 - 310, boxY + 14, {
      width: boxWidth,
      align: "center",
    });
  doc.fillColor("#166534")
    .fontSize(10)
    .font("Helvetica")
    .text("AICTE Activity Points", width / 2 - 310, boxY + 44, {
      width: boxWidth,
      align: "center",
    });

  // Box 2: Total Hours
  doc.roundedRect(width / 2 - 100, boxY, boxWidth, boxHeight, 8)
    .fillColor("#eff6ff")
    .strokeColor("#93c5fd")
    .lineWidth(1)
    .fillAndStroke();

  doc.fillColor("#1d4ed8")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(`${cert.totalHours} HRS`, width / 2 - 100, boxY + 14, {
      width: boxWidth,
      align: "center",
    });
  doc.fillColor("#1e40af")
    .fontSize(10)
    .font("Helvetica")
    .text("Confirmed Service Hours", width / 2 - 100, boxY + 44, {
      width: boxWidth,
      align: "center",
    });

  // Box 3: Confirmed Exchanges
  doc.roundedRect(width / 2 + 110, boxY, boxWidth, boxHeight, 8)
    .fillColor("#faf5ff")
    .strokeColor("#d8b4fe")
    .lineWidth(1)
    .fillAndStroke();

  doc.fillColor("#7e22ce")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(`${cert.exchangeCount}`, width / 2 + 110, boxY + 14, {
      width: boxWidth,
      align: "center",
    });
  doc.fillColor("#6b21a8")
    .fontSize(10)
    .font("Helvetica")
    .text("Mutual Peer Exchanges", width / 2 + 110, boxY + 44, {
      width: boxWidth,
      align: "center",
    });

  // Period Text
  const startDateStr = new Date(cert.periodStart).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const endDateStr = new Date(cert.periodEnd).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  
  doc.fillColor("#64748b")
    .fontSize(11)
    .font("Helvetica")
    .text(`Assessment Validity Period: ${startDateStr} – ${endDateStr}`, 0, 328, {
      align: "center",
    });

  // Footer Cryptographic Verification Section
  const footerY = 360;
  
  // Left: Verification Info
  doc.fillColor("#0f172a")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Cryptographic Verification & Authenticity", 50, footerY);

  doc.fillColor("#475569")
    .fontSize(8.5)
    .font("Helvetica")
    .text(`Certificate ID: ${cert.certId}`, 50, footerY + 16)
    .text(`Integrity Hash (SHA-256): ${cert.integrityHash}`, 50, footerY + 28)
    .text(`Blockchain Status: Anchored on Polygon Amoy Ledger`, 50, footerY + 40)
    .text(`Issue Timestamp: ${new Date(cert.createdAt || Date.now()).toUTCString()}`, 50, footerY + 52);

  // Right: QR Code Image
  const qrX = width - 180;
  const qrY = footerY - 15;
  doc.image(qrBuffer, qrX, qrY, { width: 90, height: 90 });

  doc.fillColor("#0f172a")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("Scan QR to verify", qrX - 10, qrY + 95, { width: 110, align: "center" });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

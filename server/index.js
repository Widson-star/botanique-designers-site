import express from "express";
import axios from "axios";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

// CORS — allow the production site (www + apex) plus any localhost origin for
// local development. Override the allow-list with CORS_ORIGINS (comma-separated).
const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGINS ||
  "https://www.botaniquedesigners.com,https://botaniquedesigners.com"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / curl (no Origin header), the allow-list, and localhost.
      if (!origin || ALLOWED_ORIGINS.includes(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);
app.use(bodyParser.json({ limit: "32kb" }));

const PORT = process.env.PORT || 5001;

// Minimal, dependency-free fixed-window rate limiter (per IP + route).
// In-memory: resets on restart and is per-instance — adequate for this low-traffic,
// single-instance Express server. Not for multi-instance/serverless use.
const rateBuckets = new Map();
function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.reset) {
      rateBuckets.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (bucket.count >= max) {
      return res.status(429).json({ error: "Too many requests. Please try again shortly." });
    }
    bucket.count += 1;
    return next();
  };
}

// Periodically drop expired buckets so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.reset) rateBuckets.delete(key);
  }
}, 10 * 60 * 1000).unref?.();

// Escape user-supplied text before embedding it in HTML email.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ⚠️ M-PESA IS IN SANDBOX MODE — NOT LIVE.
// The endpoints below point at Safaricom's *sandbox*. STK pushes here do NOT
// charge real customers. The in-app STK flow is therefore disabled on the
// frontend by default (see VITE_MPESA_STK_ENABLED in PaidConsultancyModal.jsx);
// customers are shown manual Till/Bank instructions instead. Before enabling
// live payment: swap these URLs to https://api.safaricom.co.ke, supply
// production Daraja credentials, and only then set VITE_MPESA_STK_ENABLED=true.
async function generateAccessToken() {
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = Buffer
    .from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`)
    .toString("base64");

  const { data } = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  return data.access_token;
}

// Format any Kenyan phone number to 254XXXXXXXXX
function formatPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.length === 9) return "254" + digits;
  return digits;
}

app.post("/api/stkpush", rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  try {
    const { amount, phone } = req.body;
    if (!amount || !phone) {
      return res.status(400).json({ error: "Amount and phone are required." });
    }

    const formattedPhone = formatPhone(phone);
    if (formattedPhone.length !== 12) {
      return res.status(400).json({ error: "Invalid phone number. Use format 07XXXXXXXX." });
    }

    const token = await generateAccessToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, "")
      .slice(0, -3);

    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString("base64");

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount),
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.CALLBACK_URL,
      AccountReference: "BotaniqueVisit",
      TransactionDesc: "Botanique Site Visit",
    };

    const { data } = await axios.post(
      // SANDBOX endpoint — see warning above generateAccessToken(). Not live.
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(data);
  } catch (err) {
    console.error("STK push error:", err.response?.data || err.message);
    res.status(500).json({ error: "M-Pesa request failed. Please pay manually using the Till number." });
  }
});

// M-Pesa callback — Safaricom posts payment confirmation here
app.post("/api/mpesa/callback", (req, res) => {
  const body = req.body?.Body?.stkCallback;
  if (body) {
    const { ResultCode, ResultDesc, CallbackMetadata } = body;
    console.log("M-Pesa callback:", ResultCode, ResultDesc);
    if (ResultCode === 0 && CallbackMetadata) {
      const items = CallbackMetadata.Item || [];
      const get = (name) => items.find((i) => i.Name === name)?.Value;
      // Avoid logging full PII: mask the payer phone number to its last 3 digits.
      const phone = String(get("PhoneNumber") ?? "");
      const maskedPhone = phone ? `***${phone.slice(-3)}` : "—";
      console.log("Payment confirmed:", {
        amount: get("Amount"),
        receipt: get("MpesaReceiptNumber"),
        phone: maskedPhone,
      });
    }
  }
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// ─── GROQ AI CHAT ENDPOINT ──────────────────────────────────────────────────

const BOTANIQUE_SYSTEM_PROMPT = `You are Botanique AI, the assistant for Botanique Designers — a landscape design and environmental consultancy based in Nairobi, Kenya.

COMPANY DETAILS:
- Website: https://www.botaniquedesigners.com
- Phone / WhatsApp: +254 720 861 592
- Email: botaniquedesigners@gmail.com
- Instagram: @botaniquedesigners
- Facebook: /botaniquedesigners

SERVICES:
1. Landscape Architecture & Design — site analysis, master planning, planting design, 3D visualisation
2. EIA Studies — NEMA-compliant Environmental Impact Assessments for developments in Kenya
3. Project Implementation — planting, irrigation, hardscape, outdoor structures
4. Garden Maintenance — weekly, bi-weekly or monthly programmes
5. Irrigation System Design & Installation
6. Horticultural Services — specialist planting and aftercare
7. Consultation & Site Assessment — paid site visits to assess and advise

AREAS SERVED:
- Nairobi & suburbs: Karen, Runda, Kiambu, Westlands, Lavington, Kilimani, Langata, Parklands, Hurlingham
- Coast: Mombasa, Diani, Malindi, Kilifi, Lamu
- Western: Kisumu, Kakamega, Kisii, Homa Bay
- Rift Valley: Nakuru, Eldoret, Nanyuki, Kericho, Kitale
- Central: Nyeri, Thika, Limuru, Tigoni, Embu, Meru
- Eastern: Machakos, Kitui, Isiolo
- Selected regional design briefs where the scope is a good fit
We travel for suitable projects across Kenya and selected regional design work.

PRICING:
- Site visit / consultation: Ksh 3,500 base fee (within 5 km of Nairobi CBD) + Ksh 60/km beyond 5 km
- Design, implementation, maintenance: custom-quoted based on scope and location
- For an estimate, use the Instant Quote tool at https://www.botaniquedesigners.com or WhatsApp +254 720 861 592

RESPONSE RULES — follow these strictly:
1. Keep every reply SHORT: 2–3 sentences per point, 3 paragraphs maximum. Never write essays.
2. NEVER use placeholder text like "[insert link]" or "[website URL]" — always use the real URLs and numbers above.
3. End every reply with ONE clear next step (e.g. "WhatsApp us on +254 720 861 592" or "Use the Instant Quote on botaniquedesigners.com").
4. Do not repeat the company name more than once per reply.
5. Never make up services, prices, or project details that aren't listed above.

TONE: Friendly, direct, Kenyan context-aware. Talk like a knowledgeable colleague, not a corporate brochure.`;

const CHAT_FALLBACK_MESSAGE =
  "Our live assistant is temporarily unavailable, but we can still help. Please WhatsApp us on +254 720 861 592 with your location, project type, photos, and what you'd like done — or request a site visit from the website.";

app.post("/api/chat", rateLimit({ windowMs: 60_000, max: 20 }), async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: CHAT_FALLBACK_MESSAGE });
    }

    const { message, history = [] } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required." });
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: BOTANIQUE_SYSTEM_PROMPT },
        ...history.map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text,
        })),
        { role: "user", content: message.trim() },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 512,
    });

    const reply = completion.choices[0]?.message?.content || "I couldn't get a response. Please try again.";

    res.json({ reply });
  } catch (err) {
    console.error("Groq error:", err.response?.data || err.status || err.message);
    res.status(502).json({ error: CHAT_FALLBACK_MESSAGE });
  }
});

// ─── CONTACT FORM ────────────────────────────────────────────────────────────
// Requires in server/.env:
//   EMAIL_USER=botaniquedesigners@gmail.com
//   EMAIL_PASS=<Gmail App Password from Google Account > Security > App Passwords>

app.post("/api/contact", rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  const { name, email, phone, service, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email and message are required." });
  }

  // Don't pretend the message was delivered if email isn't configured — return an
  // error so the frontend shows its WhatsApp/call/email fallback instead.
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("EMAIL_USER / EMAIL_PASS not set — cannot send contact email");
    return res.status(503).json({ error: "Email is not configured. Please contact us directly." });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  // User-supplied values are HTML-escaped before being embedded in the email.
  const bodyHtml = `
    <h2>New enquiry from botaniquedesigners.com</h2>
    <table cellpadding="8" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
      <tr><td><strong>Email</strong></td><td><a href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)}</a></td></tr>
      <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone) || "—"}</td></tr>
      <tr><td><strong>Service</strong></td><td>${escapeHtml(service) || "—"}</td></tr>
      <tr><td><strong>Message</strong></td><td style="white-space:pre-wrap">${escapeHtml(message)}</td></tr>
    </table>
  `;

  try {
    await transporter.sendMail({
      from: `"Botanique Website" <${process.env.EMAIL_USER}>`,
      to: "botaniquedesigners@gmail.com",
      replyTo: email,
      subject: `Website enquiry — ${name}`,
      html: bodyHtml,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Nodemailer error:", err.message);
    res.status(500).json({ error: "Failed to send email. Please contact us directly." });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

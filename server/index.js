import express from "express";
import axios from "axios";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5001;

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

app.post("/api/stkpush", async (req, res) => {
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
      console.log("Payment confirmed:", {
        amount: get("Amount"),
        receipt: get("MpesaReceiptNumber"),
        phone: get("PhoneNumber"),
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
- International: Uganda, Tanzania, Rwanda and wider East Africa
We travel for the right project — no location is too remote.

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

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI service not configured. Please contact us directly." });
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
    console.error("Groq error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again or contact us directly." });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

import express from "express";
import axios from "axios";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

app.post("/api/stkpush", async (req, res) => {
  try {
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
      Amount: req.body.amount,
      PartyA: req.body.phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: req.body.phone,
      CallBackURL: process.env.CALLBACK_URL,
      AccountReference: "Botanique",
      TransactionDesc: "Site Visit Payment",
    };

    const { data } = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("STK Push failed");
  }
});

// ─── GEMINI AI CHAT ENDPOINT ────────────────────────────────────────────────

const BOTANIQUE_SYSTEM_PROMPT = `You are Botanique AI, the friendly and knowledgeable assistant for Botanique Designers — a premier landscape design and environmental consultancy firm based in Nairobi, Kenya.

COMPANY OVERVIEW:
- Name: Botanique Designers
- Based in: Nairobi, Kenya
- Speciality: Landscape architecture, environmental impact assessments, and outdoor space transformation
- Phone: +254 720 861 592
- Email: botaniquedesigners@gmail.com
- Instagram: @botaniquedesigners
- Facebook: /botaniquedesigners

SERVICES:
1. Landscape Architecture & Design — site analysis, master planning, planting design, 3D visualisation
2. EIA Studies — NEMA-compliant Environmental Impact Assessments for developments in Kenya
3. Project Implementation — full build-out of landscape designs: planting, irrigation, hardscape, outdoor structures
4. Garden Maintenance — scheduled maintenance programmes (weekly, bi-weekly, monthly)
5. Irrigation System Design & Installation
6. Horticultural Services — specialist planting and aftercare
7. Consultation & Site Assessment — paid site visits to assess and advise on outdoor spaces

AREAS SERVED: We serve the whole of Kenya and take on international projects across East Africa. Our primary hubs include:
- Nairobi & suburbs: Karen, Runda, Kiambu, Westlands, Lavington, Kilimani, Langata, Spring Valley, Parklands, Hurlingham
- Coast: Mombasa, Diani, Malindi, Kilifi, Lamu, North Coast
- Western Kenya: Kisumu, Kakamega, Bungoma, Kisii, Homa Bay
- Rift Valley: Nakuru, Eldoret, Nanyuki, Kericho, Bomet, Kitale
- Central & Mt Kenya: Nyeri, Thika, Ruiru, Limuru, Tigoni, Muranga, Embu, Meru
- Eastern & North Eastern: Machakos, Kitui, Garissa, Isiolo
- International: Uganda, Tanzania, Rwanda and wider East Africa on enquiry
No client should feel their location is too remote — we travel for the right project.

PRICING GUIDANCE:
- Consultation/site visit: Ksh 3,500 base fee (within 5km of Nairobi CBD), plus Ksh 60 per km beyond 5km
- All other pricing (design, implementation, maintenance) is custom-quoted based on scope, size and location
- Guide users to use the "Instant Quote" button on the website for a tailored estimate

HOW TO HELP USERS:
- Answer questions about services, coverage areas, EIA process, plant care, landscape design concepts
- When someone asks about pricing or wants to start a project, encourage them to use the Instant Quote wizard or contact via WhatsApp/email
- If asked about EIA, explain what it is, when it's required under Kenya's EMCA law, and how Botanique handles the NEMA submission process
- Be warm, professional and knowledgeable — like talking to a landscape expert who also cares about the client
- Keep responses concise (2–4 short paragraphs maximum). Don't overwhelm with text.
- Always end with a helpful next step: quoting, calling, emailing, or using the chatbot to learn more

TONE: Warm, expert, Kenyan context-aware. Avoid being overly formal. Use plain English.`;

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI service not configured. Please contact us directly." });
    }

    const { message, history = [] } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: BOTANIQUE_SYSTEM_PROMPT,
    });

    // Build chat history for context
    const chat = model.startChat({
      history: history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      })),
    });

    const result = await chat.sendMessage(message.trim());
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error("Gemini error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again or contact us directly." });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

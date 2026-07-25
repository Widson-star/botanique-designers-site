// Centralised WhatsApp message builders.
//
// Goal: leads should arrive readable even when a visitor taps send without
// editing. Fields the UI actually collects are filled in; missing fields are
// left as simple labels the client can complete in WhatsApp. No values are
// invented.
//
// Newlines (\n) are safe — encodeURIComponent turns them into %0A, so the
// wa.me URL never contains a raw line break.

import { CONTACT } from "./backend";

export const WHATSAPP_NUMBER = CONTACT.whatsapp; // "2547..."

// Build a wa.me link from a plain-text message.
export function waLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function line(label, value) {
  const cleanValue = typeof value === "string" ? value.trim() : value;
  return cleanValue ? `${label}: ${cleanValue}` : `${label}:`;
}

// Quotation / site-visit request (from the project-enquiry wizard or generic
// "WhatsApp us" CTAs). The wizard collects a name and site context in visible steps, so
// those lines are included only when present. Generic CTAs that don't collect
// them pass no form, so blank "Name:"/"Site context:" lines are omitted rather
// than shown empty. Service/Location/Project size/Budget range remain as simple
// labels for the client to complete in WhatsApp.
// The optional `context` carries human-readable enquiry context set when the
// wizard was opened (e.g. { programme } from the GardenCare page, or a readable
// { source }). It is operational context for the team, never internal route or
// component names.
export function buildQuoteMessage(form = {}, context = {}) {
  const ctx = context || {};
  const lines = ["Hello Botanique Designers,", "", "I would like to request a site visit / quotation.", ""];

  if (form.name) lines.push(line("Name", form.name));

  lines.push(line("Service", form.service));

  if (ctx.programme) lines.push(line("Programme of interest", ctx.programme));

  lines.push(line("Location", form.location), line("Project size", form.size));

  if (form.siteContext) lines.push(line("Site context", form.siteContext));

  lines.push(line("Budget range", form.budget));

  lines.push(
    "",
    "I can share photos or a short video of the site in this chat.",
    "Could you please advise on the site visit fee and the next available appointment?"
  );

  if (ctx.source) lines.push("", line("Enquiry source", ctx.source));

  return lines.join("\n");
}

// Contact-form WhatsApp fallback (used when the website form can't send).
export function buildContactFallbackMessage(form = {}) {
  return [
    "Hello Botanique Designers,",
    "",
    "I tried sending a message through the website, but I am sharing it here directly.",
    "",
    line("Name", form.name),
    line("Phone", form.phone),
    line("Email", form.email),
    line("Service", form.service),
    "Location:",
    line("Message", form.message),
    "",
    "Please advise on the next step.",
  ].join("\n");
}

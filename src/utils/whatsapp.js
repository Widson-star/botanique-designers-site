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
export function buildQuoteMessage(form = {}) {
  const lines = ["Hello Botanique Designers,", "", "I would like to request a site visit / quotation.", ""];

  if (form.name) lines.push(line("Name", form.name));

  lines.push(line("Service", form.service), line("Location", form.location), line("Project size", form.size));

  if (form.siteContext) lines.push(line("Site context", form.siteContext));

  lines.push(line("Budget range", form.budget));

  lines.push("", "Could you please advise on the site visit fee and the next available appointment?");

  return lines.join("\n");
}

// Service detail page CTA.
export function buildServiceMessage(serviceName) {
  return [
    "Hello Botanique Designers,",
    "",
    "I would like to request a site visit / quotation.",
    "",
    line("Service", serviceName),
    "Location:",
    "Project size:",
    "Budget range:",
    "",
    "Could you please advise on the site visit fee and the next available appointment?",
  ].join("\n");
}

// Project / case-study CTA.
export function buildProjectMessage(projectName) {
  return [
    "Hello Botanique Designers,",
    "",
    `I saw the ${projectName} project and would like to request a site visit / quotation for something similar.`,
    "",
    "Service:",
    "Location:",
    "Project size:",
    "Budget range:",
    "",
    "Could you please advise on the site visit fee and the next available appointment?",
  ].join("\n");
}

// GardenCare secondary WhatsApp CTA (the /gardencare page). Identifies GardenCare
// interest, the desired programme/frequency if the visitor picked one, location
// and site context if provided, and always ends with a clear next-step request.
// No price is stated — pricing is custom after assessment.
export function buildGardenCareMessage({ programme, location, siteContext } = {}) {
  const lines = ["Hello Botanique Designers,", "", "I'm interested in GardenCare (your garden maintenance programme)."];

  if (programme) lines.push("", line("Programme of interest", programme));
  if (location) lines.push(line("Location", location));
  if (siteContext) lines.push(line("Garden / site context", siteContext));

  lines.push("", "Could you please advise on the next step, including a garden and location assessment?");

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

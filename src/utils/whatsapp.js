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

// Quotation / site-visit request (from the Quote Wizard or generic "WhatsApp us"
// CTAs). Pass whatever fields are available; the rest remain simple labels.
export function buildQuoteMessage(form = {}) {
  const lines = [
    "Hello Botanique Designers 🌿,",
    "",
    "I would like to request a site visit / quotation.",
    "",
    line("Service", form.service),
    line("Location", form.location),
    line("Project size", form.size),
  ];

  if (form.budget) lines.push(line("Budget range", form.budget));
  if (form.timeline) lines.push(line("Preferred timeline", form.timeline));

  return [
    ...lines,
    "Brief description:",
    "",
    "I can share photos or videos of the site.",
    "",
    "Please advise on the next step.",
  ].join("\n");
}

// Service detail page CTA.
export function buildServiceMessage(serviceName) {
  return [
    "Hello Botanique Designers 🌿,",
    "",
    `I am interested in ${serviceName}.`,
    "",
    "Location:",
    "Brief description:",
    "Preferred timeline:",
    "",
    "I can share photos or videos of the site.",
    "",
    "Please advise on the next step.",
  ].join("\n");
}

// Project / case-study CTA.
export function buildProjectMessage(projectName) {
  return [
    "Hello Botanique Designers 🌿,",
    "",
    `I saw the ${projectName} project and would like something similar.`,
    "",
    "Location:",
    "Brief description:",
    "Preferred timeline:",
    "",
    "I can share photos or videos of the site.",
    "",
    "Please advise on the next step.",
  ].join("\n");
}

// Contact-form WhatsApp fallback (used when the website form can't send).
export function buildContactFallbackMessage(form = {}) {
  return [
    "Hello Botanique Designers 🌿,",
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

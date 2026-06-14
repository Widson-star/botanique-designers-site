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
  return [
    "Hello Botanique Designers,",
    "",
    "I would like to request a site visit / quotation.",
    "",
    line("Name", form.name),
    line("Service", form.service),
    line("Location", form.location),
    line("Project size", form.size),
    line("Budget range", form.budget),
    "",
    "Could you please advise on the site visit fee and the next available appointment?",
  ].join("\n");
}

// Service detail page CTA.
export function buildServiceMessage(serviceName) {
  return [
    "Hello Botanique Designers,",
    "",
    "I would like to request a site visit / quotation.",
    "",
    "Name:",
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
    "Name:",
    "Service:",
    "Location:",
    "Project size:",
    "Budget range:",
    "",
    "Could you please advise on the site visit fee and the next available appointment?",
  ].join("\n");
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

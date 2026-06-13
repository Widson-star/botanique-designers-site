// Centralised WhatsApp message builders.
//
// Goal: leads should arrive pre-qualified so Botanique Designers does less
// manual back-and-forth. Fields the UI actually collects are filled in; fields
// it doesn't collect are left as editable placeholders the client completes in
// WhatsApp before sending. No values are invented.
//
// Newlines (\n) are safe — encodeURIComponent turns them into %0A, so the
// wa.me URL never contains a raw line break.

import { CONTACT } from "./backend";

export const WHATSAPP_NUMBER = CONTACT.whatsapp; // "2547..."

// Build a wa.me link from a plain-text message.
export function waLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const TIMELINE = "[urgent / within 1 month / 1-3 months / flexible]";
const PROJECT_TYPE =
  "[residential / estate / hospitality / commercial / institutional / farm / not sure]";
const SITE_STATUS =
  "[house complete / under construction / open land / existing garden / not sure]";
const SITE_CONDITION = "[flat / sloping / wet area / dry area / not sure]";

// Quotation / site-visit request (from the Quote Wizard or generic "WhatsApp us"
// CTAs). Pass whatever fields are available; the rest become placeholders.
export function buildQuoteMessage(form = {}) {
  return [
    "Hello Botanique Designers 🌿,",
    "",
    "I would like to request a site visit / quotation.",
    "",
    `Service: ${form.service || "[please specify]"}`,
    `Project Type: ${PROJECT_TYPE}`,
    `Location: ${form.location || "[please add]"}`,
    `Project Size: ${form.size || "[please add]"}`,
    `Site Status: ${SITE_STATUS}`,
    `Site Condition: ${SITE_CONDITION}`,
    "What I need help with: [please describe]",
    `Budget Range: ${form.budget || "[please add]"}`,
    `Timeline: ${TIMELINE}`,
    "",
    "I can share photos/videos of the site.",
    "",
    "Thank you.",
  ].join("\n");
}

// Service detail page CTA.
export function buildServiceMessage(serviceName) {
  return [
    "Hello Botanique Designers 🌿,",
    "",
    `I am interested in ${serviceName}.`,
    "",
    "Location: [please add]",
    `Project Type: ${PROJECT_TYPE}`,
    `Site Status: ${SITE_STATUS}`,
    "What I need help with: [please describe]",
    `Preferred Timeline: ${TIMELINE}`,
    "",
    "I can share photos/videos of the site.",
    "",
    "Please advise on the next step.",
  ].join("\n");
}

// Project / case-study CTA.
export function buildProjectMessage(projectName) {
  return [
    "Hello Botanique Designers 🌿,",
    "",
    `I saw the ${projectName} project and would like to discuss a similar landscape project.`,
    "",
    "Location: [please add]",
    `Project Type: ${PROJECT_TYPE}`,
    "Site Size: [please add]",
    "What I liked about this project: [please describe]",
    "What I need help with: [please describe]",
    `Preferred Timeline: ${TIMELINE}`,
    "",
    "I can share photos/videos of the site.",
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
    `Name: ${form.name || "[please add]"}`,
    `Phone: ${form.phone || "[please add]"}`,
    `Email: ${form.email || "[please add]"}`,
    `Service: ${form.service || "Not specified"}`,
    "Location: [please add]",
    `Message: ${form.message || "[please add]"}`,
    "",
    "Please assist.",
  ].join("\n");
}

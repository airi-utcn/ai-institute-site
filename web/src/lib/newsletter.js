// same rules as server/src/utils/newsletter.ts
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateNewsletterInput({ email, consent }) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) {
    return { ok: false, code: "invalid_email" };
  }

  if (consent !== true) {
    return { ok: false, code: "consent_required" };
  }

  return { ok: true, email: normalized };
}

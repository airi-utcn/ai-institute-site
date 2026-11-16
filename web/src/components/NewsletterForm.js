"use client";

import { useState } from "react";
import { validateNewsletterInput } from "@/lib/newsletter";

const MESSAGES = {
  subscribed: "Thank you! You are now subscribed.",
  already_subscribed: "This email address is already subscribed.",
  invalid_email: "Please enter a valid email address.",
  consent_required: "Please tick the checkbox to confirm your consent.",
  error: "Something went wrong. Please try again later.",
};

export default function NewsletterForm({ source = "footer" }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const check = validateNewsletterInput({ email, consent });
    if (!check.ok) {
      setFeedback({ error: true, text: MESSAGES[check.code] });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: check.email, consent: true, source, website }),
      });
      const data = await response.json();

      if (response.ok) {
        setFeedback({ text: MESSAGES[data.status] });
        if (data.status === "subscribed") {
          setEmail("");
          setConsent(false);
        }
      } else {
        setFeedback({ error: true, text: MESSAGES[data.code] || MESSAGES.error });
      }
    } catch {
      setFeedback({ error: true, text: MESSAGES.error });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <h3 className="font-semibold text-gray-900 dark:text-white">Newsletter</h3>
      <p className="mt-1 text-sm text-muted">Get AIRI news and updates by email.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3 text-left">
        <div className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-invalid={feedback?.error ? "true" : undefined}
            aria-describedby="newsletter-feedback"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {submitting ? "Subscribing..." : "Subscribe"}
          </button>
        </div>

        <label className="flex items-start gap-2 text-xs text-muted cursor-pointer">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-primary-600 focus:ring-primary-500"
          />
          <span>I agree to receive news and updates from AIRI@UTCN by email.</span>
        </label>

        {/* bots fill this in, people never see it */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>
        </div>

        <p
          id="newsletter-feedback"
          role="status"
          aria-live="polite"
          className={
            feedback?.error
              ? "min-h-[1.25rem] text-sm text-red-600 dark:text-red-400"
              : "min-h-[1.25rem] text-sm text-green-700 dark:text-green-400"
          }
        >
          {feedback?.text}
        </p>
      </form>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";

export default function ContactClient() {
  const email = "AIRI@campus.utcluj.ro";

  const socialLinks = [
    {
      href: "https://www.linkedin.com/company/109110973/",
      label: "LinkedIn",
      icon: (
        <path d="M22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0zM7.12 20.45H3.56V9h3.56v11.45zM5.34 7.58c-1.14 0-2.06-.93-2.06-2.08 0-1.15.92-2.08 2.06-2.08 1.14 0 2.06.93 2.06 2.08 0 1.15-.92 2.08-2.06 2.08zm15.11 12.87h-3.56v-5.59c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.95v5.68h-3.56V9h3.42v1.56h.05c.48-.91 1.65-1.85 3.4-1.85 3.63 0 4.3 2.39 4.3 5.5v6.24z" />
      ),
    },
    {
      href: "https://www.youtube.com/@universitateatehnicadinclu9191",
      label: "YouTube",
      icon: (
        <path d="M23.498 6.186a2.97 2.97 0 0 0-2.092-2.092C19.622 3.5 12 3.5 12 3.5s-7.622 0-9.406.594a2.97 2.97 0 0 0-2.092 2.092C0 7.97 0 12 0 12s0 4.03.502 5.814a2.97 2.97 0 0 0 2.092 2.092C4.378 20.5 12 20.5 12 20.5s7.622 0 9.406-.594a2.97 2.97 0 0 0 2.092-2.092C24 16.03 24 12 24 12s0-4.03-.502-5.814zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
      ),
    },
    {
      href: `mailto:${email}`,
      label: `Email: ${email}`,
      icon: (
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12a2 2 0 0 0 2 2h16c1.1 0 2-.9 2-2V6a2 2 0 0 0-2-2zM4 8l8 5 8-5v2l-8 5-8-5V8z" />
      ),
    },
  ];

  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <PageHeader
          title="Contact Us"
          subtitle="We would love to hear from you! Whether you have a question about our research, events, or anything else, our team is ready to answer all your questions."
        />

        {/* Social Links */}
        <section className="mb-10">
          <div className="card p-6">
            <h2 className="heading-3 heading-accent mb-6 text-center">Connect With Us</h2>
            <motion.div
              className="flex justify-center gap-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {socialLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800/60 transition-colors"
                  aria-label={link.label}
                  title={link.label}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    {link.icon}
                  </svg>
                </a>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="mb-10">
          <h2 className="heading-3 heading-accent mb-4">Contact Form</h2>
          <div className="card overflow-hidden">
            <iframe
              src="https://forms.office.com/Pages/ResponsePage.aspx?id=-nnrpqnEzkyBjbhSdNFTBXfygrOv6LlPruqY6PJRcsFURDdWSVMxNVdRVjhNSEFQMVdXQ0UzNlo0Ti4u&origin=QRCode"
              width="100%"
              height="450"
              style={{ border: 0 }}
              title="Contact Us Form"
              allowFullScreen
            />
          </div>
        </section>

        {/* Location */}
        <section>
          <h2 className="heading-3 heading-accent mb-4">Our Location</h2>
          <p className="text-body mb-4">
            📍 Strada Observatorului 2, Cluj-Napoca 400347, Romania
          </p>
          <div className="card overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1366.6963107204735!2d23.595919670551666!3d46.757156971379665!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47490c32b03140c1%3A0x437ed6aee538f132!2sStrada%20Observatorului%202%2C%20Cluj-Napoca%20400347!5e0!3m2!1sen!2sro!4v1740037763187!5m2!1sen!2sro"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title="Location Map"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
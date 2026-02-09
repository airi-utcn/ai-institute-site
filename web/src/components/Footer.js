"use client";

import Image from "next/image";
import Logo5 from "../../public/media/Logos/Logo5.svg";
import Logo5White from "../../public/media/Logos/Logo3.png";
import { useTheme } from "@/components/ThemeProvider";

const socialLinks = [
  {
    href: "https://www.linkedin.com/company/109110973/",
    label: "LinkedIn",
    icon: <path d="M22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0zM7.12 20.45H3.56V9h3.56v11.45zM5.34 7.58c-1.14 0-2.06-.93-2.06-2.08 0-1.15.92-2.08 2.06-2.08 1.14 0 2.06.93 2.06 2.08 0 1.15-.92 2.08-2.06 2.08zm15.11 12.87h-3.56v-5.59c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.95v5.68h-3.56V9h3.42v1.56h.05c.48-.91 1.65-1.85 3.4-1.85 3.63 0 4.3 2.39 4.3 5.5v6.24z" />,
  },
  {
    href: "https://www.flickr.com/people/203870795@N08/",
    label: "Flickr",
    icon: <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-5-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  },
  {
    href: "https://www.youtube.com/@AIRiAIInstitute",
    label: "YouTube",
    icon: <path d="M23.498 6.186a2.97 2.97 0 0 0-2.092-2.092C19.622 3.5 12 3.5 12 3.5s-7.622 0-9.406.594a2.97 2.97 0 0 0-2.092 2.092C0 7.97 0 12 0 12s0 4.03.502 5.814a2.97 2.97 0 0 0 2.092 2.092C4.378 20.5 12 20.5 12 20.5s7.622 0 9.406-.594a2.97 2.97 0 0 0 2.092-2.092C24 16.03 24 12 24 12s0-4.03-.502-5.814zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />,
  },
  {
    href: "https://github.com/airi-utcn",
    label: "GitHub",
    icon: <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />,
  },
];

const quickLinks = [
  { href: '/research/projects', label: 'Projects' },
  { href: '/about/sitemap', label: 'Sitemap' },
  { href: 'https://didatec.sharepoint.com/sites/UTCNRooms/SitePages/UTCN-AIRI-OBSERVATOR-CLUJ.aspx', label: 'Rooms', external: true },
  { href: 'https://didatec-my.sharepoint.com/:f:/g/personal/airi_campus_utcluj_ro/IgBfIIZeG9p5SJ_Pde6NBWT5AU_tSajIkfRPaloVwavKIJ4', label: 'Dissemination', external: true },
  { href: '/contact', label: 'Contact Us' },
];

export default function Footer() {
  const { isDark } = useTheme();

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Logo & Social */}
          <div className="flex flex-col items-center md:items-start gap-6">
            <a href="/" aria-label="Home">
              <Image
                src={isDark && Logo5White ? Logo5White : Logo5}
                alt="AI Institute Logo"
                width={140}
                height={140}
                style={{ filter: !Logo5White && isDark ? "invert(1) brightness(2)" : undefined }}
                priority
              />
            </a>
            <ul className="flex gap-3">
              {socialLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                    aria-label={link.label}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      {link.icon}
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">Contact</h3>
            <a
              href="https://www.google.com/maps/dir//Laboratoarele+UTC-N+Strada+Observatorului+2+Cluj-Napoca+400347"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 text-sm text-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary-600 dark:text-primary-400">
                <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
              </svg>
              <span>
                2 Observatorului Street,<br />
                Cluj-Napoca 400347,<br />
                Romania
              </span>
            </a>
            <a
              href="mailto:AIRI@campus.utcluj.ro"
              className="flex items-center gap-3 text-sm text-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary-600 dark:text-primary-400">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12a2 2 0 0 0 2 2h16c1.1 0 2-.9 2-2V6a2 2 0 0 0-2-2zM4 8l8 5 8-5v2l-8 5-8-5V8z" />
              </svg>
              <span>AIRI@campus.utcluj.ro</span>
            </a>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Technical University of Cluj-Napoca. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
"use client";

import Image from "next/image";
import LogoLight from "../../public/media/Logos/LogoLight.svg";
import LogoDark from "../../public/media/Logos/LogoDark.svg";
import EUT_Logo from '../../public/media/Logos/EUT_Logo.png';
import { useTheme } from "@/components/ThemeProvider";
import { useGlobalData } from "@/context/LocaleContext";
import { FaLinkedin, FaFlickr, FaYoutube, FaGithub, FaMicrosoft } from "react-icons/fa";
import { SiHuggingface } from "react-icons/si";

const socialLinks = [
  {
    href: "https://www.linkedin.com/company/109110973/",
    label: "LinkedIn",
    Icon: FaLinkedin,
  },
  {
    href: "https://www.flickr.com/people/203870795@N08/",
    label: "Flickr",
    Icon: FaFlickr,
  },
  {
    href: "https://www.youtube.com/@AIRiAIInstitute",
    label: "YouTube",
    Icon: FaYoutube,
  },
  {
    href: "https://github.com/airi-utcn",
    label: "GitHub",
    Icon: FaGithub,
  },
  {
    href: "https://huggingface.co/airi-utcn",
    label: "Hugging Face",
    Icon: SiHuggingface,
  },
  {
    href: "https://teams.microsoft.com/l/team/19%3Aszfgc22nAXHGONImN0qiCl6KXYy5SgcUt36u-nw0uq81%40thread.tacv2/conversations?groupId=ce932cfd-0971-42ca-a27d-bf21074712b9&tenantId=a6eb79fa-c4a9-4cce-818d-b85274d15305",
    label: "Teams",
    Icon: FaMicrosoft,
  },
];

export default function Footer({ footerData: customFooterData }) {
  const { isDark } = useTheme();
  const globalData = useGlobalData();
  const footer = customFooterData || globalData?.footer || {};

  const quickLinks = [
    { href: '/research/projects', label: footer.quickLinkProjects || 'Projects' },
    { href: '/about/sitemap', label: footer.quickLinkSitemap || 'Sitemap' },
    { href: 'https://didatec.sharepoint.com/sites/UTCNRooms/SitePages/UTCN-AIRI---Artificial-Intelligence-Research-Institute.aspx', label: footer.quickLinkRooms || 'Rooms & Calendar', external: true },
    { href: 'https://didatec-my.sharepoint.com/:f:/g/personal/airi_campus_utcluj_ro/IgBfIIZeG9p5SJ_Pde6NBWT5AU_tSajIkfRPaloVwavKIJ4', label: footer.quickLinkDissemination || 'Dissemination Materials', external: true },
    { href: '/contact', label: footer.quickLinkContactUs || 'Contact Us' },
  ];

  const copyrightText = (footer.copyright || '© {year} Artificial Intelligence Research Institute. All rights reserved.')
    .replace('{year}', new Date().getFullYear());

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {/* Logo & Social */}
          <div className="flex flex-col items-center gap-6">
            <a href="/" aria-label="Home">
              <Image
                src={isDark ? LogoDark : LogoLight}
                alt="AI Institute Logo"
                width={140}
                height={140}
                priority
              />
            </a>

            <a
              href="https://www.univ-tech.eu/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="EUT+"
            >
              <Image
                src={EUT_Logo}
                alt="EUT+ Logo"
                width={140}
                height={140}
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
                    <link.Icon className="w-5 h-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {footer.contactTitle || 'Contact'}
            </h3>
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
                {footer.addressLine1 || 'Strada Observatorului 2'}<br />
                {footer.addressLine2 || 'Cluj-Napoca 400347, Romania'}
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
          <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {footer.quickLinksTitle || 'Quick Links'}
            </h3>
            <ul className="space-y-2 text-center">
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
            {copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
}

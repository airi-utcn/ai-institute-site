"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

const SCRIPT_ID = "sk-linkedin-widget";
const STYLE_ID = "sk-linkedin-widget-theme";

export default function LinkedInWidget() {
  const { isDark } = useTheme();

  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://widgets.sociablekit.com/linkedin-page-posts/widget.js";
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .linkedin-widget-wrapper {
        position: relative !important;
        overflow: hidden !important;
        border-radius: 12px;
      }

      .linkedin-widget-wrapper .sk-ww-linkedin-page-post,
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post * {
        background-color: transparent !important;
      }

      /* =========================================
         DARK MODE STYLES
         ========================================= */
      
      /* Force ALL text to be light gray in dark mode so nothing is hidden */
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post * {
        color: #e5e7eb !important;
        border-color: #374151 !important;
      }

      /* Explicitly make the Page Name text pure white */
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-name,
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-name *,
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-profile-name {
        color: #ffffff !important;
        font-weight: bold !important;
      }

      /* Restore the dark background to structural elements AND the shared news cards */
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-widget,
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-post,
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-post-body,
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-post-text,
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-post-meta,
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-link-article,
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-shared-zone {
        background-color: #0f172a !important;
      }
      
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post .sk-widget {
        border: 1px solid #374151 !important;
      }
      
      /* Make links light blue */
      .linkedin-widget-wrapper.dark .sk-ww-linkedin-page-post a {
        color: #93c5fd !important;
      }

      /* Mask */
      .linkedin-widget-wrapper.dark::after {
        background: linear-gradient(transparent, #0f172a) !important;
      }

      /* =========================================
         LIGHT MODE STYLES
         ========================================= */
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post * {
        color: #1f2937 !important;
        border-color: #e5e7eb !important;
      }

      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-name,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-name *,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-profile-name {
        color: #111827 !important;
        font-weight: bold !important;
      }

      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-widget,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-post,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-post-body,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-post-text,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-post-meta,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-link-article,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-shared-zone {
        background-color: #ffffff !important;
      }

      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-widget {
        border: 1px solid #e5e7eb !important;
      }

      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post a {
        color: #1d4ed8 !important;
      }

      .linkedin-widget-wrapper.light::after {
        background: linear-gradient(transparent, #ffffff) !important;
      }

      /* =========================================
         GRADIENT MASK (Hides the provider text)
         ========================================= */
      .linkedin-widget-wrapper::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 20px;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  const wrapperClass = `linkedin-widget-wrapper ${isDark ? "dark" : "light"}`;

  return (
    <div className={wrapperClass}>
      <div className="sk-ww-linkedin-page-post" data-embed-id="25627872"></div>
    </div>
  );
}
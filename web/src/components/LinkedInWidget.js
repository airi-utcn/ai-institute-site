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
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post,
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post * {
        background-color: transparent !important;
      }
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post .sk-widget,
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post .sk-post,
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post .sk-post-body,
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post .sk-post-text,
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post .sk-post-meta {
        background-color: #0f172a !important;
        color: #e5e7eb !important;
        border-color: #374151 !important;
      }
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post .sk-widget {
        border: 1px solid #374151 !important;
        border-radius: 12px !important;
      }
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post .sk-post-title a,
      .linkedin-widget-wrapper .sk-ww-linkedin-page-post .sk-post-meta a {
        color: #93c5fd !important;
      }
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-widget,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-post,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-post-body,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-post-text,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-post-meta {
        background-color: #ffffff !important;
        color: #1f2937 !important;
        border-color: #e5e7eb !important;
      }
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-post-title a,
      .linkedin-widget-wrapper.light .sk-ww-linkedin-page-post .sk-post-meta a {
        color: #1d4ed8 !important;
      }
      /* Positioning and bottom mask to hide provider footer text */
      .linkedin-widget-wrapper {
        position: relative !important;
        overflow: hidden !important;
      }
      .linkedin-widget-wrapper::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 20px;
        pointer-events: none;
        background: linear-gradient(transparent, rgba(0,0,0,0.85));
      }
      /* Light/dark overrides for the mask so it blends with surrounding card */
      .linkedin-widget-wrapper.dark::after {
        background: linear-gradient(transparent, #0f172a) !important;
      }
      .linkedin-widget-wrapper.light::after {
        background: linear-gradient(transparent, #ffffff) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  const wrapperClass = `linkedin-widget-wrapper ${isDark ? "dark" : "light"}`;

  return <div className={`${wrapperClass} sk-ww-linkedin-page-post`} data-embed-id="25627872" />;
}

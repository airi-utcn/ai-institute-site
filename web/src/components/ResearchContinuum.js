"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ResearchContinuum.module.css";

const POSTER = "/homepage/research-continuum-poster.jpg";
const DESKTOP_GIF = "/homepage/research-continuum.gif";
const MOBILE_GIF = "/homepage/research-continuum-mobile.gif";

export default function ResearchContinuum({ locale = "en" }) {
  const figureRef = useRef(null);
  const imageRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const playing = !paused && !suspended && !hasError;
  const ro = locale === "ro";
  const motionLabel = ro
    ? (paused ? "Pornește animația" : "Oprește animația")
    : (paused ? "Play animation" : "Pause animation");

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;

    function syncPlayback() {
      setSuspended(!visible || document.hidden || motionQuery.matches);
    }

    const observer = window.IntersectionObserver
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          syncPlayback();
        })
      : null;

    document.addEventListener("visibilitychange", syncPlayback);
    motionQuery.addEventListener("change", syncPlayback);
    observer?.observe(figure);
    setReady(true);
    // A server-rendered image can fail before React attaches its error handler.
    if (imageRef.current?.complete && imageRef.current.naturalWidth === 0) {
      setHasError(true);
    }
    syncPlayback();

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      motionQuery.removeEventListener("change", syncPlayback);
    };
  }, []);

  return (
    <div ref={figureRef} className={styles.figure} role="group" aria-label="Research in continuum">
      <div className={styles.drawing}>
        <img
          src={POSTER}
          width="1600"
          height="800"
          alt=""
          className={styles.poster}
          aria-hidden="true"
        />
        {/* Native picture selection works on direct visits before JavaScript loads.
            A paused GIF is replaced with a still; resuming can restart its loop. */}
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet={POSTER} />
          <source media="(max-width: 720px)" srcSet={playing ? MOBILE_GIF : POSTER} />
          <img
            ref={imageRef}
            src={playing ? DESKTOP_GIF : POSTER}
            width="1600"
            height="800"
            alt=""
            className={styles.animation}
            loading="eager"
            decoding="async"
            onError={() => setHasError(true)}
            aria-hidden="true"
          />
        </picture>
        <p className={styles.title}>AIRi / Research in continuum</p>
        <p className={styles.caption}>Aspire. Innovate. Research. Impact.</p>
        <p className="sr-only">
          {ro
            ? "Un glob albastru translucid, cu o rețea luminoasă și forme organice perforate, înconjurat de trasee de energie, urmat de apariția logo-ului AIRi."
            : "A translucent blue lattice globe with glowing, organically perforated surfaces and surrounding energy paths, followed by the AIRi logo reveal."}
        </p>
        <button
          type="button"
          className={styles.control}
          disabled={!ready || suspended}
          hidden={hasError}
          onClick={() => setPaused(value => !value)}
          aria-label={motionLabel}
          title={motionLabel}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            {paused
              ? <path d="m5 3 7 5-7 5V3Z" fill="currentColor" />
              : <path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2" />}
          </svg>
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createResearchContinuumAnimation } from "@/lib/research-continuum";
import styles from "./ResearchContinuum.module.css";

export default function ResearchContinuum({ locale = "en" }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const ro = locale === "ro";
  const motionLabel = ro
    ? (paused ? "Pornește animația" : "Oprește animația")
    : (paused ? "Play animation" : "Pause animation");

  useLayoutEffect(() => {
    // Draw at the final canvas size before the hydrated component is painted.
    if (!canvasRef.current?.getContext("2d")) return;
    const animation = createResearchContinuumAnimation(canvasRef.current);
    animationRef.current = animation;
    setReady(true);
    return () => {
      animation.destroy();
      animationRef.current = null;
    };
  }, []);

  useEffect(() => {
    animationRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <div className={styles.figure} role="group" aria-label="Research in continuum">
      <div className={styles.drawing}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
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
          disabled={!ready}
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ResearchContinuum.module.css";

const POSTER = "/homepage/research-continuum-poster.jpg";
const DESKTOP_VIDEO = "/homepage/research-continuum.mp4";
const MOBILE_VIDEO = "/homepage/research-continuum-mobile.mp4";

export default function ResearchContinuum({ locale = "en" }) {
  const figureRef = useRef(null);
  const videoRef = useRef(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [suspended, setSuspended] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ro = locale === "ro";

  const requestPlayback = useCallback((video, isCancelled = () => false) => {
    video.play()
      .then(() => {
        if (!isCancelled()) setAutoplayBlocked(false);
      })
      .catch(error => {
        if (isCancelled() || error.name === "AbortError") return;
        if (error.name === "NotAllowedError") {
          // Muted autoplay can still be denied (notably by iOS Low Power Mode).
          // Keep the poster and offer a play action instead of treating the
          // media as broken.
          setAutoplayBlocked(true);
          return;
        }
        setHasError(true);
      });
  }, []);

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = !window.IntersectionObserver;
    let pageReady = false;
    let idleTask;
    let fallbackTimer;

    function syncPlayback() {
      const suspended = !pageReady || !visible || document.hidden || motionQuery.matches;
      setSuspended(suspended);
      if (!suspended) {
        // Pick one rendition when playback first becomes possible. Keeping the
        // same source avoids a second download or a restart on viewport changes.
        setVideoSrc(current => current || (
          window.matchMedia("(max-width: 720px)").matches ? MOBILE_VIDEO : DESKTOP_VIDEO
        ));
      }
    }

    function allowPlayback() {
      pageReady = true;
      syncPlayback();
    }

    function deferPlayback() {
      // The poster is in the initial HTML. Do not attach a video source until
      // the page's load event and an idle turn, so it cannot compete with it.
      if (window.requestIdleCallback) {
        idleTask = window.requestIdleCallback(allowPlayback, { timeout: 1500 });
      } else {
        fallbackTimer = window.setTimeout(allowPlayback, 200);
      }
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
    if (document.readyState === "complete") {
      deferPlayback();
    } else {
      window.addEventListener("load", deferPlayback, { once: true });
    }
    syncPlayback();

    return () => {
      observer?.disconnect();
      window.removeEventListener("load", deferPlayback);
      if (idleTask !== undefined) window.cancelIdleCallback(idleTask);
      window.clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", syncPlayback);
      motionQuery.removeEventListener("change", syncPlayback);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || suspended || hasError) return;
    let cancelled = false;

    requestPlayback(video, () => cancelled);

    return () => {
      cancelled = true;
      video.pause();
    };
  }, [videoSrc, suspended, hasError, requestPlayback]);

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
        {videoSrc && !hasError && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={POSTER}
            width="1600"
            height="800"
            className={`${styles.animation} ${playing && !suspended ? styles.playing : ""}`}
            preload="none"
            muted
            loop
            playsInline
            disablePictureInPicture
            tabIndex={-1}
            onPlaying={() => {
              setPlaying(true);
              setAutoplayBlocked(false);
            }}
            onPause={() => setPlaying(false)}
            onError={() => setHasError(true)}
            aria-hidden="true"
          />
        )}
        <p className={styles.title}>AIRi / Research in continuum</p>
        <p className={styles.caption}>Aspire. Innovate. Research. Impact.</p>
        <p className="sr-only">
          {ro
            ? "Un glob albastru translucid, cu o rețea luminoasă și forme organice perforate, înconjurat de trasee de energie, urmat de apariția logo-ului AIRi."
            : "A translucent blue lattice globe with glowing, organically perforated surfaces and surrounding energy paths, followed by the AIRi logo reveal."}
        </p>
        {/* Only shown when the browser refuses muted autoplay. */}
        {autoplayBlocked && !suspended && !hasError && (
          <button
            type="button"
            className={styles.control}
            onClick={() => {
              const video = videoRef.current;
              if (video) requestPlayback(video);
            }}
            aria-label={ro ? "Pornește animația" : "Play animation"}
            title={ro ? "Pornește animația" : "Play animation"}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m5 3 7 5-7 5V3Z" fill="currentColor" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

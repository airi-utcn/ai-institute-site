import { createLatticeGlobeRenderer } from "./lattice-globe";
import AIRiLogo from "../../public/media/Logos/AIRiWhite.svg";

/** AIRi logo sequence with the supplied lattice globe and ambient energy. */
export function createResearchContinuumAnimation(canvas) {
  const SEQUENCE = {
    introEnd: 2.6,
    logoStart: 2.9,
    logoEnd: 6.9,
    logoFade: 0.55,
    handoffStart: 6.25,
    loop: 7.7,
  };
  var CFG = {
    loop: SEQUENCE.loop,   // seconds: entrance > logo reveal > return
    size: 0.22,            // central artwork scale relative to the smaller canvas side
    color: [60, 150, 255],   // main blue glow
    accent: [90, 255, 230],  // cyan energy
    violet: [150, 110, 255], // side wires
    wires: false,          // the wavy horizontal wires on both sides (off)
    logo: true,            // show the logo at the end of the sequence
    lines: true,           // straight light lines (same positions as in the film) drawn while the logo shows
  };

  var ctx = canvas.getContext('2d');
  if (!ctx) return { setPaused() {}, destroy() {} };
  const globe = createLatticeGlobeRenderer(ctx);
  const logoImage = new Image();
  let logoReady = false;
  var W = 0, H = 0, dpr = 1, S = 1, cx = 0, cy = 0;
  var TAU = Math.PI * 2;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
    }
    S = Math.min(W, H) * CFG.size; cx = W / 2; cy = H / 2;
  }

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, a).toFixed(3) + ')'; }
  function sstep(a, b, x) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function rnd(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function win(t, a, b, f) { return sstep(a, a + f, t) * (1 - sstep(b - f, b, t)); } // fade in at a, out at b

  function drawShape(time, pulse, dim, handoff, handoffProgress) {
    var halo = ctx.createRadialGradient(cx, cy, S * 0.2, cx, cy, S * 1.9);
    halo.addColorStop(0, rgba(CFG.color, 0.10 + 0.15 * pulse));
    halo.addColorStop(0.5, rgba(CFG.color, 0.03 + 0.045 * pulse));
    halo.addColorStop(1, rgba(CFG.color, 0));
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
    globe.draw(time, {
      width: W, height: H, dpr, scale: S, x: cx, y: cy,
      opacity: 1 - 0.5 * dim,
      handoff, handoffProgress,
    });
  }

  /* ---------- horizontal wires ---------- */
  function drawWires(t, e) {
    if (e < 0.01) return;
    var cols = [CFG.violet, CFG.color, CFG.accent];
    for (var w = 0; w < 3; w++) {
      for (var side = -1; side <= 1; side += 2) {
        var x0 = cx + side * S * 1.05, x1 = cx + side * W * 0.5, n = 70;
        ctx.beginPath();
        for (var i = 0; i <= n; i++) {
          var f = i / n, x = x0 + (x1 - x0) * f;
          var amp = S * (0.10 + 0.18 * f) * (1 - 0.2 * w) * e;
          var y = cy + amp * Math.sin(f * 9 - t * 2.4 * side + w * 1.3) * Math.sin(f * 3 + w);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = rgba(cols[w], 0.12 * e); ctx.lineWidth = 6 * dpr; ctx.stroke();
        ctx.strokeStyle = rgba(cols[w], 0.7 * e); ctx.lineWidth = 1.2 * dpr; ctx.stroke();
      }
    }
  }

  /* ---------- subtle energy around the globe, fading behind the logo ---------- */
  function drawAmbient(t, logo, intro) {
    var strength = 1 - 0.75 * logo;
    ctx.save();
    ctx.lineCap = 'round';

    // Four diagonal arms form an X behind the globe, with softly fading ends.
    var slant = Math.atan2(H * 0.34, W * 0.42);
    for (var arm = 0; arm < 4; arm++) {
      var direction = arm < 2 ? (arm ? -slant : slant) : Math.PI + (arm === 2 ? slant : -slant);
      var ax = Math.cos(direction), ay = Math.sin(direction);
      var near = S * 1.3;
      var far = Math.min(W * 0.44 / Math.abs(ax), H * 0.38 / Math.abs(ay));
      for (var thread = 0; thread < 2; thread++) {
        var color = thread ? CFG.violet : CFG.color;
        var gradient = ctx.createLinearGradient(cx + ax * near, cy + ay * near, cx + ax * far, cy + ay * far);
        gradient.addColorStop(0, rgba(color, 0));
        gradient.addColorStop(0.3, rgba(color, 0.20 * strength));
        gradient.addColorStop(0.65, rgba(color, 0.13 * strength));
        gradient.addColorStop(1, rgba(color, 0));
        ctx.beginPath();
        for (var i = 0; i <= 48; i++) {
          var f = i / 48;
          var distance = near + (far - near) * f;
          var wave = Math.sin(f * 7 - t * 1.1 + thread * 0.8 + arm) * S * (0.06 + 0.10 * f);
          var x = cx + ax * distance - ay * wave;
          var y = cy + ay * distance + ax * wave;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3 * dpr;
        ctx.globalAlpha = 0.22;
        ctx.stroke();
        ctx.lineWidth = 0.8 * dpr;
        ctx.globalAlpha = 1;
        ctx.stroke();

        // A single incoming light pulse on each X arm during the opening.
        var progress = Math.max(0, Math.min(1, (t - 0.12 - arm * 0.08) / 1.5));
        var intensity = Math.sin(progress * Math.PI) * intro;
        if (thread === 0 && intensity > 0.01) {
          var head = 1 - sstep(0, 1, progress);
          var sweep = ctx.createLinearGradient(cx + ax * near, cy + ay * near, cx + ax * far, cy + ay * far);
          sweep.addColorStop(0, rgba(CFG.color, 0));
          sweep.addColorStop(Math.max(0, head - 0.08), rgba(CFG.color, 0));
          sweep.addColorStop(head, rgba(CFG.accent, 0.50 * intensity));
          sweep.addColorStop(Math.min(1, head + 0.16), rgba(CFG.color, 0));
          sweep.addColorStop(1, rgba(CFG.color, 0));
          ctx.strokeStyle = sweep;
          ctx.globalAlpha = 0.2; ctx.lineWidth = 5 * dpr; ctx.stroke();
          ctx.globalAlpha = 1; ctx.lineWidth = 1.1 * dpr; ctx.stroke();
        }
      }
    }

    // Sparse motes drift outwards, echoing the film's light particles.
    var count = W / dpr < 500 ? 18 : 32;
    for (var p = 0; p < count; p++) {
      var angle = rnd(p + 110) * TAU;
      var phase = (rnd(p + 210) + t * (0.035 + rnd(p + 310) * 0.025)) % 1;
      var distance = S * (1.45 + phase * 2.1);
      var dx = Math.cos(angle), dy = Math.sin(angle) * 0.62;
      var px = cx + dx * distance, py = cy + dy * distance;
      var alpha = Math.sin(phase * Math.PI) * 0.27 * strength;
      var size = (0.7 + rnd(p + 410) * 0.8) * dpr;
      ctx.fillStyle = rgba(p % 4 ? CFG.color : CFG.accent, alpha);
      ctx.fillRect(px, py, size, size);
      if (p % 7 === 0) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - dx * S * 0.045, py - dy * S * 0.045);
        ctx.strokeStyle = rgba(CFG.color, alpha * 0.5);
        ctx.lineWidth = 0.65 * dpr;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Sparse, inward-moving particles appear only during the initial entrance.
  function drawIntro(t, energy) {
    if (energy < 0.01) return;
    var count = W / dpr < 500 ? 12 : 22;
    ctx.save();
    ctx.lineCap = 'round';
    for (var i = 0; i < count; i++) {
      var progress = (t - rnd(i + 510) * 0.75) / 1.4;
      if (progress <= 0 || progress >= 1) continue;
      var angle = rnd(i + 610) * TAU;
      var dx = Math.cos(angle), dy = Math.sin(angle) * 0.65;
      var radius = S * (3.5 - 2.4 * sstep(0, 1, progress));
      var x = cx + dx * radius, y = cy + dy * radius;
      var tail = S * (0.04 + 0.05 * (1 - progress));
      var alpha = Math.sin(progress * Math.PI) * energy * 0.48;
      var color = i % 4 ? CFG.color : CFG.accent;
      var trail = ctx.createLinearGradient(x + dx * tail, y + dy * tail, x, y);
      trail.addColorStop(0, rgba(color, 0));
      trail.addColorStop(1, rgba(color, alpha));
      ctx.beginPath();
      ctx.moveTo(x + dx * tail, y + dy * tail); ctx.lineTo(x, y);
      ctx.strokeStyle = trail; ctx.lineWidth = 0.8 * dpr; ctx.stroke();
      ctx.fillStyle = rgba(color, alpha);
      ctx.beginPath(); ctx.arc(x, y, (0.7 + rnd(i + 710) * 0.6) * dpr, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // A few outward-drifting motes bridge the logo fade and the next cycle.
  function drawReturn(energy, progress) {
    if (energy < 0.01) return;
    var count = W / dpr < 500 ? 8 : 14;
    ctx.save();
    ctx.lineCap = 'round';
    for (var i = 0; i < count; i++) {
      var phase = (progress - rnd(i + 810) * 0.2) / 0.8;
      if (phase <= 0 || phase >= 1) continue;
      var angle = rnd(i + 910) * TAU + phase * 0.12;
      var dx = Math.cos(angle), dy = Math.sin(angle) * 0.65;
      var radius = S * (1.1 + 1.6 * sstep(0, 1, phase));
      var x = cx + dx * radius, y = cy + dy * radius;
      var tail = S * 0.05;
      var color = i % 4 ? CFG.color : CFG.accent;
      var alpha = energy * Math.sin(phase * Math.PI) * 0.34;
      var trail = ctx.createLinearGradient(x - dx * tail, y - dy * tail, x, y);
      trail.addColorStop(0, rgba(color, 0));
      trail.addColorStop(1, rgba(color, alpha));
      ctx.beginPath();
      ctx.moveTo(x - dx * tail, y - dy * tail); ctx.lineTo(x, y);
      ctx.strokeStyle = trail; ctx.lineWidth = 0.8 * dpr; ctx.stroke();
      ctx.fillStyle = rgba(color, alpha);
      ctx.fillRect(x, y, 1.1 * dpr, 1.1 * dpr);
    }
    ctx.restore();
  }

  /* ---------- straight light lines, copied from the film (fixed positions) ---------- */
  // coordinates are in film pixels (1280x720); the blob centre in the film is (628,355)
  var LINES = [
    { pts: [[452,494],[712,277]], d: 0.00, dur: 0.70, strong: 1 },
    { pts: [[606,308],[815,471]], d: 0.10, dur: 0.70, strong: 1 },
    { pts: [[420,178],[537,281],[600,281]], d: 0.20, dur: 0.70, strong: 1 },
    { pts: [[452,327],[736,327],[800,277],[712,277]], d: 0.55, dur: 0.90, strong: 0 },
    { pts: [[600,257],[600,443],[645,443],[645,486],[856,486],[856,326],[739,326]], d: 0.75, dur: 1.10, strong: 0 },
    { pts: [[537,281],[537,327],[452,327],[452,442],[520,442]], d: 0.95, dur: 0.90, strong: 0 },
    { pts: [[600,257],[647,257],[647,302]], d: 1.15, dur: 0.60, strong: 0 },
    { pts: [[600,257],[647,314]], d: 1.25, dur: 0.50, strong: 0 }
  ];
  var FILM_CX = 628, FILM_CY = 355, FILM_K = 2.1 / 235;   // film px -> blob units (blob is ~235 film px wide)
  var LINES_IN = SEQUENCE.logoStart + 0.1, LINES_OUT = SEQUENCE.logoEnd - 1.2;
  (function () {
    LINES.forEach(function (L) {
      var cum = [0], i;
      for (i = 1; i < L.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(L.pts[i][0] - L.pts[i - 1][0], L.pts[i][1] - L.pts[i - 1][1]));
      L.cum = cum; L.len = cum[cum.length - 1];
    });
  })();
  function lineAt(L, d, out) {          // point at distance d along the polyline, in canvas px
    var i = 1; while (i < L.cum.length - 1 && L.cum[i] < d) i++;
    var f = (d - L.cum[i - 1]) / ((L.cum[i] - L.cum[i - 1]) || 1);
    var x = L.pts[i - 1][0] + (L.pts[i][0] - L.pts[i - 1][0]) * f, y = L.pts[i - 1][1] + (L.pts[i][1] - L.pts[i - 1][1]) * f;
    out[0] = cx + (x - FILM_CX) * FILM_K * S; out[1] = cy + (y - FILM_CY) * FILM_K * S;
  }
  var tp = [0, 0];
  function drawBars(u) {
    if (!CFG.lines) return;
    LINES.forEach(function (L) {
      var p = sstep(0, 1, (u - LINES_IN - L.d) / L.dur);
      var q = sstep(0, 1, (u - LINES_OUT - L.d * 0.5) / 0.6);
      var d0 = q * L.len, d1 = p * L.len;
      if (d1 - d0 < 0.5) return;
      ctx.beginPath();
      lineAt(L, d0, tp); ctx.moveTo(tp[0], tp[1]);
      for (var i = 1; i < L.cum.length; i++) {
        if (L.cum[i] <= d0) continue;
        if (L.cum[i - 1] >= d1) break;
        var dd = Math.min(L.cum[i], d1);
        lineAt(L, dd, tp); ctx.lineTo(tp[0], tp[1]);
      }
      ctx.strokeStyle = rgba(CFG.accent, 0.08); ctx.lineWidth = (L.strong ? 11 : 8) * dpr; ctx.stroke();
      ctx.strokeStyle = rgba(CFG.accent, 0.28); ctx.lineWidth = (L.strong ? 4 : 3) * dpr; ctx.stroke();
      ctx.strokeStyle = rgba([235, 255, 252], 0.55); ctx.lineWidth = (L.strong ? 1.6 : 1.2) * dpr; ctx.stroke();
      if (p < 1 && p > 0) {              // glowing head while the line is being drawn
        lineAt(L, d1, tp);
        var g = ctx.createRadialGradient(tp[0], tp[1], 0, tp[0], tp[1], 14 * dpr);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, rgba(CFG.accent, 0));
        ctx.fillStyle = g; ctx.fillRect(tp[0] - 14 * dpr, tp[1] - 14 * dpr, 28 * dpr, 28 * dpr);
      }
    });
  }

  function drawVeil(e) {                 // soft dark patch so lines fade out behind the blob and logo
    if (e < 0.01) return;
    ctx.globalCompositeOperation = 'source-over';
    var g = ctx.createRadialGradient(cx, cy, S * 0.5, cx, cy, S * 1.6);
    g.addColorStop(0, 'rgba(5,9,15,' + (0.75 * e).toFixed(3) + ')'); g.addColorStop(1, 'rgba(5,9,15,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
  }

  /* ---------- flash ---------- */
  function drawFlash(e) {
    if (e < 0.01) return;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.3);
    g.addColorStop(0, rgba([255, 255, 255], 0.8 * e));
    g.addColorStop(0.3, rgba(CFG.accent, 0.4 * e));
    g.addColorStop(1, rgba(CFG.accent, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ---------- official white AIRi logo ---------- */
  function drawLogo(e) {
    if (!CFG.logo || !logoReady || e < 0.01) return;
    // Preserve the official lockup's proportions and keep it legible on mobile.
    var width = Math.min(W * 0.78, Math.max(S * 3.25, 240 * dpr));
    var height = width * logoImage.naturalHeight / logoImage.naturalWidth;
    var lift = (1 - e) * S * 0.06;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = e;
    ctx.shadowColor = rgba(CFG.color, 0.95 * e); ctx.shadowBlur = 22 * dpr;
    ctx.drawImage(logoImage, cx - width / 2, cy - height / 2 + lift, width, height);
    ctx.restore();
  }

  /* ---------- main ---------- */
  function draw(time) {
    var u = time % CFG.loop;   // sequence positions are measured in seconds
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    var logo = CFG.logo ? win(u, SEQUENCE.logoStart, SEQUENCE.logoEnd, SEQUENCE.logoFade) : 0;
    var wires = Math.max(win(u, 0, SEQUENCE.logoStart, SEQUENCE.logoFade), CFG.logo ? sstep(SEQUENCE.logoEnd - 0.2, CFG.loop - 0.2, u) : 0);
    if (!CFG.logo) wires = 1;
    var flash = CFG.logo ? Math.max(0, 1 - Math.abs(u - (SEQUENCE.logoStart + 0.3)) / 0.4) : 0;
    // Run once on entry, with the existing pause and reduced-motion behavior.
    var intro = motionQuery.matches ? 0 : win(time, 0, SEQUENCE.introEnd, 0.7);
    var handoff = CFG.logo && !motionQuery.matches ? win(u, SEQUENCE.handoffStart, CFG.loop, 0.4) : 0;
    var handoffProgress = sstep(SEQUENCE.handoffStart, CFG.loop, u);
    var pulse = Math.max(logo * 0.4, flash, intro * 0.35, handoff * 0.15);

    drawAmbient(time, logo, intro);
    drawIntro(time, intro);
    drawReturn(handoff, handoffProgress);
    if (CFG.wires) drawWires(time, wires);
    drawBars(u);
    drawVeil(logo);
    drawShape(time, pulse, logo, handoff, handoffProgress);
    drawFlash(flash);
    drawLogo(logo);
  }

  // React owns the animation lifetime, pause control, and accessibility settings.
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frameInterval = 1000 / 30;
  let visible = !('IntersectionObserver' in window);
  let paused = false;
  let destroyed = false;
  let raf = 0;
  let lastFrame = null;
  let elapsed = 0;

  function canAnimate() {
    return !destroyed && visible && !document.hidden && !paused && !motionQuery.matches;
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = null;
  }

  function frame(now) {
    raf = 0;
    if (!canAnimate()) { lastFrame = null; return; }
    if (lastFrame === null) lastFrame = now;
    const delta = now - lastFrame;
    if (delta >= frameInterval) {
      const advance = delta - delta % frameInterval;
      elapsed += advance / 1000;
      lastFrame += advance;
      draw(elapsed);
    }
    raf = requestAnimationFrame(frame);
  }

  function sync() {
    if (canAnimate()) {
      if (!raf) raf = requestAnimationFrame(frame);
    } else stop();
  }

  function redraw() {
    resize();
    draw(motionQuery.matches ? (SEQUENCE.logoStart + SEQUENCE.logoEnd) / 2 : elapsed);
    sync();
  }

  function onMotionChange() {
    stop();
    redraw();
  }

  const resizeObserver = window.ResizeObserver ? new ResizeObserver(redraw) : null;
  const intersectionObserver = window.IntersectionObserver
    ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); })
    : null;
  resizeObserver?.observe(canvas);
  if (!resizeObserver) window.addEventListener('resize', redraw);
  intersectionObserver?.observe(canvas);
  logoImage.onload = () => {
    if (destroyed) return;
    logoReady = true;
    redraw();
  };
  logoImage.src = AIRiLogo.src;
  document.addEventListener('visibilitychange', sync);
  motionQuery.addEventListener('change', onMotionChange);
  redraw();

  return {
    setPaused(value) { paused = value; sync(); },
    destroy() {
      destroyed = true;
      stop();
      logoImage.onload = null;
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', redraw);
      document.removeEventListener('visibilitychange', sync);
      motionQuery.removeEventListener('change', onMotionChange);
    },
  };
}

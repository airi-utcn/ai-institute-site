/** Closed lattice geometry supplied in lattice-globe (1).html. */
const MODEL = {
    cells: 7.8,          // lattice frequency: higher = more, smaller holes
    closing: 8.0,        // how strongly the surface closes into a ball
    offset: -0.7,        // shifts the surface: bigger holes (+) or smaller (-)
    grid: 0.052,         // spacing of the wire lines on the surface
    resolution: 64,      // mesh resolution (higher = smoother, slower start)
    period: 26,          // seconds per full turn
    tilt: 0.38,          // camera tilt (radians)
    theme: 'dark',       // 'dark' (glowing on dark) or 'light' (navy lines on white)
    glow: true
  };


let cachedSegments = null;

// Building the mesh is the only expensive setup step; reuse it across mounts.
function getLatticeSegments() {
  if (cachedSegments) return cachedSegments;
  var CFG = MODEL;
  /* ---------- implicit surface: supplied gyroid lattice that closes into a ball ---------- */
  var K = CFG.cells;
  function F(x, y, z) {
    var r2 = x * x + y * y + z * z, r4 = r2 * r2;
    var X = K * x, Y = K * y, Z = K * z;
    var g = Math.sin(X) * Math.cos(Y) + Math.sin(Y) * Math.cos(Z) + Math.sin(Z) * Math.cos(X);   // gyroid
    return g + CFG.offset + CFG.closing * r4 * r4;
  }

  // outward normal = gradient of F (F > 0 outside the ball)
  function gradF(x, y, z, o) {
    var r2 = x * x + y * y + z * z, cr = 8 * CFG.closing * r2 * r2 * r2;
    var X = K * x, Y = K * y, Z = K * z;
    var sx = Math.sin(X), cx_ = Math.cos(X), sy = Math.sin(Y), cy_ = Math.cos(Y), sz = Math.sin(Z), cz_ = Math.cos(Z);
    var gx = K * (cx_ * cy_ - sz * sx) + cr * x;
    var gy = K * (cy_ * cz_ - sx * sy) + cr * y;
    var gz = K * (cz_ * cx_ - sy * sz) + cr * z;
    var m = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    o[0] = gx / m; o[1] = gy / m; o[2] = gz / m;
  }

  /* ---------- marching tetrahedra -> triangles ---------- */
  var tris = [];                                   // flat: 9 numbers per triangle
  (function mesh() {
    var N = CFG.resolution, L = 1.18, h = 2 * L / N, n1 = N + 1, i, j, k;
    var vals = new Float32Array(n1 * n1 * n1);
    for (i = 0; i <= N; i++) for (j = 0; j <= N; j++) for (k = 0; k <= N; k++)
      vals[(i * n1 + j) * n1 + k] = F(-L + i * h, -L + j * h, -L + k * h);
    var cox = [0, 1, 1, 0, 0, 1, 1, 0], coy = [0, 0, 1, 1, 0, 0, 1, 1], coz = [0, 0, 0, 0, 1, 1, 1, 1];
    var TET = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
    var px = new Float32Array(8), py = new Float32Array(8), pz = new Float32Array(8), pv = new Float32Array(8);
    function edge(a, b, t, out) {
      var d = pv[a] / (pv[a] - pv[b]);
      out.push(px[a] + (px[b] - px[a]) * d, py[a] + (py[b] - py[a]) * d, pz[a] + (pz[b] - pz[a]) * d);
    }
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) for (k = 0; k < N; k++) {
      var c, mn = 1e9, mx = -1e9;
      for (c = 0; c < 8; c++) {
        var v = vals[((i + cox[c]) * n1 + (j + coy[c])) * n1 + (k + coz[c])];
        pv[c] = v; if (v < mn) mn = v; if (v > mx) mx = v;
        px[c] = -L + (i + cox[c]) * h; py[c] = -L + (j + coy[c]) * h; pz[c] = -L + (k + coz[c]) * h;
      }
      if (mn >= 0 || mx <= 0) continue;
      for (var t = 0; t < 6; t++) {
        var T = TET[t], ins = [], out = [], q;
        for (q = 0; q < 4; q++) (pv[T[q]] < 0 ? ins : out).push(T[q]);
        if (ins.length === 0 || ins.length === 4) continue;
        if (ins.length === 1) {
          edge(ins[0], out[0], 0, tris); edge(ins[0], out[1], 0, tris); edge(ins[0], out[2], 0, tris);
        } else if (ins.length === 3) {
          edge(out[0], ins[0], 0, tris); edge(out[0], ins[1], 0, tris); edge(out[0], ins[2], 0, tris);
        } else {
          var a0 = ins[0], a1 = ins[1], o0 = out[0], o1 = out[1];
          edge(a0, o0, 0, tris); edge(a0, o1, 0, tris); edge(a1, o1, 0, tris);
          edge(a0, o0, 0, tris); edge(a1, o1, 0, tris); edge(a1, o0, 0, tris);
        }
      }
    }
  })();

  /* ---------- wire lines: contour lines of the two axes across each patch ---------- */
  var segs;                                         // x1 y1 z1 x2 y2 z2 nx ny nz
  (function lines() {
    var GN = [0, 0, 0], d = CFG.grid, out = [], nT = tris.length / 9, t, a, b;
    for (t = 0; t < nT; t++) {
      var o = t * 9, P = [[tris[o], tris[o + 1], tris[o + 2]], [tris[o + 3], tris[o + 4], tris[o + 5]], [tris[o + 6], tris[o + 7], tris[o + 8]]];
      var ux = P[1][0] - P[0][0], uy = P[1][1] - P[0][1], uz = P[1][2] - P[0][2];
      var vx = P[2][0] - P[0][0], vy = P[2][1] - P[0][1], vz = P[2][2] - P[0][2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var m = Math.sqrt(nx * nx + ny * ny + nz * nz); if (m < 1e-12) continue; nx /= m; ny /= m; nz /= m;
      var ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      var dom = ax > ay && ax > az ? 0 : (ay > az ? 1 : 2);
      for (a = 0; a < 3; a++) {
        if (a === dom) continue;
        var c0 = P[0][a], c1 = P[1][a], c2 = P[2][a];
        var lo = Math.min(c0, c1, c2), hi = Math.max(c0, c1, c2);
        for (var lv = Math.ceil(lo / d) * d; lv <= hi; lv += d) {
          var pts = [], e;
          for (e = 0; e < 3; e++) {
            var A = P[e], B = P[(e + 1) % 3], ca = A[a] - lv, cb = B[a] - lv;
            if ((ca < 0) !== (cb < 0)) {
              var s = ca / (ca - cb);
              pts.push(A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s, A[2] + (B[2] - A[2]) * s);
            }
          }
          if (pts.length === 6) { gradF((pts[0] + pts[3]) * 0.5, (pts[1] + pts[4]) * 0.5, (pts[2] + pts[5]) * 0.5, GN); out.push(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], GN[0], GN[1], GN[2], Math.sqrt(((pts[0]+pts[3])*0.5)*((pts[0]+pts[3])*0.5)+((pts[1]+pts[4])*0.5)*((pts[1]+pts[4])*0.5)+((pts[2]+pts[5])*0.5)*((pts[2]+pts[5])*0.5))); }
        }
      }
    }
    segs = new Float32Array(out);
  })();

  cachedSegments = segs;
  return cachedSegments;
}

export function createLatticeGlobeRenderer(ctx) {
  var CFG = MODEL, segs = getLatticeSegments();
  var NSEG = segs.length / 10, BINS = 9;
  var binIdx = new Uint8Array(NSEG);
  var P1 = new Float32Array(NSEG * 2), P2 = new Float32Array(NSEG * 2);
  var dpr = 1, R = 1, cx = 0, cy = 0, CAM = 4.2;
  var PAL = {
    dark:  { lo: [24, 90, 235], hi: [130, 215, 255], mode: 'lighter', aMin: 0.055, aMax: 0.62, glowA: 0.035 },
    light: { lo: [20, 45, 140], hi: [60, 120, 230], mode: 'source-over', aMin: 0.08, aMax: 0.75, glowA: 0.0 }
  };

  function draw(time, target) {
    var pal = PAL[CFG.theme] || PAL.dark, i, b;
    dpr = target.dpr; R = target.scale * 1.25; cx = target.x; cy = target.y;
    ctx.save();
    ctx.globalAlpha = target.opacity;

    var ry = time / CFG.period * Math.PI * 2, rx = CFG.tilt + 0.10 * Math.sin(time * 0.35), rz = 0.12 * Math.sin(time * 0.23 + 1);
    var cyc = Math.cos(ry), syc = Math.sin(ry), cxc = Math.cos(rx), sxc = Math.sin(rx), czc = Math.cos(rz), szc = Math.sin(rz);

    // view direction in camera space is +z; depth range of the ball is about -1.2..1.2
    var counts = new Int32Array(BINS), z1, z2;
    for (i = 0; i < NSEG; i++) {
      var o = i * 10;
      var X1 = segs[o], Y1 = segs[o + 1], Z1 = segs[o + 2], X2 = segs[o + 3], Y2 = segs[o + 4], Z2 = segs[o + 5];
      var nx = segs[o + 6], ny = segs[o + 7], nz = segs[o + 8];
      // rotate Y, X, Z
      var a1 = X1 * cyc - Z1 * syc, c1 = X1 * syc + Z1 * cyc; var b1 = Y1 * cxc - c1 * sxc; z1 = Y1 * sxc + c1 * cxc;
      var a2 = X2 * cyc - Z2 * syc, c2 = X2 * syc + Z2 * cyc; var b2 = Y2 * cxc - c2 * sxc; z2 = Y2 * sxc + c2 * cxc;
      var x1 = a1 * czc - b1 * szc, y1 = a1 * szc + b1 * czc, x2 = a2 * czc - b2 * szc, y2 = a2 * szc + b2 * czc;
      var f1 = CAM / (CAM + z1), f2 = CAM / (CAM + z2);
      P1[i * 2] = cx + x1 * f1 * R; P1[i * 2 + 1] = cy - y1 * f1 * R;
      P2[i * 2] = cx + x2 * f2 * R; P2[i * 2 + 1] = cy - y2 * f2 * R;
      // brightness: nearer = brighter, plus a little more where the sheet turns edge-on (rim glow)
      var zm = (z1 + z2) * 0.5;
      var rnx = nx * cyc - nz * syc, rnz = nx * syc + nz * cyc, rny = ny * cxc - rnz * sxc, rnz2 = ny * sxc + rnz * cxc;
      var toCam = -rnz2;                            // > 0: the surface looks at the camera, < 0: it faces away
      var depth = clamp((1.15 - zm) / 2.3);         // 1 near .. 0 far
      var front = toCam > 0 ? 0.55 + 0.45 * Math.min(1, toCam * 1.4) : 0.16;
      var rin = 0.45 + 0.55 * clamp((segs[o + 9] - 0.3) / 0.5);   // inner sheets are fainter
      var br = clamp((0.2 + 0.8 * depth) * front * rin + 0.0);
      b = Math.min(BINS - 1, (br * BINS) | 0);
      binIdx[i] = b; counts[b]++;
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = pal.mode;
    for (b = 0; b < BINS; b++) {
      if (!counts[b]) continue;
      var t = b / (BINS - 1), col = [pal.lo[0] + (pal.hi[0] - pal.lo[0]) * t, pal.lo[1] + (pal.hi[1] - pal.lo[1]) * t, pal.lo[2] + (pal.hi[2] - pal.lo[2]) * t];
      var alpha = pal.aMin + (pal.aMax - pal.aMin) * t;
      ctx.beginPath();
      for (i = 0; i < NSEG; i++) if (binIdx[i] === b) { ctx.moveTo(P1[i * 2], P1[i * 2 + 1]); ctx.lineTo(P2[i * 2], P2[i * 2 + 1]); }
      var c3 = 'rgba(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0) + ',';
      if (CFG.glow && pal.glowA > 0) {
        ctx.lineWidth = 5 * dpr; ctx.strokeStyle = c3 + (pal.glowA * 0.35 * (0.4 + t)).toFixed(3) + ')'; ctx.stroke();
        ctx.lineWidth = 2 * dpr; ctx.strokeStyle = c3 + (pal.glowA * (0.4 + t)).toFixed(3) + ')'; ctx.stroke();
      }
      ctx.lineWidth = 0.9 * dpr; ctx.strokeStyle = c3 + alpha.toFixed(3) + ')'; ctx.stroke();
    }
    drawHandoff(target.handoff || 0, target.handoffProgress || 0, pal.hi);
    ctx.restore();
  }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }


  function drawHandoff(energy, progress, color) {
    if (energy < 0.01) return;
    var TAU = Math.PI * 2, head = progress * TAU;
    var trails = [new Path2D(), new Path2D(), new Path2D()];
    for (var i = 0; i < NSEG; i++) {
      if (binIdx[i] < 4) continue;
      var x = (P1[i * 2] + P2[i * 2]) / 2 - cx;
      var y = (P1[i * 2 + 1] + P2[i * 2 + 1]) / 2 - cy;
      if (x * x + y * y < R * R * 0.40) continue;
      var delta = ((head - Math.atan2(y, x)) % TAU + TAU) % TAU;
      if (delta > 0.5) continue;
      var path = trails[Math.min(2, Math.floor(delta / 0.5 * 3))];
      path.moveTo(P1[i * 2], P1[i * 2 + 1]);
      path.lineTo(P2[i * 2], P2[i * 2 + 1]);
    }
    for (var j = 0; j < trails.length; j++) {
      var fade = 1 - j / trails.length;
      ctx.strokeStyle = `rgba(${color},${0.10 * energy * fade})`;
      ctx.lineWidth = 5 * dpr; ctx.stroke(trails[j]);
      ctx.strokeStyle = `rgba(${color},${0.70 * energy * fade})`;
      ctx.lineWidth = 1.2 * dpr; ctx.stroke(trails[j]);
    }
  }

  return { draw };
}

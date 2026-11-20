// Fish swimming in the page background.
//
// The fish picture comes from the `data-sprite` attribute of the script tag
// (see _includes/scripts/fish.liquid), so it can be swapped without touching this file.
// The picture must face right. It is recoloured to match the current theme.
//
// Behaviour:
//   - fish wander on their own, mostly left and right
//   - a fast cursor, or a cursor that gets too close, scares nearby fish away
//   - a resting cursor makes curious fish come over and circle it
//   - a click or tap sends out a ripple and scatters the fish around it
//   - with "reduce motion" switched on in the system settings, the fish stay still
(function () {
  "use strict";

  const script = document.currentScript;
  const spriteUrl = script ? script.getAttribute("data-sprite") : "";
  if (!spriteUrl || !window.requestAnimationFrame) return;

  // ---- Tuning ---------------------------------------------------------------
  const MIN_LENGTH = 30; // body length of the farthest fish, in px
  const MAX_LENGTH = 68; // body length of the nearest fish, in px
  const MIN_FISH = 5;
  const MAX_FISH = 16;
  const AREA_PER_FISH = 85000; // one fish per this many square px of window
  const MIN_ALPHA = 0.16; // farthest fish
  const MAX_ALPHA = 0.4; // nearest fish
  const DARK_ALPHA_BOOST = 1.5; // fish are harder to see on a dark page, so make them stronger there
  const FLEE_RADIUS = 130; // how close the cursor must be to scare a fish
  const FLEE_SPEED = 140; // cursor speed (px/s) that counts as "fast"
  const PERSONAL_SPACE = 38; // closer than this always scares a fish
  const CURIOUS_RADIUS = 320; // how far away a resting cursor attracts fish
  const IDLE_MS = 900; // how long the cursor must rest before fish come over
  const SCATTER_RADIUS = 280; // reach of a click or tap
  const RIPPLE_MS = 750;
  const EDGE_PAD = 70; // fish steer back when this close to the top or bottom
  const WAVE_X = 0.06; // tail swing, as a share of body length
  const WAVE_Y = 0.035; // body ripple, as a share of body height
  const MAX_EFFORT = 1.6;
  const TAU = Math.PI * 2;

  // ---- Canvas ---------------------------------------------------------------
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.id = "fish-background";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;";
  document.body.insertBefore(canvas, document.body.firstChild);

  const printStyle = document.createElement("style");
  printStyle.textContent = "@media print{#fish-background{display:none}}";
  document.head.appendChild(printStyle);

  const scratch = document.createElement("canvas");
  const scratchCtx = scratch.getContext("2d");
  const image = new Image();
  const reducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let ratio = 1.1; // sprite height / width, set once the picture has loaded
  let color = "#888";
  let alphaScale = 1;
  let sprites = {}; // recoloured sprites, one per fish size
  let fish = [];
  let ripples = [];
  let ready = false;
  let running = false;
  let rafId = 0;
  let lastFrame = 0;
  let lastScroll = window.pageYOffset || 0;

  const pointer = { x: 0, y: 0, active: false, speed: 0, movedAt: 0 };

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function readColor() {
    const styles = window.getComputedStyle(document.documentElement);
    const value = styles.getPropertyValue("--global-theme-color") || styles.getPropertyValue("--global-text-color");
    return value ? value.trim() : "#888";
  }

  function readAlphaScale() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? DARK_ALPHA_BOOST : 1;
  }

  // ---- Sprites --------------------------------------------------------------
  // One recoloured copy of the picture per fish size, drawn straight from the
  // vector file so every size stays sharp.
  function spriteFor(lengthPx) {
    if (sprites[lengthPx]) return sprites[lengthPx];
    const sprite = document.createElement("canvas");
    sprite.width = lengthPx;
    sprite.height = Math.max(1, Math.round(lengthPx * ratio));
    const sctx = sprite.getContext("2d");
    sctx.drawImage(image, 0, 0, sprite.width, sprite.height);
    sctx.globalCompositeOperation = "source-in";
    sctx.fillStyle = color;
    sctx.fillRect(0, 0, sprite.width, sprite.height);
    sprites[lengthPx] = sprite;
    return sprite;
  }

  function resetSprites() {
    sprites = {};
    color = readColor();
    alphaScale = readAlphaScale();
    const longest = Math.ceil(MAX_LENGTH * dpr);
    scratch.width = longest + Math.ceil(longest * WAVE_X * MAX_EFFORT) + 4;
    scratch.height = Math.ceil(longest * ratio * (1 + 2 * WAVE_Y * MAX_EFFORT)) + 6;
  }

  // ---- Fish -----------------------------------------------------------------
  function makeFish() {
    const depth = Math.random(); // 0 = far away, 1 = close
    const sizeScale = clamp(width / 1100, 0.75, 1);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const baseSpeed = 14 + 22 * depth + Math.random() * 8;
    return {
      x: Math.random() * width,
      y: EDGE_PAD * 0.5 + Math.random() * Math.max(1, height - EDGE_PAD),
      depth: depth,
      length: Math.round((MIN_LENGTH + (MAX_LENGTH - MIN_LENGTH) * depth) * sizeScale),
      alpha: MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * depth,
      baseSpeed: baseSpeed,
      speed: baseSpeed,
      dir: dir, // which way the fish wants to face: 1 = right, -1 = left
      face: dir, // which way it faces now; passes through 0 while turning round
      tilt: 0, // nose up (negative) or down (positive), in radians
      wander: dir > 0 ? 0 : Math.PI,
      phase: Math.random() * TAU, // tail beat
      fear: 0,
      fearX: 0,
      fearY: 0,
      curious: Math.random() < 0.75,
      spin: Math.random() < 0.5 ? -1 : 1, // which way it circles a resting cursor
    };
  }

  function populate() {
    const wanted = clamp(Math.round((width * height) / AREA_PER_FISH), MIN_FISH, MAX_FISH);
    while (fish.length < wanted) fish.push(makeFish());
    if (fish.length > wanted) fish.length = wanted;
    // far fish first, so near fish are drawn on top
    fish.sort(function (a, b) {
      return a.depth - b.depth;
    });
  }

  function scare(f, x, y, strength) {
    f.fear = Math.max(f.fear, 0.35 + 0.65 * clamp(strength, 0, 1));
    f.fearX = x;
    f.fearY = y;
  }

  function updateFish(f, dt, now, cursorResting) {
    // Wander: the preferred direction drifts at random and leans back towards level.
    f.wander += (Math.random() - 0.5) * 1.7 * Math.sqrt(dt);
    f.wander -= Math.sin(2 * f.wander) * 0.35 * dt;
    let dx = Math.cos(f.wander);
    let dy = Math.sin(f.wander) * 0.45;
    let targetSpeed = f.baseSpeed;

    // Stay away from the top and bottom edges.
    if (f.y < EDGE_PAD) dy += Math.min(2, (EDGE_PAD - f.y) / EDGE_PAD);
    else if (f.y > height - EDGE_PAD) dy -= Math.min(2, (f.y - (height - EDGE_PAD)) / EDGE_PAD);

    // Keep a little room between neighbours.
    for (let i = 0; i < fish.length; i++) {
      const other = fish[i];
      if (other === f) continue;
      const ox = f.x - other.x;
      const oy = f.y - other.y;
      const room = (f.length + other.length) * 0.6;
      const distSq = ox * ox + oy * oy;
      if (distSq > 0.01 && distSq < room * room) {
        const dist = Math.sqrt(distSq);
        const push = (1 - dist / room) * 1.2;
        dx += (ox / dist) * push;
        dy += (oy / dist) * push;
      }
    }

    // React to the cursor.
    if (pointer.active) {
      const px = f.x - pointer.x;
      const py = f.y - pointer.y;
      const dist = Math.sqrt(px * px + py * py) || 1;
      const reach = FLEE_RADIUS + f.length * 0.5;
      if (dist < PERSONAL_SPACE || (dist < reach && pointer.speed > FLEE_SPEED)) {
        scare(f, pointer.x, pointer.y, 1 - dist / reach);
      } else if (cursorResting && f.curious && f.fear < 0.05 && dist < CURIOUS_RADIUS) {
        // Swim to a ring around the cursor, then circle it slowly.
        const ring = 48 + f.length * 0.8;
        const pull = clamp((dist - ring) / ring, -1, 1) * 2.4;
        const along = (1 - Math.min(1, Math.abs(dist - ring) / ring)) * 0.9 * f.spin;
        dx += (-px / dist) * pull + (-py / dist) * along;
        dy += (-py / dist) * pull + (px / dist) * along;
        targetSpeed *= 0.55 + Math.min(1, Math.abs(dist - ring) / 120);
      }
    }

    // Run from whatever scared the fish, then calm down.
    let agility = 1;
    if (f.fear > 0.01) {
      const ex = f.x - f.fearX;
      const ey = f.y - f.fearY;
      const dist = Math.sqrt(ex * ex + ey * ey) || 1;
      dx += (ex / dist) * 6 * f.fear;
      dy += (ey / dist) * 6 * f.fear;
      targetSpeed *= 1 + 4.5 * f.fear;
      agility = 1 + 5 * f.fear;
      f.wander = Math.atan2(ey * 0.5, ex); // keep going that way afterwards
      f.fear *= Math.exp(-dt * 1.5);
    } else {
      f.fear = 0;
    }

    // Turn round only when the wanted direction is clearly behind the fish.
    const pullLength = Math.sqrt(dx * dx + dy * dy) || 1;
    if (dx * f.dir < -0.25 * pullLength) f.dir = -f.dir;
    const turnStep = 2.6 * agility * dt;
    f.face += clamp(f.dir - f.face, -turnStep, turnStep);

    const maxTilt = f.fear > 0.2 ? 1.2 : 0.6;
    const wantedTilt = clamp(Math.atan2(dy, Math.abs(dx) + 0.0001), -maxTilt, maxTilt);
    f.tilt += (wantedTilt - f.tilt) * Math.min(1, dt * 2.5 * agility);

    // Quick to speed up, slow to settle.
    f.speed += (targetSpeed - f.speed) * Math.min(1, dt * (targetSpeed > f.speed ? 7 : 1.4));
    f.x += f.face * Math.cos(f.tilt) * f.speed * dt;
    f.y += Math.sin(f.tilt) * f.speed * dt;
    f.phase += dt * (2.5 + (9 * f.speed) / f.length);

    // Leave one side, come back on the other.
    const margin = f.length;
    if (f.x > width + margin) f.x = -margin;
    else if (f.x < -margin) f.x = width + margin;
    if (f.y > height + margin * 2) f.y = -margin;
    else if (f.y < -margin * 2) f.y = height + margin;
  }

  // ---- Drawing --------------------------------------------------------------
  function drawFish(f) {
    const margin = f.length * 1.2;
    if (f.x < -margin || f.x > width + margin || f.y < -margin || f.y > height + margin) return;

    const lengthPx = Math.max(8, Math.round(f.length * dpr));
    const sprite = spriteFor(lengthPx);
    const heightPx = sprite.height;
    const padX = Math.ceil(lengthPx * WAVE_X * MAX_EFFORT) + 1;
    const padY = Math.ceil(heightPx * WAVE_Y * MAX_EFFORT) + 1;
    const boxW = padX + lengthPx;
    const boxH = heightPx + padY * 2;

    // Redraw the sprite in thin upright strips. Strips near the tail (left) are
    // squeezed sideways and shifted up and down, so the body ripples as it swims.
    const effort = running ? clamp(0.5 + (0.5 * f.speed) / f.baseSpeed, 0.5, MAX_EFFORT) : 0;
    const swing = WAVE_X * effort * Math.sin(f.phase);
    const strips = Math.max(6, Math.round(lengthPx / 4));
    scratchCtx.clearRect(0, 0, boxW, boxH);
    let left = padX + Math.round(swing * lengthPx);
    for (let i = 0; i < strips; i++) {
      const u0 = i / strips;
      const u1 = (i + 1) / strips;
      const mid = 1 - (u0 + u1) / 2;
      const right = padX + Math.round((u1 + swing * (1 - u1) * (1 - u1)) * lengthPx);
      if (right <= left) continue;
      const lift = WAVE_Y * effort * heightPx * Math.pow(mid, 1.4) * Math.sin(f.phase - 2.4 * (1 - mid) - 0.9);
      scratchCtx.drawImage(sprite, u0 * lengthPx, 0, (u1 - u0) * lengthPx, heightPx, left, padY + lift, right - left, heightPx);
      left = right;
    }

    const face = Math.abs(f.face) < 0.07 ? (f.face < 0 ? -0.07 : 0.07) : f.face;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(face, 1);
    ctx.rotate(f.tilt);
    ctx.globalAlpha = Math.min(1, f.alpha * alphaScale);
    ctx.drawImage(scratch, 0, 0, boxW, boxH, -f.length / 2 - padX / dpr, -boxH / dpr / 2, boxW / dpr, boxH / dpr);
    ctx.restore();
  }

  function drawRipples(now) {
    if (!ripples.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const progress = (now - ripples[i].start) / RIPPLE_MS;
      if (progress >= 1) {
        ripples.splice(i, 1);
        continue;
      }
      const fade = 1 - progress;
      ctx.globalAlpha = Math.min(1, 0.4 * alphaScale) * fade * fade;
      ctx.beginPath();
      ctx.arc(ripples[i].x, ripples[i].y, 10 + 150 * (1 - fade * fade), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < fish.length; i++) drawFish(fish[i]);
    drawRipples(now);
  }

  // ---- Loop -----------------------------------------------------------------
  function frame(now) {
    rafId = window.requestAnimationFrame(frame);
    const elapsed = now - lastFrame;
    if (elapsed < 12) return; // about 60 frames a second at most
    lastFrame = now;
    const dt = Math.min(0.05, elapsed / 1000);
    pointer.speed *= Math.exp(-dt * 5);
    const cursorResting = pointer.active && now - pointer.movedAt > IDLE_MS;
    for (let i = 0; i < fish.length; i++) updateFish(fish[i], dt, now, cursorResting);
    draw(now);
  }

  function start() {
    if (!ready) return;
    window.cancelAnimationFrame(rafId);
    running = !(reducedMotion && reducedMotion.matches) && !document.hidden;
    if (running) {
      lastFrame = window.performance.now();
      rafId = window.requestAnimationFrame(frame);
    } else {
      draw(window.performance.now()); // one still picture
    }
  }

  function resize() {
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextWidth = window.innerWidth;
    const nextHeight = window.innerHeight;
    if (nextDpr === dpr && nextWidth === width && nextHeight === height) return;
    // keep the fish spread over the window when it changes size
    for (let i = 0; i < fish.length; i++) {
      if (width > 0) fish[i].x *= nextWidth / width;
      if (height > 0) fish[i].y *= nextHeight / height;
    }
    const dprChanged = nextDpr !== dpr;
    dpr = nextDpr;
    width = nextWidth;
    height = nextHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!ready) return;
    if (dprChanged) resetSprites(); // sprites depend on the screen's pixel density, not on the window size
    populate();
    draw(window.performance.now()); // resizing wipes the canvas, so repaint straight away
  }

  // ---- Events ---------------------------------------------------------------
  window.addEventListener(
    "pointermove",
    function (event) {
      const now = window.performance.now();
      const moved = Math.sqrt(Math.pow(event.clientX - pointer.x, 2) + Math.pow(event.clientY - pointer.y, 2));
      if (pointer.active && moved < 2) return; // ignore jitter, so a resting hand counts as resting
      if (pointer.active) {
        const gap = clamp(now - pointer.movedAt, 8, 200);
        pointer.speed = pointer.speed * 0.5 + ((moved / gap) * 1000) / 2;
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.movedAt = now;
      pointer.active = true;
    },
    { passive: true }
  );

  function pointerGone() {
    pointer.active = false;
    pointer.speed = 0;
  }
  document.documentElement.addEventListener("mouseleave", pointerGone);
  window.addEventListener("blur", pointerGone);
  window.addEventListener("pointercancel", pointerGone, { passive: true });
  window.addEventListener(
    "pointerup",
    function (event) {
      if (event.pointerType === "touch") pointerGone(); // a lifted finger is not a resting cursor
    },
    { passive: true }
  );

  window.addEventListener(
    "click",
    function (event) {
      if (!running || event.detail === 0) return; // detail 0 = "click" made with the keyboard
      ripples.push({ x: event.clientX, y: event.clientY, start: window.performance.now() });
      if (ripples.length > 6) ripples.shift();
      for (let i = 0; i < fish.length; i++) {
        const f = fish[i];
        const dist = Math.sqrt(Math.pow(f.x - event.clientX, 2) + Math.pow(f.y - event.clientY, 2));
        if (dist < SCATTER_RADIUS) scare(f, event.clientX, event.clientY, 1.2 - dist / SCATTER_RADIUS);
      }
      pointer.movedAt = window.performance.now(); // fish keep their distance for a moment
    },
    { capture: true, passive: true }
  );

  // Fish drift a little as the page scrolls, near ones more than far ones.
  window.addEventListener(
    "scroll",
    function () {
      const top = window.pageYOffset || 0;
      const delta = top - lastScroll;
      lastScroll = top;
      if (!running || Math.abs(delta) > 400) return;
      for (let i = 0; i < fish.length; i++) fish[i].y -= delta * (0.04 + 0.1 * fish[i].depth);
    },
    { passive: true }
  );

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", start);
  if (reducedMotion) {
    if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", start);
    else if (reducedMotion.addListener) reducedMotion.addListener(start);
  }

  // Recolour the fish when the light or dark theme is switched.
  if (window.MutationObserver) {
    new MutationObserver(function () {
      if (!ready || (readColor() === color && readAlphaScale() === alphaScale)) return;
      resetSprites();
      if (!running) draw(window.performance.now());
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
  }

  image.onload = function () {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) ratio = image.naturalHeight / image.naturalWidth;
    ready = true;
    resetSprites();
    populate();
    start();
  };
  resize();
  image.src = spriteUrl;
})();

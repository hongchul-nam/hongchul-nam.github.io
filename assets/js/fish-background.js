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
//
// Play mode (a small button in the bottom-left corner, unless data-game="false"):
//   - the visitor becomes a big fish that follows the cursor, or the last tap
//   - swimming into a smaller fish eats it: the big fish grows and the count goes up
//   - a click or tap gives a short burst of speed
//   - eaten fish come back from the side of the window after a moment
//   - the button again, or the Esc key, ends the game
(function () {
  "use strict";

  const script = document.currentScript;
  const spriteUrl = script ? script.getAttribute("data-sprite") : "";
  if (!spriteUrl || !window.requestAnimationFrame) return;
  const gameEnabled = script.getAttribute("data-game") !== "false";

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

  // Play mode
  const PLAYER_LENGTH = 84; // the visitor's fish at the start of a game, in px
  const PLAYER_MAX_LENGTH = 132; // it stops growing here
  const PLAYER_GROWTH = 3; // px gained per fish eaten
  const PLAYER_SPEED = 300; // px/s
  const PLAYER_ALPHA = 0.85;
  const PLAY_Z_INDEX = "1025"; // above the page content, below the navbar and footer
  const RESPAWN_MS = 1500; // shortest wait before an eaten fish comes back
  const BUBBLE_MS = 900;

  // ---- Canvas ---------------------------------------------------------------
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.id = "fish-background";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;";
  document.body.insertBefore(canvas, document.body.firstChild);

  const style = document.createElement("style");
  style.textContent = [
    "@media print{#fish-background,#fish-play{display:none}}",
    "#fish-play{position:fixed;left:12px;bottom:12px;z-index:1031;display:inline-flex;align-items:center;gap:6px;padding:3px 11px 3px 9px;",
    "border:1px solid var(--global-theme-color);border-radius:999px;background:var(--global-bg-color);color:var(--global-theme-color);",
    "font-size:.75rem;line-height:1.5;cursor:pointer;opacity:.7;transition:opacity .2s}",
    "#fish-play[hidden]{display:none}",
    "#fish-play span{color:inherit}", // the theme colours every span as body text

    "#fish-play:hover,#fish-play:focus-visible,#fish-play[aria-pressed=true]{opacity:1}",
    "#fish-play[aria-pressed=true]{background:var(--global-theme-color);color:var(--global-bg-color)}",
    "#fish-play i{display:inline-block;width:1em;height:1.1em;background:currentColor;",
    "-webkit-mask:var(--fish-sprite) center/contain no-repeat;mask:var(--fish-sprite) center/contain no-repeat}",
  ].join("");
  document.head.appendChild(style);

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
  let bubbles = [];
  let ready = false;
  let running = false;
  let rafId = 0;
  let lastFrame = 0;
  let lastScroll = window.pageYOffset || 0;
  let needsSort = false;

  // Play mode
  let playing = false;
  let player = null; // the visitor's fish while a game is on
  let eaten = 0;
  let button = null;
  let buttonLabel = null;

  const pointer = { x: 0, y: 0, seen: false, active: false, speed: 0, movedAt: 0 };

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

  function sizeScale() {
    return clamp(width / 1100, 0.75, 1); // smaller fish on small screens
  }

  function spriteKey(f) {
    return Math.max(8, Math.round(f.length * dpr));
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
    const longest = Math.ceil(Math.max(MAX_LENGTH, PLAYER_MAX_LENGTH) * dpr);
    scratch.width = longest + Math.ceil(longest * WAVE_X * MAX_EFFORT) + 4;
    scratch.height = Math.ceil(longest * ratio * (1 + 2 * WAVE_Y * MAX_EFFORT)) + 6;
  }

  // ---- Fish -----------------------------------------------------------------
  function makeFish() {
    const depth = Math.random(); // 0 = far away, 1 = close
    const dir = Math.random() < 0.5 ? -1 : 1;
    const baseSpeed = 14 + 22 * depth + Math.random() * 8;
    return {
      x: Math.random() * width,
      y: EDGE_PAD * 0.5 + Math.random() * Math.max(1, height - EDGE_PAD),
      depth: depth,
      length: Math.round((MIN_LENGTH + (MAX_LENGTH - MIN_LENGTH) * depth) * sizeScale()),
      alpha: MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * depth,
      scale: 1,
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
      gone: false, // eaten in play mode, waiting to come back
      backAt: 0,
    };
  }

  function byDepth(a, b) {
    return a.depth - b.depth; // far fish first, so near fish are drawn on top
  }

  function populate() {
    const wanted = clamp(Math.round((width * height) / AREA_PER_FISH), MIN_FISH, MAX_FISH);
    while (fish.length < wanted) fish.push(makeFish());
    if (fish.length > wanted) fish.length = wanted;
    fish.sort(byDepth);
  }

  // An eaten fish returns as a new fish swimming in from the side.
  function comeBack(f) {
    Object.assign(f, makeFish());
    f.x = f.dir > 0 ? -f.length : width + f.length;
    needsSort = true;
  }

  function scare(f, x, y, strength) {
    f.fear = Math.max(f.fear, 0.35 + 0.65 * clamp(strength, 0, 1));
    f.fearX = x;
    f.fearY = y;
  }

  function updateFish(f, dt, now, cursorResting) {
    if (f.gone) {
      if (now >= f.backAt) comeBack(f);
      return;
    }

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
      if (other === f || other.gone) continue;
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

    if (player) {
      // Play mode: the visitor's big fish scares everything near it.
      const px = f.x - player.x;
      const py = f.y - player.y;
      const dist = Math.sqrt(px * px + py * py) || 1;
      const reach = FLEE_RADIUS * 0.8 + player.length * 0.6;
      if (dist < reach) scare(f, player.x, player.y, 1 - dist / reach);
    } else if (pointer.active) {
      // React to the cursor.
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

  // ---- Play mode ------------------------------------------------------------
  function makePlayer() {
    const p = makeFish();
    p.x = pointer.seen ? pointer.x : width / 2;
    p.y = pointer.seen ? pointer.y : height / 2;
    p.targetX = p.x;
    p.targetY = p.y;
    p.vx = 0;
    p.vy = 0;
    p.length = Math.round(PLAYER_LENGTH * sizeScale());
    p.maxLength = Math.round(PLAYER_MAX_LENGTH * sizeScale());
    p.alpha = PLAYER_ALPHA;
    p.baseSpeed = PLAYER_SPEED * 0.4; // sets how hard the tail beats
    p.speed = 0;
    p.boost = 0; // burst of speed after a click
    p.chomp = 0; // short swell after eating
    p.appear = 0; // grows in when the game starts
    p.scale = 0.4;
    return p;
  }

  function updatePlayer(dt) {
    const p = player;
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Head straight for the cursor, slowing down on arrival.
    const wanted = dist < 3 ? 0 : Math.min(PLAYER_SPEED * (1 + 0.9 * p.boost), dist * 5);
    const ease = Math.min(1, dt * 9);
    p.vx += ((dist > 0 ? dx / dist : 0) * wanted - p.vx) * ease;
    p.vy += ((dist > 0 ? dy / dist : 0) * wanted - p.vy) * ease;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

    if (Math.abs(p.vx) > 15) p.dir = p.vx > 0 ? 1 : -1;
    const turnStep = 9 * dt;
    p.face += clamp(p.dir - p.face, -turnStep, turnStep);
    const wantedTilt = p.speed > 10 ? clamp(Math.atan2(p.vy, Math.abs(p.vx) + 0.0001), -0.9, 0.9) : 0;
    p.tilt += (wantedTilt - p.tilt) * Math.min(1, dt * 8);
    p.phase += dt * (2.5 + (9 * p.speed) / p.length);

    p.boost *= Math.exp(-dt * 3);
    p.chomp *= Math.exp(-dt * 7);
    p.appear = Math.min(1, p.appear + dt * 4);
    p.scale = (0.4 + 0.6 * p.appear) * (1 + 0.14 * p.chomp);
  }

  // Any smaller fish that reaches the big fish's mouth is eaten.
  function eatNearbyFish(now) {
    const p = player;
    const side = p.face < 0 ? -1 : 1;
    const mouthX = p.x + side * Math.cos(p.tilt) * p.length * 0.3;
    const mouthY = p.y + Math.sin(p.tilt) * p.length * 0.3 + p.length * 0.08;
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      if (f.gone || f.length >= p.length) continue;
      const dx = f.x - mouthX;
      const dy = f.y - mouthY;
      const bite = p.length * 0.27 + f.length * 0.3;
      if (dx * dx + dy * dy > bite * bite) continue;

      f.gone = true;
      f.backAt = now + RESPAWN_MS + Math.random() * 2500;
      eaten++;
      p.chomp = 1;
      if (p.length < p.maxLength) {
        delete sprites[spriteKey(p)]; // the old size is not needed again
        p.length = Math.min(p.maxLength, p.length + PLAYER_GROWTH);
      }
      ripples.push({ x: mouthX, y: mouthY, start: now, reach: 34 });
      for (let b = 0; b < 4; b++) {
        bubbles.push({
          x: mouthX + (Math.random() - 0.5) * 14,
          y: mouthY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 34,
          vy: -(24 + Math.random() * 34),
          radius: 1.5 + Math.random() * 2.5,
          start: now,
        });
      }
      refreshButton();
    }
  }

  function setPlaying(on) {
    if (on === playing) return;
    if (on && (!ready || !running)) return;
    playing = on;
    canvas.style.zIndex = on ? PLAY_Z_INDEX : "-1";
    if (on) {
      eaten = 0;
      player = makePlayer();
    } else {
      delete sprites[spriteKey(player)];
      player = null;
    }
    refreshButton();
  }

  function refreshButton() {
    if (!button) return;
    button.hidden = !!(reducedMotion && reducedMotion.matches); // the game needs motion
    button.setAttribute("aria-pressed", playing ? "true" : "false");
    buttonLabel.textContent = playing ? "eaten: " + eaten + " · exit" : "be the big fish";
    // sit just above the footer when the footer is pinned to the bottom of the window
    const footer = document.querySelector("footer.fixed-bottom");
    button.style.bottom = (footer ? footer.offsetHeight : 0) + 12 + "px";
  }

  function buildButton() {
    button = document.createElement("button");
    button.id = "fish-play";
    button.type = "button";
    button.title = "Steer a big fish with your cursor and eat the smaller ones. Click for a burst of speed. Press Esc to stop.";
    button.style.setProperty("--fish-sprite", "url('" + spriteUrl + "')");
    const icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);
    buttonLabel = document.createElement("span");
    button.appendChild(buttonLabel);
    button.addEventListener("click", function () {
      setPlaying(!playing);
    });
    document.body.appendChild(button);
    refreshButton();
  }

  // ---- Drawing --------------------------------------------------------------
  function drawFish(f) {
    if (f.gone) return;
    const margin = f.length * 1.2;
    if (f.x < -margin || f.x > width + margin || f.y < -margin || f.y > height + margin) return;

    const lengthPx = spriteKey(f);
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
    ctx.scale(face * f.scale, f.scale);
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
      ctx.arc(ripples[i].x, ripples[i].y, 10 + ripples[i].reach * (1 - fade * fade), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBubbles(now) {
    if (!bubbles.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const bubble = bubbles[i];
      const age = (now - bubble.start) / 1000;
      const progress = (age * 1000) / BUBBLE_MS;
      if (progress >= 1) {
        bubbles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.min(1, 0.7 * alphaScale) * (1 - progress);
      ctx.beginPath();
      ctx.arc(bubble.x + bubble.vx * age, bubble.y + bubble.vy * age, bubble.radius * (1 + 0.6 * progress), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < fish.length; i++) drawFish(fish[i]);
    if (player) drawFish(player);
    drawRipples(now);
    drawBubbles(now);
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
    if (needsSort) {
      fish.sort(byDepth);
      needsSort = false;
    }
    if (player) {
      updatePlayer(dt);
      eatNearbyFish(now);
    }
    draw(now);
  }

  function start() {
    if (!ready) return;
    window.cancelAnimationFrame(rafId);
    const stillOnly = !!(reducedMotion && reducedMotion.matches);
    if (stillOnly && playing) setPlaying(false);
    running = !stillOnly && !document.hidden;
    refreshButton();
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
    refreshButton();
    draw(window.performance.now()); // resizing wipes the canvas, so repaint straight away
  }

  // ---- Events ---------------------------------------------------------------
  function steerPlayer(event) {
    pointer.seen = true;
    if (!player) return;
    player.targetX = event.clientX;
    player.targetY = event.clientY;
  }

  window.addEventListener(
    "pointermove",
    function (event) {
      steerPlayer(event);
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

  // A tap may not send a move first, so steer on press as well.
  window.addEventListener(
    "pointerdown",
    function (event) {
      if (!pointer.active) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      }
      steerPlayer(event);
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
      if (button && event.target instanceof Node && button.contains(event.target)) return; // the button handles its own clicks
      if (player) {
        // Play mode: lunge towards the click.
        steerPlayer(event);
        player.boost = 1;
        return;
      }
      ripples.push({ x: event.clientX, y: event.clientY, start: window.performance.now(), reach: 150 });
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

  window.addEventListener("keydown", function (event) {
    if (playing && event.key === "Escape") setPlaying(false);
  });

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
    if (gameEnabled) buildButton();
    start();
  };
  resize();
  image.src = spriteUrl;
})();

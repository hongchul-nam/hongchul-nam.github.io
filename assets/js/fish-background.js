// Fish swimming in the page background.
//
// The fish picture comes from the `data-sprite` attribute of the script tag
// (see _includes/scripts/fish.liquid), so it can be swapped without touching this file.
// The picture must face right. It is recoloured to match the current theme.
//
// When the picture is an SVG with the layers fish-body, fish-outline, fish-eye and
// fish-mouth (like assets/img/fish.svg), every fish gets its own face: a different
// head shape, plus one of the eyes and one of the mouths found in the file (the
// originals, or any extra ones with ids like fish-eye-ring or fish-mouth-smile),
// each resized, turned and moved a little, and often one of the hair styles
// (ids like fish-hair-tuft). Any other picture still works, but then all fish look
// the same.
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
//
// Surprises (unless data-surprises="false"):
//   - a few rocks sit in the water; a fish that swims into one bounces off it
//   - now and then a gust of current blows every fish the same way for a few seconds
//   - now and then a whirlpool crosses the window, spins the fish it catches and throws them clear
(function () {
  "use strict";

  const script = document.currentScript;
  const spriteUrl = script ? script.getAttribute("data-sprite") : "";
  if (!spriteUrl || !window.requestAnimationFrame) return;
  const gameEnabled = script.getAttribute("data-game") !== "false";
  const surprises = script.getAttribute("data-surprises") !== "false";

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

  // How much one fish's face may differ from the original drawing.
  // Each fish also gets one of the eyes and one of the mouths in the picture file.
  const LOOK_TALL = 0.14; // taller or longer head, as a share of its height
  const LOOK_SNOUT = 0.11; // nose pushed out or pulled in, as a share of body length
  const LOOK_SLANT = 0.12; // how far the back line leans
  const LOOK_BROW = 0.08; // higher or flatter forehead
  const LOOK_BELLY = 0.1; // deeper or shallower chin
  const LOOK_EYE_SIZE = 0.35;
  const LOOK_EYE_TURN = 0.4; // radians
  const LOOK_EYE_SHIFT = 0.045;
  const LOOK_MOUTH_SIZE = 0.32;
  const LOOK_MOUTH_TURN = 0.3; // radians: tilts the mouth up or down
  const LOOK_MOUTH_SHIFT = 0.04;
  const LOOK_BALD = 0.2; // share of fish with no hair
  const LOOK_HAIR_SIZE = 0.22;
  const LOOK_HAIR_TURN = 0.12; // radians
  // the drawing as it is; used for the visitor's fish in play mode
  const PLAIN_LOOK = {
    tall: 1,
    snout: 0,
    slant: 0,
    brow: 0,
    belly: 0,
    eyePick: 0, // 0 picks the first eye and mouth in the file: the original ones
    eyeSize: 1,
    eyeTurn: 0,
    eyeX: 0,
    eyeY: 0,
    mouthPick: 0,
    mouthSize: 1,
    mouthTurn: 0,
    mouthY: 0,
    hairPick: -1, // below 0 means no hair, like the original
    hairSize: 1,
    hairTurn: 0,
  };

  // Play mode
  const PLAYER_LENGTH = 84; // the visitor's fish at the start of a game, in px
  const PLAYER_MAX_LENGTH = 132; // it stops growing here
  const PLAYER_GROWTH = 3; // px gained per fish eaten
  const PLAYER_SPEED = 300; // px/s
  const PLAYER_ALPHA = 0.85;
  const PLAY_Z_INDEX = "1025"; // above the page content, below the navbar and footer
  const RESPAWN_MS = 1500; // shortest wait before an eaten fish comes back
  const BUBBLE_MS = 900;

  // Surprises
  const AREA_PER_ROCK = 420000; // one rock per this many square px of window
  const MIN_ROCKS = 1;
  const MAX_ROCKS = 4;
  const ROCK_MIN = 26; // rock size, in px
  const ROCK_MAX = 50;
  const ROCK_ALPHA = 0.3;
  const SPARK_MS = 360; // how long the little mark of a bump stays
  const PUSH_FADE = 2.6; // how fast a knock or a throw wears off, per second
  const EVENT_FIRST_MS = 6000; // earliest gust or whirlpool after the page opens (up to twice as long)
  const EVENT_GAP_MS = 16000; // shortest quiet spell between two of them (up to twice as long)
  const GUST_SHARE = 0.55; // how many of them are gusts; the rest are whirlpools
  const GUST_SPEED = 170; // px/s at the peak of a gust
  const GUST_MS = 4200;
  const TWISTER_RADIUS = 200; // reach of a whirlpool, in px
  const TWISTER_MS = 8000; // time it takes to cross the window
  const TWISTER_SPIN = 380; // px/s near its middle

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
  let shapes = null; // the picture's layers, when it has them
  let spriteEpoch = 0; // goes up when the colour or pixel density changes, so sprites are redrawn
  let fish = [];
  let ripples = [];
  let bubbles = [];
  let ready = false;
  let running = false;
  let rafId = 0;
  let lastFrame = 0;
  let lastScroll = window.pageYOffset || 0;
  let needsSort = false;

  // Surprises
  let rocks = [];
  let sparks = [];
  let gust = null; // the current blowing right now, if any
  let twister = null; // the whirlpool crossing right now, if any
  let nextEventAt = 0;
  const drift = { x: 0, y: 0 }; // how fast the gust and the whirlpool move the fish being updated

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

  function spread(amount) {
    return (Math.random() * 2 - 1) * amount;
  }

  // ---- Shapes ---------------------------------------------------------------
  // Reads one SVG path made of absolute M, L, C and Z commands into a list of
  // [letter, numbers...] steps, with coordinates as shares of the picture's size.
  function readPath(d, box) {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
    const steps = [];
    let letter = "";
    let i = 0;
    while (i < tokens.length) {
      if (/[a-zA-Z]/.test(tokens[i])) {
        letter = tokens[i];
        if ("MLCZ".indexOf(letter) < 0) return null; // only absolute commands are understood
        if (letter === "Z") steps.push(["Z"]);
        i++;
        continue;
      }
      const count = letter === "C" ? 6 : 2;
      if (!letter || letter === "Z" || i + count > tokens.length) return null;
      const step = [letter];
      for (let k = 0; k < count; k++) {
        const value = parseFloat(tokens[i + k]);
        step.push(k % 2 === 0 ? (value - box[0]) / box[2] : (value - box[1]) / box[3]);
      }
      steps.push(step);
      i += count;
      if (letter === "M") letter = "L"; // more pairs after a move are lines
    }
    return steps.length ? steps : null;
  }

  function boundsOf(steps, change) {
    const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (let i = 0; i < steps.length; i++) {
      for (let k = 1; k < steps[i].length; k += 2) {
        const point = change ? change(steps[i][k], steps[i][k + 1]) : [steps[i][k], steps[i][k + 1]];
        box.minX = Math.min(box.minX, point[0]);
        box.maxX = Math.max(box.maxX, point[0]);
        box.minY = Math.min(box.minY, point[1]);
        box.maxY = Math.max(box.maxY, point[1]);
      }
    }
    return box;
  }

  // Returns the picture's layers, or null when it is not built the way this script expects.
  function readShapes(text) {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const box = (doc.documentElement.getAttribute("viewBox") || "")
      .trim()
      .split(/[\s,]+/)
      .map(parseFloat);
    if (box.length !== 4 || !(box[2] > 0) || !(box[3] > 0)) return null;
    const body = doc.querySelector('[id="fish-body"]');
    const outline = doc.querySelector('[id="fish-outline"]');
    const found = {
      ratio: box[3] / box[2],
      bodyAlpha: body && parseFloat(body.getAttribute("fill-opacity")) > 0 ? parseFloat(body.getAttribute("fill-opacity")) : 0.18,
      body: body ? readPath(body.getAttribute("d") || "", box) : null,
      outline: outline ? readPath(outline.getAttribute("d") || "", box) : null,
      eyes: readParts(doc, "eye", box, false),
      mouths: readParts(doc, "mouth", box, true),
      hairs: readParts(doc, "hair", box, false), // optional: the original drawing has none
      edgeSlope: 0,
    };
    if (!found.body || !found.outline || !found.eyes.length || !found.mouths.length) return null;
    // How the edge of the face runs near the mouth, so a mouth moved up or down stays on the edge.
    const upper = edgeAt(found.outline, found.mouths[0].pivotY - 0.06);
    const lower = edgeAt(found.outline, found.mouths[0].pivotY + 0.06);
    if (isFinite(upper) && isFinite(lower)) found.edgeSlope = (lower - upper) / 0.12;
    return found;
  }

  // Reads every eye, mouth or hair style in the file: the original (id "fish-eye") first when there is one,
  // then the extras ("fish-eye-..."). Each is a list of paths: filled, or drawn as a line when the path has a stroke-width.
  function readParts(doc, name, box, hangsFromEdge) {
    const nodes = [doc.querySelector('[id="fish-' + name + '"]')];
    const extras = doc.querySelectorAll('[id^="fish-' + name + '-"]');
    for (let i = 0; i < extras.length; i++) nodes.push(extras[i]);
    const parts = [];
    for (let n = 0; n < nodes.length; n++) {
      const node = nodes[n];
      const paths = !node ? [] : node.localName === "path" ? [node] : node.querySelectorAll("path");
      const items = [];
      let every = [];
      for (let p = 0; p < paths.length; p++) {
        const steps = readPath(paths[p].getAttribute("d") || "", box);
        if (!steps) {
          items.length = 0;
          break;
        }
        items.push({ steps: steps, line: (parseFloat(paths[p].getAttribute("stroke-width")) || 0) / box[2] });
        every = every.concat(steps);
      }
      if (!items.length) continue; // a missing or broken one is left out
      // The point this part turns and grows around: an eye its centre, a mouth where it meets the face, hair its root.
      const pivot = (node.getAttribute("data-pivot") || "")
        .trim()
        .split(/[\s,]+/)
        .map(parseFloat);
      const given = pivot.length === 2 && isFinite(pivot[0]) && isFinite(pivot[1]);
      const reach = boundsOf(every);
      parts.push({
        items: items,
        pivotX: given ? (pivot[0] - box[0]) / box[2] : hangsFromEdge ? reach.maxX : (reach.minX + reach.maxX) / 2,
        pivotY: given ? (pivot[1] - box[1]) / box[3] : (reach.minY + reach.maxY) / 2,
      });
    }
    return parts;
  }

  // The farthest point of the outline towards the nose, at height v.
  function edgeAt(steps, v) {
    let edge = -Infinity;
    for (let i = 0; i < steps.length; i++) {
      for (let k = 1; k < steps[i].length; k += 2) {
        if (Math.abs(steps[i][k + 1] - v) < 0.03 && steps[i][k] > edge) edge = steps[i][k];
      }
    }
    return edge;
  }

  // ---- Looks ----------------------------------------------------------------
  function makeLook() {
    return {
      tall: 1 + spread(LOOK_TALL),
      snout: spread(LOOK_SNOUT),
      slant: spread(LOOK_SLANT),
      brow: spread(LOOK_BROW),
      belly: spread(LOOK_BELLY),
      eyePick: Math.random(), // which of the eyes in the file
      eyeSize: 1 + spread(LOOK_EYE_SIZE),
      eyeTurn: spread(LOOK_EYE_TURN),
      eyeX: spread(LOOK_EYE_SHIFT),
      eyeY: spread(LOOK_EYE_SHIFT),
      mouthPick: Math.random(), // which of the mouths in the file
      mouthSize: 1 + spread(LOOK_MOUTH_SIZE),
      mouthTurn: spread(LOOK_MOUTH_TURN),
      mouthY: spread(LOOK_MOUTH_SHIFT),
      hairPick: Math.random() < LOOK_BALD ? -1 : Math.random(), // which hair style, or none
      hairSize: 1 + spread(LOOK_HAIR_SIZE),
      hairTurn: spread(LOOK_HAIR_TURN),
    };
  }

  function pick(parts, share) {
    return parts[Math.min(parts.length - 1, Math.floor(share * parts.length))];
  }

  // Bends the whole head into one fish's shape. u runs from the back (0) to the nose (1), v from top (0) to bottom (1).
  function bend(look, u, v) {
    const along = Math.sin(Math.PI * clamp(u, 0, 1));
    return [
      u + look.snout * u * u * Math.sin(Math.PI * clamp(v, 0, 1)) + look.slant * (1 - u) * (1 - u) * (2 * v - 1),
      v + look.brow * along * (1 - v) * (1 - v) + look.belly * along * v * v,
    ];
  }

  // Turns, resizes and shifts a point around a fixed point; `aspect` keeps the turn round on a non-square picture.
  function turnAbout(u, v, pivotU, pivotV, size, turn, shiftU, shiftV, aspect) {
    const dx = u - pivotU;
    const dy = (v - pivotV) * aspect;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    return [pivotU + shiftU + (dx * cos - dy * sin) * size, pivotV + shiftV + ((dx * sin + dy * cos) * size) / aspect];
  }

  // ---- Sprites --------------------------------------------------------------
  // Draws one fish's face from the layers, straight from the shapes so every size stays sharp.
  function drawLook(look, lengthPx) {
    const headHeightPx = Math.max(1, Math.round(lengthPx * ratio * look.tall));
    const aspect = headHeightPx / lengthPx;
    const shape = function (u, v) {
      return bend(look, u, v);
    };
    const eye = pick(shapes.eyes, look.eyePick);
    const mouth = pick(shapes.mouths, look.mouthPick);
    const hair = look.hairPick >= 0 && shapes.hairs.length ? pick(shapes.hairs, look.hairPick) : null;
    const moveEye = function (u, v) {
      return turnAbout(u, v, eye.pivotX, eye.pivotY, look.eyeSize, look.eyeTurn, look.eyeX, look.eyeY, aspect);
    };
    const moveMouth = function (u, v) {
      // moved up or down, the mouth slides along the edge of the face
      return turnAbout(u, v, mouth.pivotX, mouth.pivotY, look.mouthSize, look.mouthTurn, look.mouthY * shapes.edgeSlope, look.mouthY, aspect);
    };
    const moveHair = function (u, v) {
      return turnAbout(u, v, hair.pivotX, hair.pivotY, look.hairSize, look.hairTurn, 0, 0, aspect);
    };

    // The bent head always fills the fish's own size. Hair may reach beyond the head, so the sprite grows to hold it.
    const head = boundsOf(shapes.outline, shape);
    const scaleX = (lengthPx - 2) / (head.maxX - head.minX);
    const scaleY = (headHeightPx - 2) / (head.maxY - head.minY);
    const fit = { minX: head.minX, minY: head.minY, maxX: head.maxX, maxY: head.maxY };
    let pad = 1;
    if (hair) {
      const hairShape = function (u, v) {
        const moved = moveHair(u, v);
        return shape(moved[0], moved[1]);
      };
      for (let i = 0; i < hair.items.length; i++) {
        const reach = boundsOf(hair.items[i].steps, hairShape);
        fit.minX = Math.min(fit.minX, reach.minX);
        fit.minY = Math.min(fit.minY, reach.minY);
        fit.maxX = Math.max(fit.maxX, reach.maxX);
        fit.maxY = Math.max(fit.maxY, reach.maxY);
        pad = Math.max(pad, 1 + Math.ceil((hair.items[i].line * scaleX) / 2));
      }
    }
    const sprite = document.createElement("canvas");
    sprite.width = Math.ceil((fit.maxX - fit.minX) * scaleX) + 2 * pad;
    sprite.height = Math.ceil((fit.maxY - fit.minY) * scaleY) + 2 * pad;
    const sctx = sprite.getContext("2d");

    function trace(steps, move) {
      sctx.beginPath();
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step[0] === "Z") {
          sctx.closePath();
          continue;
        }
        const xy = [];
        for (let k = 1; k < step.length; k += 2) {
          const moved = move ? move(step[k], step[k + 1]) : [step[k], step[k + 1]];
          const bent = shape(moved[0], moved[1]);
          xy.push(pad + (bent[0] - fit.minX) * scaleX, pad + (bent[1] - fit.minY) * scaleY);
        }
        if (step[0] === "M") sctx.moveTo(xy[0], xy[1]);
        else if (step[0] === "L") sctx.lineTo(xy[0], xy[1]);
        else sctx.bezierCurveTo(xy[0], xy[1], xy[2], xy[3], xy[4], xy[5]);
      }
    }

    // An eye, a mouth or hair: each of its paths is filled, or drawn as a line of the marker's width.
    function paint(part, move) {
      for (let i = 0; i < part.items.length; i++) {
        trace(part.items[i].steps, move);
        if (part.items[i].line > 0) {
          sctx.lineWidth = Math.max(0.75, part.items[i].line * scaleX);
          sctx.stroke();
        } else {
          sctx.fill();
        }
      }
    }

    sctx.fillStyle = color;
    sctx.strokeStyle = color;
    sctx.lineCap = "round";
    sctx.lineJoin = "round";
    sctx.globalAlpha = shapes.bodyAlpha;
    trace(shapes.body, null);
    sctx.fill();
    sctx.globalAlpha = 1;
    trace(shapes.outline, null);
    sctx.fill();
    if (hair) paint(hair, moveHair);
    paint(eye, moveEye);
    paint(mouth, moveMouth);
    return sprite;
  }

  // Fallback for a picture without layers: one recoloured copy of it.
  function tintPicture(lengthPx) {
    const sprite = document.createElement("canvas");
    sprite.width = lengthPx;
    sprite.height = Math.max(1, Math.round(lengthPx * ratio));
    const sctx = sprite.getContext("2d");
    sctx.drawImage(image, 0, 0, sprite.width, sprite.height);
    sctx.globalCompositeOperation = "source-in";
    sctx.fillStyle = color;
    sctx.fillRect(0, 0, sprite.width, sprite.height);
    return sprite;
  }

  // Each fish keeps its own sprite, redrawn only when its size, the colour or the pixel density changes.
  function spriteOf(f) {
    const lengthPx = Math.max(8, Math.round(f.length * dpr));
    if (!f.sprite || f.spritePx !== lengthPx || f.spriteEpoch !== spriteEpoch) {
      f.sprite = shapes ? drawLook(f.look, lengthPx) : tintPicture(lengthPx);
      f.spritePx = lengthPx;
      f.spriteEpoch = spriteEpoch;
    }
    return f.sprite;
  }

  function resetSprites() {
    spriteEpoch++;
    color = readColor();
    alphaScale = readAlphaScale();
    const longest = Math.ceil(Math.max(MAX_LENGTH, PLAYER_MAX_LENGTH) * dpr);
    scratch.width = longest + Math.ceil(longest * WAVE_X * MAX_EFFORT) + 4;
    scratch.height = Math.ceil(longest * ratio * (1 + LOOK_TALL) * (1 + 2 * WAVE_Y * MAX_EFFORT)) + 8;
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
      look: makeLook(), // this fish's own face
      sprite: null,
      spritePx: 0,
      spriteEpoch: -1,
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
      pushX: 0, // speed left over from a knock or a throw; it fades
      pushY: 0,
      heldX: 0, // how fast a whirlpool is carrying this fish
      heldY: 0,
      tumble: 0, // spin picked up in a whirlpool, in radians
      bumpedAt: 0,
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
    placeRocks();
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
    // Its own swimming, plus what is left of a knock, plus the gust and the whirlpool.
    drifting(f, dt, 1);
    const vx = f.face * Math.cos(f.tilt) * f.speed + f.pushX + drift.x;
    const vy = Math.sin(f.tilt) * f.speed + f.pushY + drift.y;
    f.x += vx * dt;
    f.y += vy * dt;
    const fade = Math.exp(-dt * PUSH_FADE);
    f.pushX *= fade;
    f.pushY *= fade;
    f.phase += dt * (2.5 + (9 * f.speed) / f.length);

    const touch = rocks.length ? touchRock(f) : null;
    if (touch && vx * touch.nx + vy * touch.ny < -6 && now - f.bumpedAt > 300) bounce(f, vx, vy, touch, now);

    // Leave one side, come back on the other.
    const margin = f.length;
    if (f.x > width + margin) f.x = -margin;
    else if (f.x < -margin) f.x = width + margin;
    if (f.y > height + margin * 2) f.y = -margin;
    else if (f.y < -margin * 2) f.y = height + margin;
  }

  // ---- Surprises: rocks ------------------------------------------------------
  function makeRock() {
    const size = (ROCK_MIN + Math.random() * (ROCK_MAX - ROCK_MIN)) * sizeScale();
    const corners = 6 + Math.floor(Math.random() * 3);
    const outline = [];
    for (let i = 0; i < corners; i++) outline.push({ angle: ((i + spread(0.28)) * TAU) / corners, reach: 0.78 + Math.random() * 0.36 });
    return {
      x: 60 + Math.random() * Math.max(1, width - 120),
      y: 90 + Math.random() * Math.max(1, height - 200),
      rx: size,
      ry: size * (0.66 + Math.random() * 0.22),
      outline: outline, // an uneven shape, as corners around the middle
      crack: Math.random() * TAU, // nudges the point where its inner edges meet
      facet: Math.floor(Math.random() * corners), // which corners those edges run to
    };
  }

  function placeRocks() {
    const wanted = surprises ? clamp(Math.round((width * height) / AREA_PER_ROCK), MIN_ROCKS, MAX_ROCKS) : 0;
    if (rocks.length > wanted) rocks.length = wanted;
    for (let tries = 0; rocks.length < wanted && tries < 80; tries++) {
      const rock = makeRock();
      let clear = true; // not on top of another rock
      for (let i = 0; i < rocks.length; i++) {
        const gap = Math.sqrt(Math.pow(rock.x - rocks[i].x, 2) + Math.pow(rock.y - rocks[i].y, 2));
        if (gap < (rock.rx + rocks[i].rx) * 2.4) clear = false;
      }
      if (clear) rocks.push(rock);
    }
  }

  // Moves a fish back out of any rock it overlaps. Returns where it touched and which way the rock faces there, or null.
  function touchRock(f) {
    const body = f.length * 0.4;
    for (let i = 0; i < rocks.length; i++) {
      const rock = rocks[i];
      const a = rock.rx * 0.95 + body;
      const b = rock.ry * 0.95 + body;
      const dx = f.x - rock.x;
      const dy = f.y - rock.y;
      const depth = Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b));
      if (depth >= 1 || depth === 0) continue;
      f.x = rock.x + dx / depth;
      f.y = rock.y + dy / depth;
      let nx = dx / (a * a);
      let ny = dy / (b * b);
      const size = Math.sqrt(nx * nx + ny * ny) || 1;
      nx /= size;
      ny /= size;
      return { nx: nx, ny: ny, x: f.x - nx * body, y: f.y - ny * body };
    }
    return null;
  }

  // Bounces a fish off a rock the way a ball would, and leaves a little mark where it hit.
  function bounce(f, vx, vy, touch, now) {
    const into = vx * touch.nx + vy * touch.ny;
    const outX = vx - 2 * into * touch.nx;
    const outY = vy - 2 * into * touch.ny;
    const speed = Math.sqrt(outX * outX + outY * outY) || 1;
    const kick = clamp(speed * 1.2, 60, 260);
    f.pushX = (outX / speed) * kick;
    f.pushY = (outY / speed) * kick;
    f.wander = Math.atan2(outY * 0.5, outX); // carry on in the new direction
    const dir = outX >= 0 ? 1 : -1;
    if (dir !== f.dir) {
      f.dir = dir;
      f.face = dir * 0.3; // spun round by the knock
    }
    f.tilt = clamp(Math.atan2(outY, Math.abs(outX) + 0.0001), -1, 1);
    f.fear = 0;
    f.bumpedAt = now;
    sparks.push({ x: touch.x, y: touch.y, angle: Math.atan2(touch.ny, touch.nx), start: now });
  }

  // ---- Surprises: gusts and whirlpools ---------------------------------------
  function startGust(now) {
    const angle = (Math.random() < 0.5 ? 0 : Math.PI) + spread(0.4); // mostly sideways
    const speed = GUST_SPEED * (0.8 + Math.random() * 0.45);
    gust = { start: now, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, power: 0, streaks: [] };
    const count = clamp(Math.round((width * height) / 45000), 10, 34);
    for (let i = 0; i < count; i++) {
      gust.streaks.push({ x: Math.random() * width, y: Math.random() * height, length: 28 + Math.random() * 70, pace: 1.6 + Math.random() * 1.6 });
    }
  }

  function startTwister(now) {
    const fromLeft = Math.random() < 0.5;
    const radius = TWISTER_RADIUS * sizeScale();
    const baseY = height * (0.25 + Math.random() * 0.5);
    const sway = Math.random() * TAU;
    twister = {
      start: now,
      radius: radius,
      turn: Math.random() < 0.5 ? -1 : 1, // which way it spins
      power: 0,
      x: fromLeft ? -radius * 0.4 : width + radius * 0.4,
      y: baseY + Math.sin(sway) * 45,
      baseY: baseY,
      sway: sway,
      vx: ((fromLeft ? 1 : -1) * (width + radius * 0.8)) / (TWISTER_MS / 1000),
      vy: 0,
    };
  }

  function updateSurprises(dt, now) {
    if (gust) {
      const age = (now - gust.start) / GUST_MS;
      if (age >= 1) {
        gust = null;
        nextEventAt = now + EVENT_GAP_MS * (1 + Math.random());
      } else {
        gust.power = Math.pow(Math.sin(Math.PI * age), 2); // swells, then dies down
        for (let i = 0; i < gust.streaks.length; i++) {
          const streak = gust.streaks[i];
          streak.x += gust.vx * streak.pace * (0.25 + gust.power) * dt;
          streak.y += gust.vy * streak.pace * (0.25 + gust.power) * dt;
          if (streak.x > width + 90) streak.x = -90;
          else if (streak.x < -90) streak.x = width + 90;
          if (streak.y > height + 90) streak.y = -90;
          else if (streak.y < -90) streak.y = height + 90;
        }
      }
    }
    if (twister) {
      const age = now - twister.start;
      if (age >= TWISTER_MS) {
        twister = null;
        nextEventAt = now + EVENT_GAP_MS * (1 + Math.random());
      } else {
        twister.power = Math.min(1, age / 700, (TWISTER_MS - age) / 900);
        const y = twister.baseY + Math.sin(twister.sway + age * 0.0012) * 45;
        twister.vy = (y - twister.y) / Math.max(dt, 0.001);
        twister.x += twister.vx * dt;
        twister.y = y;
      }
    }
    if (surprises && !gust && !twister && now >= nextEventAt) {
      if (Math.random() < GUST_SHARE) startGust(now);
      else startTwister(now);
    }
  }

  // Works out how fast the gust and the whirlpool move one fish right now, into `drift`.
  // A fish inside a whirlpool also starts to tumble; once out, it is thrown clear and steadies itself.
  function drifting(f, dt, share) {
    drift.x = 0;
    drift.y = 0;
    if (gust) {
      drift.x += gust.vx * gust.power * share;
      drift.y += gust.vy * gust.power * share;
    }
    let held = false;
    if (twister) {
      const dx = f.x - twister.x;
      const dy = f.y - twister.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < twister.radius) {
        const pull = (1 - dist / twister.radius) * twister.power * share;
        const inwards = dist > 30 ? 70 : 0;
        // round and round, slowly inwards, and along with the whirlpool itself
        f.heldX = ((-dy / dist) * twister.turn * TWISTER_SPIN - (dx / dist) * inwards + twister.vx) * pull;
        f.heldY = ((dx / dist) * twister.turn * TWISTER_SPIN - (dy / dist) * inwards + twister.vy) * pull;
        drift.x += f.heldX;
        drift.y += f.heldY;
        f.tumble += twister.turn * (1 + 5 * pull) * dt;
        held = true;
      }
    }
    if (!held) {
      if (f.heldX || f.heldY) {
        f.pushX += f.heldX * 0.8;
        f.pushY += f.heldY * 0.8;
        f.heldX = 0;
        f.heldY = 0;
      }
      if (f.tumble) {
        f.tumble = Math.atan2(Math.sin(f.tumble), Math.cos(f.tumble)) * Math.exp(-dt * 3.5);
        if (Math.abs(f.tumble) < 0.01) f.tumble = 0;
      }
    }
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
    p.look = PLAIN_LOOK; // the visitor plays as the original drawing
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

  function updatePlayer(dt, now) {
    const p = player;
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Head straight for the cursor, slowing down on arrival.
    const wanted = dist < 3 ? 0 : Math.min(PLAYER_SPEED * (1 + 0.9 * p.boost), dist * 5);
    const ease = Math.min(1, dt * 9);
    p.vx += ((dist > 0 ? dx / dist : 0) * wanted - p.vx) * ease;
    p.vy += ((dist > 0 ? dy / dist : 0) * wanted - p.vy) * ease;
    // Gusts and whirlpools tug at the big fish too, though less; rocks block its way.
    drifting(p, dt, 0.55);
    p.x += (p.vx + p.pushX + drift.x) * dt;
    p.y += (p.vy + p.pushY + drift.y) * dt;
    const fade = Math.exp(-dt * PUSH_FADE);
    p.pushX *= fade;
    p.pushY *= fade;
    const touch = rocks.length ? touchRock(p) : null;
    if (touch && p.vx * touch.nx + p.vy * touch.ny < -90 && now - p.bumpedAt > 400) {
      p.bumpedAt = now;
      sparks.push({ x: touch.x, y: touch.y, angle: Math.atan2(touch.ny, touch.nx), start: now });
    }
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
      p.length = Math.min(p.maxLength, p.length + PLAYER_GROWTH);
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

    const sprite = spriteOf(f);
    const lengthPx = sprite.width;
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
    if (scratch.width < boxW) scratch.width = boxW; // a sprite with long hair can be bigger than planned
    if (scratch.height < boxH) scratch.height = boxH;
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
    ctx.rotate(f.tilt + f.tumble);
    ctx.globalAlpha = Math.min(1, f.alpha * alphaScale);
    ctx.drawImage(scratch, 0, 0, boxW, boxH, -(lengthPx / dpr) / 2 - padX / dpr, -boxH / dpr / 2, boxW / dpr, boxH / dpr);
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

  function drawRocks() {
    if (!rocks.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (let i = 0; i < rocks.length; i++) {
      const rock = rocks[i];
      const count = rock.outline.length;
      const corner = function (index) {
        const c = rock.outline[(index + count) % count];
        return [rock.x + Math.cos(c.angle) * rock.rx * c.reach, rock.y + Math.sin(c.angle) * rock.ry * c.reach];
      };
      // an angular outline, corner to corner, so it reads as a boulder and not as a fish
      ctx.beginPath();
      for (let k = 0; k < count; k++) {
        const point = corner(k);
        if (k === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      }
      ctx.closePath();
      ctx.globalAlpha = Math.min(1, 0.07 * alphaScale);
      ctx.fill();
      ctx.globalAlpha = Math.min(1, ROCK_ALPHA * alphaScale);
      ctx.stroke();
      // three edges that meet at a point inside, like the faces of a cut stone
      const peak = [rock.x + Math.cos(rock.crack) * rock.rx * 0.22, rock.y - rock.ry * 0.18 + Math.sin(rock.crack) * rock.ry * 0.12];
      ctx.globalAlpha = Math.min(1, ROCK_ALPHA * 0.6 * alphaScale);
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const point = corner(rock.facet + Math.round((k * count) / 3));
        ctx.moveTo(peak[0], peak[1]);
        ctx.lineTo(point[0], point[1]);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSurprises(now) {
    if (!gust && !twister && !sparks.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    if (gust) {
      // streaks that run with the current
      const speed = Math.sqrt(gust.vx * gust.vx + gust.vy * gust.vy) || 1;
      ctx.globalAlpha = Math.min(1, 0.32 * alphaScale) * gust.power;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < gust.streaks.length; i++) {
        const streak = gust.streaks[i];
        ctx.moveTo(streak.x, streak.y);
        ctx.lineTo(streak.x - (gust.vx / speed) * streak.length, streak.y - (gust.vy / speed) * streak.length);
      }
      ctx.stroke();
    }
    if (twister) {
      // three arms winding out from the middle, turning as it goes
      const seconds = (now - twister.start) / 1000;
      ctx.globalAlpha = Math.min(1, 0.4 * alphaScale) * twister.power;
      ctx.lineWidth = 1.6;
      for (let arm = 0; arm < 3; arm++) {
        ctx.beginPath();
        for (let step = 0; step <= 26; step++) {
          const along = step / 26;
          const angle = twister.turn * (seconds * 5 - along * 4.6) + (arm * TAU) / 3;
          const reach = 6 + along * twister.radius * 0.72;
          const x = twister.x + Math.cos(angle) * reach;
          const y = twister.y + Math.sin(angle) * reach * 0.86;
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    // short lines that fan out from the spot where a fish hit a rock
    ctx.lineWidth = 1.5;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i];
      const progress = (now - spark.start) / SPARK_MS;
      if (progress >= 1) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.min(1, 0.7 * alphaScale) * (1 - progress);
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) {
        const angle = spark.angle + k * 0.6;
        const inner = 5 + 9 * progress;
        const outer = inner + 9 - 3 * progress;
        ctx.moveTo(spark.x + Math.cos(angle) * inner, spark.y + Math.sin(angle) * inner);
        ctx.lineTo(spark.x + Math.cos(angle) * outer, spark.y + Math.sin(angle) * outer);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    drawRocks();
    for (let i = 0; i < fish.length; i++) drawFish(fish[i]);
    if (player) drawFish(player);
    drawRipples(now);
    drawBubbles(now);
    drawSurprises(now);
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
    updateSurprises(dt, now);
    for (let i = 0; i < fish.length; i++) updateFish(fish[i], dt, now, cursorResting);
    if (needsSort) {
      fish.sort(byDepth);
      needsSort = false;
    }
    if (player) {
      updatePlayer(dt, now);
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
    // keep the fish and the rocks spread over the window when it changes size
    const things = fish.concat(rocks);
    for (let i = 0; i < things.length; i++) {
      if (width > 0) things[i].x *= nextWidth / width;
      if (height > 0) things[i].y *= nextHeight / height;
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

  // ---- Start ----------------------------------------------------------------
  function boot() {
    ready = true;
    nextEventAt = window.performance.now() + EVENT_FIRST_MS * (1 + Math.random());
    resetSprites();
    populate();
    if (gameEnabled) buildButton();
    start();
  }

  // Fallback: draw the picture as it is, so every fish looks the same.
  function usePicture() {
    image.onload = function () {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) ratio = image.naturalHeight / image.naturalWidth;
      boot();
    };
    image.src = spriteUrl;
  }

  resize();
  if (window.fetch && window.DOMParser) {
    window
      .fetch(spriteUrl)
      .then(function (response) {
        return response.ok ? response.text() : "";
      })
      .then(
        function (text) {
          try {
            shapes = text ? readShapes(text) : null;
          } catch (error) {
            shapes = null;
          }
        },
        function () {
          shapes = null; // could not fetch the file
        }
      )
      .then(function () {
        if (!shapes) return usePicture();
        ratio = shapes.ratio;
        boot();
      });
  } else {
    usePicture();
  }
})();

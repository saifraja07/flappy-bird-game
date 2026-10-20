const BIRD_W = 34;
const BIRD_H = 52;

function scroll(ctx, img, offset, y) {
  if (!img) return;
  const x = -Math.round(offset % img.width);
  ctx.drawImage(img, x, y);
  ctx.drawImage(img, x + img.width, y);
}

const SIGN_W = 48;
const SIGN_H = 34;

/** Bold pixel-art label on each pipe: VOTE CHOR, with a tricolour accent. */
function drawSign(ctx, cx, cy) {
  const x = Math.round(cx - SIGN_W / 2);
  const y = Math.round(cy - SIGN_H / 2);

  // Dark ink panel with a crisp cream edge and subtle shadow.
  ctx.fillStyle = 'rgba(12, 20, 32, 0.28)';
  ctx.fillRect(x - 3, y - 2, SIGN_W + 6, SIGN_H + 6);
  ctx.fillStyle = '#fff4d6';
  ctx.fillRect(x - 2, y - 2, SIGN_W + 4, SIGN_H + 4);
  ctx.fillStyle = '#172033';
  ctx.fillRect(x, y, SIGN_W, SIGN_H);

  // Saffron and green pixel stripes frame the slogan.
  ctx.fillStyle = '#ff9933';
  ctx.fillRect(x, y, SIGN_W, 4);
  ctx.fillStyle = '#138808';
  ctx.fillRect(x, y + SIGN_H - 4, SIGN_W, 4);

  ctx.fillStyle = '#fff8e8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 7px "Press Start 2P", ui-monospace, monospace';
  ['VOTE', 'CHOR'].forEach((word, i) => {
    ctx.save();
    ctx.translate(cx, y + 12 + i * 10);
    const scale = Math.min(1, (SIGN_W - 4) / Math.max(1, ctx.measureText(word).width));
    ctx.scale(scale, 1);
    ctx.fillText(word, 0, 0);
    ctx.restore();
  });
}

function drawPipeHalf(ctx, A, cfg, x, y, h, capAtBottom) {
  const { width, capHeight, capOverhang } = cfg.pipe;
  if (h <= 0) return;
  const capY = capAtBottom ? y + h - capHeight : y;
  const bodyY = capAtBottom ? y : y + capHeight;
  const bodyH = Math.max(0, h - capHeight);
  if (A.pipeBody) ctx.drawImage(A.pipeBody, x, bodyY, width, bodyH);
  else {
    ctx.fillStyle = '#5cc23a';
    ctx.fillRect(x, bodyY, width, bodyH);
  }
  if (bodyH >= SIGN_H + 12) drawSign(ctx, x + width / 2, bodyY + bodyH / 2);
  if (A.pipeCap) ctx.drawImage(A.pipeCap, x - capOverhang, capY, width + capOverhang * 2, capHeight);
  else {
    ctx.fillStyle = '#2f8a2f';
    ctx.fillRect(x - capOverhang, capY, width + capOverhang * 2, capHeight);
  }
}

export function renderFrame(ctx, eng) {
  const { cfg, options } = eng;
  const A = eng.assets ?? {};
  const W = cfg.width;
  const groundY = cfg.height - cfg.groundHeight;
  ctx.setTransform(eng.scale, 0, 0, eng.scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (eng.shakeTime > 0 && !options.reduceEffects) {
    const m = cfg.shake.magnitude * (eng.shakeTime / cfg.shake.duration);
    ctx.translate(Math.round((Math.random() - 0.5) * 2 * m), Math.round((Math.random() - 0.5) * 2 * m));
  }

  if (A.sky) ctx.drawImage(A.sky, 0, 0);
  else {
    ctx.fillStyle = '#7fb2ec';
    ctx.fillRect(-8, -8, W + 16, cfg.height);
  }
  scroll(ctx, A.clouds, eng.cloudX, 40);
  scroll(ctx, A.hills, eng.hillX, groundY - 140);

  for (const p of eng.obstacles.pipes) {
    const x = Math.round(p.x);
    const topH = Math.round(p.gapY - p.gap / 2);
    const botY = Math.round(p.gapY + p.gap / 2);
    drawPipeHalf(ctx, A, cfg, x, 0, topH, true);
    drawPipeHalf(ctx, A, cfg, x, botY, groundY - botY, false);
  }

  const tileW = 32;
  for (let x = -Math.round(eng.scrollX % tileW); x < W; x += tileW) {
    if (A.ground) ctx.drawImage(A.ground, x, groundY, tileW, cfg.groundHeight);
    else {
      ctx.fillStyle = '#d9a066';
      ctx.fillRect(x, groundY, tileW, cfg.groundHeight);
    }
  }

  ctx.fillStyle = '#ffffff';
  for (const p of eng.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;

  const b = eng.bird;
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y));
  ctx.rotate(b.rotation);
  if (A.birdSheet) {
    // The custom bird is a single transparent portrait, not an animated sprite sheet.
    ctx.drawImage(A.birdSheet, -BIRD_W / 2, -Math.floor(BIRD_H / 2), BIRD_W, BIRD_H);
  } else {
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);
  }
  ctx.restore();
  ctx.restore();

  if (eng.shakeTime > 0 && !options.reduceEffects) {
    ctx.fillStyle = `rgba(255,255,255,${(eng.shakeTime / cfg.shake.duration) * 0.45})`;
    ctx.fillRect(0, 0, W, cfg.height);
  }
}

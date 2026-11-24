import { BroadcastScene, OverlayState } from '../types/broadcast';

const imageCache = new Map<string, HTMLImageElement>();
const textWidthCache = new Map<string, number>();
let cachedClockEpochSec = -1;
let cachedClockStr = '';
let cachedScrimCtx: CanvasRenderingContext2D | null = null;
let cachedScrimHeight = 0;
let cachedScrimGrad: CanvasGradient | null = null;

function getCachedClock(): string {
  const sec = Math.floor(Date.now() / 1000);
  if (sec !== cachedClockEpochSec) {
    cachedClockEpochSec = sec;
    cachedClockStr = new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
  return cachedClockStr;
}

function measureTextCached(
  ctx: CanvasRenderingContext2D,
  font: string,
  text: string
): number {
  const key = `${font}::${text}`;
  const hit = textWidthCache.get(key);
  if (hit !== undefined) return hit;
  ctx.font = font;
  const w = ctx.measureText(text).width;
  if (textWidthCache.size > 120) {
    textWidthCache.clear();
  }
  textWidthCache.set(key, w);
  return w;
}

function getCachedImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    imageCache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function drawCoverMedia(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  offsetXRatio = 0.5
) {
  const sw =
    source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sh =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source.naturalHeight;
  if (!sw || !sh) return;

  const targetRatio = dw / dh;
  const srcRatio = sw / sh;

  let sx = 0;
  let sy = 0;
  let sWidth = sw;
  let sHeight = sh;

  if (srcRatio > targetRatio) {
    sWidth = sh * targetRatio;
    sx = (sw - sWidth) * offsetXRatio;
  } else {
    sHeight = sw / targetRatio;
    sy = (sh - sHeight) * 0.5;
  }

  ctx.drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dw, dh);
}

export interface CompositeInput {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scene: BroadcastScene;
  overlays: OverlayState;
  accentHex: string;
  videoEl: HTMLVideoElement | null;
  tickerOffsetPx: number;
}

export function renderBroadcastFrame({
  ctx,
  width,
  height,
  scene,
  overlays,
  accentHex,
  videoEl,
  tickerOffsetPx,
}: CompositeInput) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#06080C';
  ctx.fillRect(0, 0, width, height);

  const hasLiveVideo =
    videoEl !== null &&
    videoEl.readyState >= 2 &&
    videoEl.videoWidth > 0 &&
    (scene.cameraType === 'webcam' ||
      scene.cameraType === 'screen' ||
      (scene.cameraType === 'media' && scene.mediaKind === 'video'));

  const imgSrc =
    scene.cameraType === 'media' && scene.mediaKind === 'image' && scene.mediaUrl
      ? scene.mediaUrl
      : scene.backdropUrl;
  const backdropImg = getCachedImage(imgSrc);
  const logoImg = overlays.logoUrl ? getCachedImage(overlays.logoUrl) : null;

  // 1. Base Visual Layer
  if (scene.cameraType === 'slate') {
    const grad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.35,
      40,
      width * 0.5,
      height * 0.5,
      width * 0.65
    );
    grad.addColorStop(0, `${accentHex}55`);
    grad.addColorStop(1, scene.slateColor || '#052E2B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    if (logoImg) {
      const logoH = 136;
      const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
      ctx.drawImage(
        logoImg,
        width * 0.5 - logoW * 0.5,
        height * 0.31 - logoH * 0.5,
        logoW,
        logoH
      );
    } else {
      ctx.fillStyle = accentHex;
      ctx.fillRect(width * 0.5 - 60, height * 0.4 - 24, 120, 6);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 46px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      (overlays.channelName || scene.slateHeadline || scene.name).toUpperCase(),
      width * 0.5,
      height * 0.54,
      width - 160
    );

    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.fillText('YA VOLVEMOS', width * 0.5, height * 0.63, width - 200);
    ctx.textAlign = 'left';
  } else if (scene.layoutMode === 'split') {
    const halfW = width * 0.5 - 3;
    if (hasLiveVideo && videoEl) {
      drawCoverMedia(ctx, videoEl, 0, 0, halfW, height, 0.5);
    } else if (backdropImg) {
      drawCoverMedia(ctx, backdropImg, 0, 0, halfW, height, 0.25);
    }

    if (backdropImg) {
      drawCoverMedia(ctx, backdropImg, width * 0.5 + 3, 0, halfW, height, 0.8);
    } else if (hasLiveVideo && videoEl) {
      drawCoverMedia(ctx, videoEl, width * 0.5 + 3, 0, halfW, height, 0.5);
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(halfW, 0, 6, height);
  } else {
    const mediaSource = hasLiveVideo && videoEl ? videoEl : backdropImg;
    if (mediaSource) {
      drawCoverMedia(ctx, mediaSource, 0, 0, width, height, 0.5);
    }

    if (scene.layoutMode === 'pip' && backdropImg) {
      const pipW = width * 0.26;
      const pipH = pipW * (9 / 16);
      const pipX = width - pipW - 28;
      const pipY = overlays.activeGuestBadge ? 106 : 72;
      ctx.fillStyle = '#0B1018';
      ctx.fillRect(pipX - 3, pipY - 3, pipW + 6, pipH + 6);
      drawCoverMedia(ctx, backdropImg, pipX, pipY, pipW, pipH, 0.75);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(pipX, pipY, pipW, pipH);
    }
  }

  // Contrast Scrim (cached gradient)
  if (cachedScrimCtx !== ctx || cachedScrimHeight !== height || !cachedScrimGrad) {
    const g = ctx.createLinearGradient(0, height * 0.55, 0, height);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.72)');
    cachedScrimCtx = ctx;
    cachedScrimHeight = height;
    cachedScrimGrad = g;
  }
  ctx.fillStyle = cachedScrimGrad;
  ctx.fillRect(0, height * 0.55, width, height * 0.45);

  // 2. Top-Left Badges (EN VIVO, Real #SinFiltro Logo Bug, Clock)
  let cursorX = 28;
  const topY = 24;

  if (overlays.showLiveBadge) {
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(cursorX, topY, 92, 36);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('EN VIVO', cursorX + 12, topY + 24);
    cursorX += 102;
  }

  if (overlays.showBug) {
    if (logoImg) {
      const bugH = 46;
      const bugW = (logoImg.naturalWidth / logoImg.naturalHeight) * bugH;
      ctx.drawImage(logoImg, cursorX, topY - 4, bugW, bugH);
      cursorX += bugW + 10;
    } else if (overlays.channelName) {
      const bugFont = 'bold 17px Outfit, sans-serif';
      const textW = Math.max(
        90,
        measureTextCached(ctx, bugFont, overlays.channelName) + 26
      );
      ctx.fillStyle = accentHex;
      ctx.fillRect(cursorX, topY, textW, 36);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(overlays.channelName, cursorX + 13, topY + 24);
      cursorX += textW + 10;
    }
  }

  if (overlays.showClock) {
    const nowStr = getCachedClock();
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(cursorX, topY, 108, 36);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '16px "JetBrains Mono", monospace';
    ctx.fillText(nowStr, cursorX + 14, topY + 24);
  }

  // Scoreboard
  if (overlays.showScoreboard) {
    const sbW = 340;
    const sbX = width - sbW - 28;
    ctx.fillStyle = 'rgba(10,13,18,0.92)';
    ctx.fillRect(sbX, topY, sbW, 36);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(sbX, topY, 72, 36);
    ctx.fillRect(sbX + 168, topY, 72, 36);
    ctx.fillStyle = '#15803D';
    ctx.fillRect(sbX + 72, topY, 44, 36);
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(sbX + 124, topY, 44, 36);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText(overlays.scoreHomeName, sbX + 14, topY + 24);
    ctx.fillText(String(overlays.scoreHome), sbX + 88, topY + 24);
    ctx.fillText(String(overlays.scoreAway), sbX + 140, topY + 24);
    ctx.fillText(overlays.scoreAwayName, sbX + 182, topY + 24);
    ctx.fillStyle = '#FCD34D';
    ctx.fillText(overlays.matchClock, sbX + 256, topY + 24);
  }

  // 2B. Guest Welcome Badge ("Cartelito de Bienvenida para Invitados") in Top-Right
  if (overlays.activeGuestBadge) {
    const gb = overlays.activeGuestBadge;
    const gbY = overlays.showScoreboard ? topY + 46 : topY;
    ctx.font = 'bold 21px Outfit, sans-serif';
    const nameW = ctx.measureText(gb.name).width;
    ctx.font = '14px "Plus Jakarta Sans", sans-serif';
    const roleW = gb.role ? ctx.measureText(gb.role).width : 0;
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    const tagText = gb.greeting || 'BIENVENIDO';
    const tagW = ctx.measureText(tagText).width + 20;

    const gbW = Math.min(440, Math.max(250, Math.max(nameW, roleW, tagW) + 46));
    const gbX = width - gbW - 28;
    const gbH = gb.role ? 74 : 56;

    ctx.fillStyle = 'rgba(6, 12, 9, 0.92)';
    ctx.fillRect(gbX, gbY, gbW, gbH);
    ctx.fillStyle = accentHex;
    ctx.fillRect(gbX, gbY, 7, gbH);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(gbX, gbY, gbW, gbH);

    // Greeting Pill
    ctx.fillStyle = accentHex;
    ctx.fillRect(gbX + 18, gbY + 10, tagW, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(tagText, gbX + 28, gbY + 24);

    // Guest Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 21px Outfit, sans-serif';
    ctx.fillText(gb.name, gbX + 18, gbY + 50, gbW - 32);

    if (gb.role) {
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(gb.role, gbX + 18, gbY + 67, gbW - 32);
    }
  }

  // 3. Lower Third
  if (overlays.showLowerThird) {
    const boxY = overlays.showTicker ? height - 152 : height - 108;
    const boxX = 28;
    const boxW = Math.min(820, width - 56);
    const boxH = 82;

    ctx.fillStyle = 'rgba(10, 14, 20, 0.9)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = accentHex;
    ctx.fillRect(boxX, boxY, boxW, 6);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillText(overlays.lowerThirdTitle, boxX + 20, boxY + 40, boxW - 40);

    if (overlays.lowerThirdSubtitle) {
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(overlays.lowerThirdSubtitle, boxX + 20, boxY + 67, boxW - 40);
    }
  }

  // 4. Bottom Ticker
  if (overlays.showTicker) {
    const barH = 44;
    const barY = height - barH;
    ctx.fillStyle = 'rgba(8, 11, 16, 0.95)';
    ctx.fillRect(0, barY, width, barH);

    const badgeText = overlays.channelName || 'INFO';
    const badgeFont = 'bold 16px "JetBrains Mono", monospace';
    const badgeW = Math.max(96, measureTextCached(ctx, badgeFont, badgeText) + 28);

    ctx.save();
    ctx.beginPath();
    ctx.rect(badgeW, barY, width - badgeW, barH);
    ctx.clip();

    const tickerFont = '500 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#F1F5F9';
    const txt = `${overlays.tickerText}   ·   `;
    const txtW = Math.max(400, measureTextCached(ctx, tickerFont, txt));
    ctx.font = tickerFont;
    const shift = tickerOffsetPx % txtW;
    ctx.fillText(txt, badgeW - shift, barY + 28);
    ctx.fillText(txt, badgeW - shift + txtW, barY + 28);
    ctx.restore();

    ctx.fillStyle = accentHex;
    ctx.fillRect(0, barY, badgeW, barH);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = badgeFont;
    ctx.fillText(badgeText, 14, barY + 28);
  }

  // 5. TV Headline Banner / Full-Screen TV Title Graphic
  if (overlays.activeBannerTitle) {
    const bt = overlays.activeBannerTitle;
    if (bt.style === 'full_title') {
      const cardW = Math.min(920, width - 120);
      const cardH = 220;
      const cardX = (width - cardW) * 0.5;
      const cardY = (height - cardH) * 0.5;

      ctx.fillStyle = 'rgba(6, 10, 14, 0.92)';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.fillStyle = accentHex;
      ctx.fillRect(cardX, cardY, cardW, 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      if (bt.tag) {
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        const tagW = Math.max(96, ctx.measureText(bt.tag).width + 26);
        ctx.fillStyle = accentHex;
        ctx.fillRect(cardX + (cardW - tagW) * 0.5, cardY + 34, tagW, 28);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(bt.tag, width * 0.5, cardY + 53);
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 38px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bt.title, width * 0.5, cardY + 122, cardW - 64);

      if (bt.subtitle) {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(bt.subtitle, width * 0.5, cardY + 168, cardW - 64);
      }
      ctx.textAlign = 'left';
    } else if (bt.style === 'headline_banner') {
      const boxW = Math.min(760, width - 56);
      const boxX = 28;
      const boxY = 82;
      const boxH = 84;

      ctx.fillStyle = 'rgba(8, 13, 18, 0.92)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = accentHex;
      ctx.fillRect(boxX, boxY, 8, boxH);

      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      const tagText = bt.tag || 'TITULAR TV';
      const tagW = Math.max(88, ctx.measureText(tagText).width + 20);
      ctx.fillStyle = accentHex;
      ctx.fillRect(boxX + 20, boxY + 12, tagW, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(tagText, boxX + 30, boxY + 28);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px Outfit, sans-serif';
      ctx.fillText(bt.title, boxX + 20 + tagW + 14, boxY + 33, boxW - tagW - 56);

      if (bt.subtitle) {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '17px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(bt.subtitle, boxX + 20, boxY + 64, boxW - 44);
      }
    }
  }

  // 5B. Live Giveaway / Trivia / Raffle / Winner Broadcast Placa
  if (overlays.giveaway && overlays.giveaway.stage !== 'hidden') {
    const gw = overlays.giveaway;
    const cardW = Math.min(760, width - 140);
    const cardH = 224;
    const cardX = (width - cardW) * 0.5;
    const cardY = (height - cardH) * 0.46;

    const isWinner = gw.stage === 'winner';
    const isRolling = gw.stage === 'rolling';
    const borderHex = isWinner ? '#F59E0B' : accentHex;

    ctx.fillStyle = 'rgba(5, 11, 8, 0.94)';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.fillStyle = borderHex;
    ctx.fillRect(cardX, cardY, cardW, 8);
    ctx.strokeStyle = isWinner ? '#F59E0B' : 'rgba(22, 163, 74, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    // Top Status Tag
    const badgeLabel = isWinner
      ? '¡GANADOR/A EN VIVO!'
      : isRolling
      ? 'SORTEANDO EN VIVO...'
      : gw.title || 'PREMIO EN VIVO';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    const badgeW = Math.max(160, ctx.measureText(badgeLabel).width + 32);
    ctx.fillStyle = borderHex;
    ctx.fillRect(cardX + (cardW - badgeW) * 0.5, cardY + 24, badgeW, 30);
    ctx.fillStyle = isWinner ? '#000000' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(badgeLabel, width * 0.5, cardY + 44);

    if (isRolling) {
      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 40px Outfit, sans-serif';
      ctx.fillText(
        gw.rollingName || '...',
        width * 0.5,
        cardY + 118,
        cardW - 60
      );
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '19px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Premio: ${gw.prize}`, width * 0.5, cardY + 172, cardW - 60);
    } else if (isWinner) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 42px Outfit, sans-serif';
      ctx.fillText(
        gw.winnerName || 'GANADOR/A',
        width * 0.5,
        cardY + 116,
        cardW - 60
      );
      ctx.fillStyle = '#86EFAC';
      ctx.font = 'bold 21px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Premio: ${gw.prize}`, width * 0.5, cardY + 158, cardW - 60);
      if (gw.winnerNote) {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(gw.winnerNote, width * 0.5, cardY + 190, cardW - 60);
      }
    } else {
      // Promo stage
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 34px Outfit, sans-serif';
      ctx.fillText(gw.prize, width * 0.5, cardY + 112, cardW - 60);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '19px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(gw.promptText, width * 0.5, cardY + 158, cardW - 60);

      ctx.fillStyle = '#86EFAC';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText(
        `Participantes anotados: ${gw.participants.length}`,
        width * 0.5,
        cardY + 194,
        cardW - 60
      );
    }

    ctx.textAlign = 'left';
  }

  // 5C. End-of-Program Closing Slate ("Placa de Cierre")
  if (overlays.closingSlate?.active) {
    const cs = overlays.closingSlate;
    const csGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.25,
      60,
      width * 0.5,
      height * 0.5,
      width * 0.72
    );
    csGrad.addColorStop(0, '#0D2918');
    csGrad.addColorStop(1, '#040806');
    ctx.fillStyle = csGrad;
    ctx.fillRect(0, 0, width, height);

    // Top 3 logos header
    const colPositions = [width * 0.2, width * 0.5, width * 0.8];
    const logoBoxTop = 38;
    const maxLogoH = 82;
    const maxLogoW = 240;

    const drawLogoSlot = (
      cx: number,
      url: string | undefined,
      caption: string,
      isRadioFallback = false
    ) => {
      const img = url ? getCachedImage(url) : null;
      if (img) {
        const ratio = img.naturalWidth / img.naturalHeight;
        let dw = maxLogoH * ratio;
        let dh = maxLogoH;
        if (dw > maxLogoW) {
          dw = maxLogoW;
          dh = dw / ratio;
        }
        ctx.drawImage(img, cx - dw * 0.5, logoBoxTop + (maxLogoH - dh) * 0.5, dw, dh);
      } else if (isRadioFallback) {
        // Crisp built-in Radioactiva 88.5 FM emblem
        const pillW = 190;
        const pillH = 56;
        const px = cx - pillW * 0.5;
        const py = logoBoxTop + 14;
        ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
        ctx.fillRect(px, py, pillW, pillH);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pillW, pillH);

        // Broadcast wave arcs on left
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px + 34, py + 28, 7, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px + 34, py + 28, 13, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(px + 28, py + 28, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('88.5 FM', cx + 20, py + 35);
      } else {
        ctx.fillStyle = accentHex;
        ctx.fillRect(cx - 75, logoBoxTop + 20, 150, 44);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(caption, cx, logoBoxTop + 49, 140);
      }

      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(caption, cx, logoBoxTop + maxLogoH + 22, 320);
    };

    drawLogoSlot(
      colPositions[0],
      cs.programLogoUrl || overlays.logoUrl,
      cs.programTitle || overlays.channelName || '#SinFiltro'
    );
    drawLogoSlot(
      colPositions[1],
      cs.radioLogoUrl,
      cs.radioName || 'Radioactiva 88.5 FM',
      true
    );
    drawLogoSlot(
      colPositions[2],
      cs.producerLogoUrl || '/assets/aistudio/jz-logo-transparent.png',
      cs.producerName || 'JUGEND FÜR EINE GRÜNE ZUKUNFT'
    );

    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(56, 162);
    ctx.lineTo(width - 56, 162);
    ctx.stroke();

    // Closing headline
    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      (cs.headline || 'GRACIAS POR ACOMPAÑARNOS').toUpperCase(),
      width * 0.5,
      208,
      width - 120
    );

    // 2-column area credits
    const credits = (cs.credits || []).slice(0, 8);
    const gridLeft = 86;
    const colGap = 36;
    const cardW = (width - gridLeft * 2 - colGap) * 0.5;
    const cardH = 82;
    const startY = 232;
    const rowGap = 16;

    ctx.textAlign = 'left';
    credits.forEach((entry, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = gridLeft + col * (cardW + colGap);
      const y = startY + row * (cardH + rowGap);

      ctx.fillStyle = 'rgba(10, 18, 14, 0.88)';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.fillStyle = accentHex;
      ctx.fillRect(x, y, 5, cardH);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cardW, cardH);

      ctx.fillStyle = '#6EE7B7';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText((entry.area || '').toUpperCase(), x + 18, y + 30, cardW - 32);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px Outfit, sans-serif';
      ctx.fillText(entry.names || '', x + 18, y + 60, cardW - 32);
    });

    // Bottom footer with Owner & Creator credit
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.moveTo(56, height - 66);
    ctx.lineTo(width - 56, height - 66);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      cs.producerName || 'JUGEND FÜR EINE GRÜNE ZUKUNFT',
      60,
      height - 32,
      540
    );

    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      cs.ownerCredit || 'Dueño y Creador: ALMADA EDUARDO THOMAS',
      width - 60,
      height - 32,
      620
    );
    ctx.textAlign = 'left';
  }

  // 6. Broadcast Fade to Black (FTB)
  if (overlays.fadeToBlack) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

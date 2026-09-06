import { OcularData } from '../types';

export function drawOcularHUD(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  ocular: OcularData,
  time: number,
  emotion?: string
) {
  // Only render if eye contours or irises are detected
  if (!ocular.leftIris && !ocular.rightIris && ocular.leftEyeContour.length === 0) {
    return;
  }

  ctx.save();

  // Helper to render an eye reticle
  const renderEyeReticle = (
    iris: { x: number; y: number } | null,
    contour: { x: number; y: number }[],
    label: string,
    openness: number,
    isWinking: boolean
  ) => {
    if (!iris && contour.length === 0) return;

    // Calculate eye bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    if (contour.length > 0) {
      contour.forEach(pt => {
        const px = pt.x * canvasWidth;
        const py = pt.y * canvasHeight;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      });
    } else if (iris) {
      const ix = iris.x * canvasWidth;
      const iy = iris.y * canvasHeight;
      minX = ix - 25;
      maxX = ix + 25;
      minY = iy - 15;
      maxY = iy + 15;
    }

    const eyeCenterX = iris ? iris.x * canvasWidth : (minX + maxX) / 2;
    const eyeCenterY = iris ? iris.y * canvasHeight : (minY + maxY) / 2;
    const boxW = Math.max(40, (maxX - minX) * 1.3);
    const boxH = Math.max(26, (maxY - minY) * 1.5);
    const halfW = boxW / 2;
    const halfH = boxH / 2;

    const cornerLen = 8;
    const isClosed = openness < 0.32;

    // 1. Draw eyelid contour lines if available
    if (contour.length > 0) {
      ctx.beginPath();
      contour.forEach((pt, i) => {
        const px = pt.x * canvasWidth;
        const py = pt.y * canvasHeight;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.strokeStyle = isWinking
        ? 'rgba(250, 204, 21, 0.75)'
        : isClosed
        ? 'rgba(148, 163, 184, 0.4)'
        : 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2. Draw outer precision brackets [ ]
    ctx.strokeStyle = isWinking 
      ? 'rgba(250, 204, 21, 0.9)' 
      : isClosed 
      ? 'rgba(148, 163, 184, 0.5)' 
      : 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(eyeCenterX - halfW, eyeCenterY - halfH + cornerLen);
    ctx.lineTo(eyeCenterX - halfW, eyeCenterY - halfH);
    ctx.lineTo(eyeCenterX - halfW + cornerLen, eyeCenterY - halfH);
    // Top-right corner
    ctx.moveTo(eyeCenterX + halfW - cornerLen, eyeCenterY - halfH);
    ctx.lineTo(eyeCenterX + halfW, eyeCenterY - halfH);
    ctx.lineTo(eyeCenterX + halfW, eyeCenterY - halfH + cornerLen);
    // Bottom-left corner
    ctx.moveTo(eyeCenterX - halfW, eyeCenterY + halfH - cornerLen);
    ctx.lineTo(eyeCenterX - halfW, eyeCenterY + halfH);
    ctx.lineTo(eyeCenterX - halfW + cornerLen, eyeCenterY + halfH);
    // Bottom-right corner
    ctx.moveTo(eyeCenterX + halfW - cornerLen, eyeCenterY + halfH);
    ctx.lineTo(eyeCenterX + halfW, eyeCenterY + halfH);
    ctx.lineTo(eyeCenterX + halfW, eyeCenterY + halfH - cornerLen);
    ctx.stroke();

    // 3. Iris Crosshair & Reticle (When open)
    if (!isClosed && iris) {
      const radius = 9;

      // Rotating dashed ring
      ctx.save();
      ctx.translate(eyeCenterX, eyeCenterY);
      ctx.rotate((time / 1000) * 0.5);

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isWinking ? 'rgba(250, 204, 21, 0.8)' : 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.restore();

      // Center reticle crosshair
      ctx.beginPath();
      ctx.moveTo(eyeCenterX - 3, eyeCenterY);
      ctx.lineTo(eyeCenterX + 3, eyeCenterY);
      ctx.moveTo(eyeCenterX, eyeCenterY - 3);
      ctx.lineTo(eyeCenterX, eyeCenterY + 3);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pupil center point
      ctx.fillStyle = isWinking ? '#facc15' : '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeCenterX, eyeCenterY, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 4. Gaze Direction Ray Vector
      const rayLen = 28;
      const rayEndX = eyeCenterX + ocular.gazeX * rayLen;
      const rayEndY = eyeCenterY - ocular.gazeY * rayLen; // inverted Y for screen coords

      ctx.beginPath();
      ctx.moveTo(eyeCenterX, eyeCenterY);
      ctx.lineTo(rayEndX, rayEndY);
      ctx.strokeStyle = isWinking ? 'rgba(250, 204, 21, 0.8)' : 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Arrow tip on gaze ray
      ctx.fillStyle = isWinking ? 'rgba(250, 204, 21, 0.9)' : 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(rayEndX, rayEndY, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (isClosed) {
      // Horizontal peaceful meditative indicator line
      ctx.beginPath();
      ctx.moveTo(eyeCenterX - halfW * 0.7, eyeCenterY);
      ctx.lineTo(eyeCenterX + halfW * 0.7, eyeCenterY);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.setLineDash([3, 2]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Telemetry text tag
    ctx.font = '500 9px "JetBrains Mono", monospace';
    const tagY = eyeCenterY - halfH - 4;
    const tagText = isClosed
      ? `${label} [CLOSED]`
      : isWinking
      ? `${label} [WINK 100%]`
      : `${label} [${Math.round(openness * 100)}%]`;

    const tagWidth = ctx.measureText(tagText).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(eyeCenterX - halfW, tagY - 9, tagWidth + 6, 11);

    ctx.fillStyle = isWinking ? '#fde047' : isClosed ? '#94a3b8' : '#ffffff';
    ctx.fillText(tagText, eyeCenterX - halfW + 3, tagY - 1);
  };

  // Render left and right eyes
  renderEyeReticle(
    ocular.leftIris,
    ocular.leftEyeContour,
    'OCULAR_L',
    ocular.leftOpenness,
    ocular.isWinkingLeft
  );

  renderEyeReticle(
    ocular.rightIris,
    ocular.rightEyeContour,
    'OCULAR_R',
    ocular.rightOpenness,
    ocular.isWinkingRight
  );

  // 6. Blink Wave Ripple Animation (if a blink occurred in the last 400ms)
  const timeSinceBlink = time - ocular.lastBlinkTime;
  if (timeSinceBlink >= 0 && timeSinceBlink < 400) {
    const progress = timeSinceBlink / 400; // 0 to 1
    const rippleRadius = 15 + progress * 55;
    const alpha = (1 - progress) * 0.7;

    const drawRipple = (pt: { x: number; y: number } | null) => {
      if (!pt) return;
      ctx.beginPath();
      ctx.arc(pt.x * canvasWidth, pt.y * canvasHeight, rippleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    drawRipple(ocular.leftIris);
    drawRipple(ocular.rightIris);
  }

  // 7. Dynamic Interpupillary Gaze Bridge Line
  if (ocular.leftIris && ocular.rightIris && !ocular.isClosed) {
    const lx = ocular.leftIris.x * canvasWidth;
    const ly = ocular.leftIris.y * canvasHeight;
    const rx = ocular.rightIris.x * canvasWidth;
    const ry = ocular.rightIris.y * canvasHeight;

    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Midpoint gaze target tag
    const mx = (lx + rx) / 2;
    const my = (ly + ry) / 2 - 12;
    ctx.font = '400 8px monospace';
    const midText = emotion ? `GAZE // ${ocular.gazeDirection}  •  AFFECT // ${emotion.toUpperCase()}` : `GAZE // ${ocular.gazeDirection}`;
    const midWidth = ctx.measureText(midText).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(mx - midWidth / 2 - 4, my - 8, midWidth + 8, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText(midText, mx - midWidth / 2, my);
  }

  ctx.restore();
}

import type { StrokePoint } from '../types/board';

/**
 * Filters out raw points that are virtually identical to prevent jitter,
 * while always preserving the start and end points.
 */
export function filterPoints(points: StrokePoint[], minDistance = 2): StrokePoint[] {
  if (points.length <= 2) return points;

  const result: StrokePoint[] = [points[0]];
  let last = points[0];

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
    if (dist >= minDistance) {
      result.push(pt);
      last = pt;
    }
  }

  // Always keep last point
  result.push(points[points.length - 1]);
  return result;
}

/**
 * Draws a natural, smooth freehand stroke using midpoint quadratic Bézier splines.
 * This guarantees no sharp corners or jagged segments.
 */
export function renderSmoothStroke(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  color: string,
  baseWidth: number,
  isHighlighter = false,
  opacity = 1
): void {
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isHighlighter) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
  } else {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
  }

  // Single point: render as a neat circle dot
  if (points.length === 1) {
    const p = points[0];
    const r = (baseWidth * (p.pressure || 1)) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(r, 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 2 points: simple straight line
  if (points.length === 2) {
    ctx.lineWidth = baseWidth * (points[0].pressure || 1);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 3+ points: smooth Catmull-Rom / Midpoint Quadratic Bézier curve
  ctx.lineWidth = baseWidth;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;

    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  // Connect to final point
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  ctx.restore();
}

import type { LineObject, LineStyle, Point, ShapeObject } from '../types/board';

/**
 * Applies stroke dashing based on LineStyle.
 */
export function applyLineStyle(ctx: CanvasRenderingContext2D, style: LineStyle, width: number): void {
  if (style === 'dashed') {
    ctx.setLineDash([width * 3, width * 2]);
  } else if (style === 'dotted') {
    ctx.setLineDash([width, width * 1.5]);
  } else {
    ctx.setLineDash([]);
  }
}

/**
 * Draws arrow heads at start and/or end of a line.
 */
export function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  width: number,
  color: string
): void {
  const headLength = Math.max(width * 3.5, 12);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  ctx.save();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLength * Math.cos(angle - Math.PI / 6),
    to.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    to.x - headLength * Math.cos(angle + Math.PI / 6),
    to.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders a LineObject or Arrow on canvas.
 */
export function renderLine(ctx: CanvasRenderingContext2D, line: LineObject): void {
  ctx.save();
  ctx.strokeStyle = line.strokeColor;
  ctx.lineWidth = line.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyLineStyle(ctx, line.lineStyle, line.strokeWidth);

  ctx.beginPath();
  ctx.moveTo(line.x1, line.y1);
  ctx.lineTo(line.x2, line.y2);
  ctx.stroke();

  // Draw arrowheads if requested
  const p1 = { x: line.x1, y: line.y1 };
  const p2 = { x: line.x2, y: line.y2 };

  if (line.arrowType === 'end' || line.arrowType === 'both') {
    drawArrowHead(ctx, p1, p2, line.strokeWidth, line.strokeColor);
  }
  if (line.arrowType === 'start' || line.arrowType === 'both') {
    drawArrowHead(ctx, p2, p1, line.strokeWidth, line.strokeColor);
  }

  ctx.restore();
}

/**
 * Renders geometric shapes with stroke and optional fill.
 * Correctly normalizes negative widths/heights so dragging in any direction works seamlessly.
 */
export function renderShape(ctx: CanvasRenderingContext2D, shape: ShapeObject): void {
  let { x, y, width, height } = shape;
  // Normalize if dragged backwards
  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }

  ctx.save();
  ctx.strokeStyle = shape.strokeColor;
  ctx.fillStyle = shape.fillColor;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyLineStyle(ctx, shape.lineStyle, shape.strokeWidth);

  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;

  ctx.beginPath();

  switch (shape.shapeType) {
    case 'rectangle':
    case 'process':
      ctx.rect(x, y, width, height);
      break;

    case 'rounded-rectangle': {
      const radius = Math.min(width, height) * 0.15;
      ctx.roundRect(x, y, width, height, radius);
      break;
    }

    case 'circle': {
      const r = Math.min(width, height) / 2;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    }

    case 'ellipse':
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      break;

    case 'triangle':
      ctx.moveTo(cx, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      break;

    case 'diamond':
      ctx.moveTo(cx, y);
      ctx.lineTo(x + width, cy);
      ctx.lineTo(cx, y + height);
      ctx.lineTo(x, cy);
      ctx.closePath();
      break;

    case 'star': {
      const spikes = 5;
      const outerR = Math.min(width, height) / 2;
      const innerR = outerR * 0.45;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;

      ctx.moveTo(cx, cy - outerR);
      for (let i = 0; i < spikes; i++) {
        let px = cx + Math.cos(rot) * outerR;
        let py = cy + Math.sin(rot) * outerR;
        ctx.lineTo(px, py);
        rot += step;

        px = cx + Math.cos(rot) * innerR;
        py = cy + Math.sin(rot) * innerR;
        ctx.lineTo(px, py);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerR);
      ctx.closePath();
      break;
    }

    case 'pentagon': {
      const sides = 5;
      const r = Math.min(width, height) / 2;
      for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }

    case 'hexagon': {
      const sides = 6;
      const r = Math.min(width, height) / 2;
      for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI) / sides;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }

    case 'parallelogram': {
      const skew = width * 0.22;
      ctx.moveTo(x + skew, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width - skew, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      break;
    }

    case 'cylinder': {
      const capH = Math.min(height * 0.25, 25);
      // Top ellipse
      ctx.ellipse(cx, y + capH, rx, capH, 0, 0, Math.PI * 2);
      ctx.moveTo(x, y + capH);
      ctx.lineTo(x, y + height - capH);
      ctx.ellipse(cx, y + height - capH, rx, capH, 0, 0, Math.PI, false);
      ctx.lineTo(x + width, y + capH);
      break;
    }

    case 'document': {
      const wave = height * 0.1;
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + height - wave);
      ctx.quadraticCurveTo(
        x + width * 0.75,
        y + height,
        cx,
        y + height - wave
      );
      ctx.quadraticCurveTo(
        x + width * 0.25,
        y + height - wave * 2,
        x,
        y + height - wave
      );
      ctx.closePath();
      break;
    }
  }

  if (shape.fillColor && shape.fillColor !== 'transparent') {
    ctx.fill();
  }
  if (shape.strokeWidth > 0 && shape.strokeColor !== 'transparent') {
    ctx.stroke();
  }

  ctx.restore();
}

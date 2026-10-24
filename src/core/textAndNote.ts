import type { StickyNoteObject, TextObject } from '../types/board';

/**
 * Splits text into wrapped lines fitting within maxWidth.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para === '') {
      lines.push('');
      continue;
    }

    const words = para.split(' ');
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + ' ' + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width < maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Renders a TextObject on the canvas.
 */
export function renderText(ctx: CanvasRenderingContext2D, textObj: TextObject): void {
  ctx.save();
  const fontStyle = `${textObj.isItalic ? 'italic ' : ''}${textObj.isBold ? 'bold ' : ''}${textObj.fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.font = fontStyle;
  ctx.fillStyle = textObj.fontColor;
  ctx.textBaseline = 'top';

  const padding = 8;
  const usableWidth = Math.max(textObj.width - padding * 2, 50);
  const lines = wrapText(ctx, textObj.text || 'Double click to edit', usableWidth);
  const lineHeight = textObj.fontSize * 1.35;

  lines.forEach((line, index) => {
    let lineX = textObj.x + padding;
    if (textObj.align === 'center') {
      const lineWidth = ctx.measureText(line).width;
      lineX = textObj.x + (textObj.width - lineWidth) / 2;
    } else if (textObj.align === 'right') {
      const lineWidth = ctx.measureText(line).width;
      lineX = textObj.x + textObj.width - padding - lineWidth;
    }
    ctx.fillText(line, lineX, textObj.y + padding + index * lineHeight);
  });

  ctx.restore();
}

/**
 * Renders a StickyNoteObject on the canvas with realistic paper shadow and folded corner.
 */
export function renderStickyNote(
  ctx: CanvasRenderingContext2D,
  note: StickyNoteObject
): void {
  const { x, y, width, height, color, text, fontSize } = note;
  const foldSize = Math.min(22, width * 0.15, height * 0.15);

  ctx.save();

  // Subtle drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Note body polygon with folded bottom-right corner
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height - foldSize);
  ctx.lineTo(x + width - foldSize, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
  ctx.fill();

  // Reset shadow for folded corner triangle
  ctx.shadowColor = 'transparent';

  // Folded dog-ear triangle
  ctx.fillStyle = adjustBrightness(color, -25);
  ctx.beginPath();
  ctx.moveTo(x + width - foldSize, y + height);
  ctx.lineTo(x + width - foldSize, y + height - foldSize);
  ctx.lineTo(x + width, y + height - foldSize);
  ctx.closePath();
  ctx.fill();

  // Fold line border
  ctx.strokeStyle = adjustBrightness(color, -35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + width - foldSize, y + height);
  ctx.lineTo(x + width - foldSize, y + height - foldSize);
  ctx.lineTo(x + width, y + height - foldSize);
  ctx.stroke();

  // Note text
  const padding = 16;
  const usableWidth = Math.max(width - padding * 2, 50);
  ctx.font = `${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = '#1e293b';
  ctx.textBaseline = 'top';

  const lines = wrapText(ctx, text || 'Double click to add note', usableWidth);
  const lineHeight = fontSize * 1.35;

  lines.forEach((line, index) => {
    ctx.fillText(line, x + padding, y + padding + index * lineHeight);
  });

  ctx.restore();
}

function adjustBrightness(hex: string, percent: number): string {
  // Simple hex brightness adjustment
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  const num = parseInt(color, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

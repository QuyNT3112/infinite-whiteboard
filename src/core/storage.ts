import type { BoardObject, Camera } from '../types/board';
import { getCombinedBoundingBox } from './geometry';
import { renderSmoothStroke } from './spline';
import { renderLine, renderShape } from './shapes';
import { renderStickyNote, renderText } from './textAndNote';
import { getCachedImage, preloadImage } from './imageManager';

const STORAGE_KEY_OBJECTS = 'infinite_whiteboard_objects_v1';
const STORAGE_KEY_CAMERA = 'infinite_whiteboard_camera_v1';

export function saveBoardToStorage(objects: BoardObject[], camera: Camera): void {
  try {
    localStorage.setItem(STORAGE_KEY_OBJECTS, JSON.stringify(objects));
    localStorage.setItem(STORAGE_KEY_CAMERA, JSON.stringify(camera));
  } catch (err) {
    console.error('Failed to save whiteboard to localStorage:', err);
  }
}

export function loadBoardFromStorage(): { objects: BoardObject[]; camera: Camera | null } {
  try {
    const rawObjs = localStorage.getItem(STORAGE_KEY_OBJECTS);
    const rawCam = localStorage.getItem(STORAGE_KEY_CAMERA);
    const objects: BoardObject[] = rawObjs ? JSON.parse(rawObjs) : [];
    const camera: Camera | null = rawCam ? JSON.parse(rawCam) : null;
    return { objects, camera };
  } catch (err) {
    console.error('Failed to load whiteboard from localStorage:', err);
    return { objects: [], camera: null };
  }
}

export function clearBoardStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_OBJECTS);
    localStorage.removeItem(STORAGE_KEY_CAMERA);
  } catch (err) {
    console.error('Failed to clear whiteboard storage:', err);
  }
}

/**
 * Exports board data as a downloadable JSON file.
 */
export function exportBoardAsJson(objects: BoardObject[]): void {
  const data = JSON.stringify(
    {
      app: 'Microsoft Whiteboard Clone',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      objects,
    },
    null,
    2
  );

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Imports board objects from a JSON string or file.
 */
export function parseBoardJson(jsonString: string): BoardObject[] {
  const parsed = JSON.parse(jsonString);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && Array.isArray(parsed.objects)) {
    return parsed.objects;
  }
  throw new Error('Invalid whiteboard JSON format');
}

/**
 * Exports the entire board content as a high-resolution PNG image.
 */
export async function exportBoardAsPng(
  objects: BoardObject[],
  padding = 60,
  bgColor = '#ffffff'
): Promise<void> {
  if (objects.length === 0) {
    alert('Whiteboard is empty, nothing to export.');
    return;
  }

  const bounds = getCombinedBoundingBox(objects);
  if (!bounds) return;

  const width = Math.ceil(bounds.width + padding * 2);
  const height = Math.ceil(bounds.height + padding * 2);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background matching canvas theme
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Translate coordinates to center content on image
  ctx.save();
  ctx.translate(-bounds.minX + padding, -bounds.minY + padding);

  // Preload any images first
  for (const obj of objects) {
    if (obj.type === 'image') {
      try {
        await preloadImage(obj.src);
      } catch {
        // ignore load errors on export
      }
    }
  }

  // Render all objects in sequence
  for (const obj of objects) {
    switch (obj.type) {
      case 'stroke':
        renderSmoothStroke(ctx, obj.points, obj.color, obj.width, false);
        break;
      case 'highlighter':
        renderSmoothStroke(ctx, obj.points, obj.color, obj.width, true, obj.opacity);
        break;
      case 'shape':
        renderShape(ctx, obj);
        break;
      case 'line':
        renderLine(ctx, obj);
        break;
      case 'text':
        renderText(ctx, obj);
        break;
      case 'note':
        renderStickyNote(ctx, obj);
        break;
      case 'image': {
        const cached = getCachedImage(obj.src);
        if (cached) {
          ctx.drawImage(cached, obj.x, obj.y, obj.width, obj.height);
        }
        break;
      }
    }
  }

  ctx.restore();

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
  a.click();
}

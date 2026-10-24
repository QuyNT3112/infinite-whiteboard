import type { Camera, Point, BoardObject } from '../types/board';
import { getObjectBoundingBox } from './geometry';

export const MIN_ZOOM = 0.1; // 10%
export const MAX_ZOOM = 15.0; // 1500%
export const DEFAULT_CAMERA: Camera = {
  panX: 0,
  panY: 0,
  zoom: 1,
};

/**
 * Converts screen/pointer coordinates (clientX, clientY) to world canvas coordinates.
 */
export function screenToWorld(
  screenPoint: Point,
  camera: Camera,
  canvasRect: { left: number; top: number }
): Point {
  const localScreenX = screenPoint.x - canvasRect.left;
  const localScreenY = screenPoint.y - canvasRect.top;
  return {
    x: (localScreenX - camera.panX) / camera.zoom,
    y: (localScreenY - camera.panY) / camera.zoom,
  };
}

/**
 * Converts world canvas coordinates to viewport screen coordinates (relative to window/viewport).
 */
export function worldToScreen(
  worldPoint: Point,
  camera: Camera,
  canvasRect: { left: number; top: number }
): Point {
  return {
    x: worldPoint.x * camera.zoom + camera.panX + canvasRect.left,
    y: worldPoint.y * camera.zoom + camera.panY + canvasRect.top,
  };
}

/**
 * Converts world canvas coordinates to canvas element coordinates (relative to canvas top-left).
 */
export function worldToCanvas(worldPoint: Point, camera: Camera): Point {
  return {
    x: worldPoint.x * camera.zoom + camera.panX,
    y: worldPoint.y * camera.zoom + camera.panY,
  };
}

/**
 * Zooms around a specific screen point (e.g., mouse pointer).
 * Preserves the world position underneath the pointer.
 */
export function zoomAtScreenPoint(
  screenPoint: Point,
  targetZoom: number,
  currentCamera: Camera,
  canvasRect: { left: number; top: number },
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM
): Camera {
  const clampedZoom = Math.min(Math.max(targetZoom, minZoom), maxZoom);
  if (Math.abs(clampedZoom - currentCamera.zoom) < 1e-6) {
    return currentCamera;
  }

  // World point before zoom
  const localX = screenPoint.x - canvasRect.left;
  const localY = screenPoint.y - canvasRect.top;
  const worldX = (localX - currentCamera.panX) / currentCamera.zoom;
  const worldY = (localY - currentCamera.panY) / currentCamera.zoom;

  // New pan so that the same world point is at the same screen point:
  // localX = worldX * newZoom + newPanX  =>  newPanX = localX - worldX * newZoom
  const newPanX = localX - worldX * clampedZoom;
  const newPanY = localY - worldY * clampedZoom;

  return {
    panX: Math.round(newPanX * 100) / 100,
    panY: Math.round(newPanY * 100) / 100,
    zoom: Math.round(clampedZoom * 1000) / 1000,
  };
}

/**
 * Centers and fits the camera view around all existing board content.
 */
export function fitToContent(
  objects: BoardObject[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 80
): Camera {
  if (objects.length === 0) {
    return {
      panX: viewportWidth / 2,
      panY: viewportHeight / 2,
      zoom: 1,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    const box = getObjectBoundingBox(obj);
    if (box.minX < minX) minX = box.minX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.maxY > maxY) maxY = box.maxY;
  }

  const contentWidth = Math.max(maxX - minX, 100);
  const contentHeight = Math.max(maxY - minY, 100);

  const availableWidth = Math.max(viewportWidth - padding * 2, 100);
  const availableHeight = Math.max(viewportHeight - padding * 2, 100);

  const fitZoom = Math.min(
    availableWidth / contentWidth,
    availableHeight / contentHeight,
    1.5 // Don't overzoom small content
  );
  const clampedZoom = Math.min(Math.max(fitZoom, MIN_ZOOM), 2.0);

  const contentCenterX = (minX + maxX) / 2;
  const contentCenterY = (minY + maxY) / 2;

  const panX = viewportWidth / 2 - contentCenterX * clampedZoom;
  const panY = viewportHeight / 2 - contentCenterY * clampedZoom;

  return {
    panX: Math.round(panX),
    panY: Math.round(panY),
    zoom: Math.round(clampedZoom * 100) / 100,
  };
}

import type {
  BoardObject,
  BoundingBox,
  Point,
  ResizeHandle,
} from '../types/board';
import {
  distance,
  distancePointToSegment,
  getObjectBoundingBox,
  isPointInBox,
  isPointInsidePolygon,
  boxesOverlap,
} from './geometry';

export const HIT_TOLERANCE = 8; // world units default tolerance

/**
 * Checks if a world point hits a specific board object.
 */
export function isObjectHit(obj: BoardObject, point: Point, tolerance = HIT_TOLERANCE): boolean {
  const box = getObjectBoundingBox(obj);
  // Fast rejection
  if (!isPointInBox(point, box, tolerance)) {
    return false;
  }

  switch (obj.type) {
    case 'image':
    case 'text':
    case 'note':
      // Images, text, and sticky notes are solid cards
      return (
        point.x >= obj.x - tolerance &&
        point.x <= obj.x + obj.width + tolerance &&
        point.y >= obj.y - tolerance &&
        point.y <= obj.y + obj.height + tolerance
      );

    case 'stroke':
    case 'highlighter': {
      const pad = obj.width / 2 + tolerance;
      if (obj.points.length === 1) {
        return distance(point, obj.points[0]) <= pad;
      }
      for (let i = 0; i < obj.points.length - 1; i++) {
        if (distancePointToSegment(point, obj.points[i], obj.points[i + 1]) <= pad) {
          return true;
        }
      }
      return false;
    }

    case 'line': {
      const pad = obj.strokeWidth / 2 + tolerance;
      return (
        distancePointToSegment(
          point,
          { x: obj.x1, y: obj.y1 },
          { x: obj.x2, y: obj.y2 }
        ) <= pad
      );
    }

    case 'shape': {
      return isShapeHit(obj, point, tolerance);
    }
  }
}

function isShapeHit(
  shape: Extract<BoardObject, { type: 'shape' }>,
  point: Point,
  tolerance: number
): boolean {
  const { x, y, width, height, shapeType, fillColor } = shape;
  const isFilled = fillColor !== 'transparent' && fillColor !== '';

  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = Math.abs(width) / 2;
  const ry = Math.abs(height) / 2;

  switch (shapeType) {
    case 'circle':
    case 'ellipse': {
      if (rx === 0 || ry === 0) return false;
      const normalizedDist =
        Math.pow((point.x - cx) / (rx + tolerance), 2) +
        Math.pow((point.y - cy) / (ry + tolerance), 2);

      if (isFilled) {
        return normalizedDist <= 1;
      } else {
        // Outline only
        const innerNormalizedDist =
          Math.pow((point.x - cx) / Math.max(rx - tolerance, 1), 2) +
          Math.pow((point.y - cy) / Math.max(ry - tolerance, 1), 2);
        return normalizedDist <= 1.05 && innerNormalizedDist >= 0.95;
      }
    }

    case 'rectangle':
    case 'rounded-rectangle':
    case 'process':
      if (isFilled) {
        return (
          point.x >= x - tolerance &&
          point.x <= x + width + tolerance &&
          point.y >= y - tolerance &&
          point.y <= y + height + tolerance
        );
      } else {
        // Near edges
        const left = Math.abs(point.x - x) <= tolerance && point.y >= y && point.y <= y + height;
        const right =
          Math.abs(point.x - (x + width)) <= tolerance &&
          point.y >= y &&
          point.y <= y + height;
        const top = Math.abs(point.y - y) <= tolerance && point.x >= x && point.x <= x + width;
        const bottom =
          Math.abs(point.y - (y + height)) <= tolerance &&
          point.x >= x &&
          point.x <= x + width;
        return left || right || top || bottom;
      }

    case 'triangle': {
      const p1 = { x: cx, y: y };
      const p2 = { x: x + width, y: y + height };
      const p3 = { x: x, y: y + height };
      if (isFilled) {
        return isPointInsidePolygon(point, [p1, p2, p3]);
      } else {
        const d1 = distancePointToSegment(point, p1, p2);
        const d2 = distancePointToSegment(point, p2, p3);
        const d3 = distancePointToSegment(point, p3, p1);
        return Math.min(d1, d2, d3) <= tolerance;
      }
    }

    case 'diamond': {
      const p1 = { x: cx, y: y };
      const p2 = { x: x + width, y: cy };
      const p3 = { x: cx, y: y + height };
      const p4 = { x: x, y: cy };
      if (isFilled) {
        return isPointInsidePolygon(point, [p1, p2, p3, p4]);
      } else {
        return (
          Math.min(
            distancePointToSegment(point, p1, p2),
            distancePointToSegment(point, p2, p3),
            distancePointToSegment(point, p3, p4),
            distancePointToSegment(point, p4, p1)
          ) <= tolerance
        );
      }
    }

    case 'parallelogram': {
      const skew = width * 0.2;
      const p1 = { x: x + skew, y: y };
      const p2 = { x: x + width, y: y };
      const p3 = { x: x + width - skew, y: y + height };
      const p4 = { x: x, y: y + height };
      if (isFilled) {
        return isPointInsidePolygon(point, [p1, p2, p3, p4]);
      } else {
        return (
          Math.min(
            distancePointToSegment(point, p1, p2),
            distancePointToSegment(point, p2, p3),
            distancePointToSegment(point, p3, p4),
            distancePointToSegment(point, p4, p1)
          ) <= tolerance
        );
      }
    }

    default:
      // General polygon / shapes
      return (
        point.x >= x - tolerance &&
        point.x <= x + width + tolerance &&
        point.y >= y - tolerance &&
        point.y <= y + height + tolerance
      );
  }
}

/**
 * Finds top-most object at world coordinates (searches in reverse render order).
 */
export function hitTestTopObject(
  objects: BoardObject[],
  point: Point,
  tolerance = HIT_TOLERANCE
): BoardObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    if (isObjectHit(objects[i], point, tolerance)) {
      return objects[i];
    }
  }
  return null;
}

/**
 * Finds all objects within or overlapping a marquee selection box.
 */
export function hitTestMarquee(objects: BoardObject[], selectionBox: BoundingBox): BoardObject[] {
  return objects.filter((obj) => {
    const box = getObjectBoundingBox(obj);
    return boxesOverlap(box, selectionBox);
  });
}

/**
 * Computes 8 resize handles for a bounding box.
 */
export function getResizeHandles(
  box: BoundingBox
): { handle: ResizeHandle; point: Point }[] {
  const minX = box.minX;
  const minY = box.minY;
  const maxX = box.maxX;
  const maxY = box.maxY;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  return [
    { handle: 'nw', point: { x: minX, y: minY } },
    { handle: 'n', point: { x: midX, y: minY } },
    { handle: 'ne', point: { x: maxX, y: minY } },
    { handle: 'e', point: { x: maxX, y: midY } },
    { handle: 'se', point: { x: maxX, y: maxY } },
    { handle: 's', point: { x: midX, y: maxY } },
    { handle: 'sw', point: { x: minX, y: maxY } },
    { handle: 'w', point: { x: minX, y: midY } },
  ];
}

/**
 * Hit tests resize handles using world coordinates and screen-scaled radius.
 */
export function hitTestResizeHandle(
  box: BoundingBox,
  point: Point,
  handleWorldRadius: number
): ResizeHandle | null {
  const handles = getResizeHandles(box);
  for (const h of handles) {
    if (distance(point, h.point) <= handleWorldRadius) {
      return h.handle;
    }
  }
  return null;
}

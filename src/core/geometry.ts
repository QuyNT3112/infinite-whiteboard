import type { BoardObject, BoundingBox, Point } from '../types/board';

export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

export function distanceSq(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

/**
 * Calculates perpendicular distance from point p to line segment (a, b).
 */
export function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return distance(p, a);
  }

  // Projection scalar t on segment [0, 1]
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Computes exact axis-aligned bounding box (AABB) for any board object.
 */
export function getObjectBoundingBox(obj: BoardObject): BoundingBox {
  switch (obj.type) {
    case 'stroke':
    case 'highlighter': {
      if (!obj.points || obj.points.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
      }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const pad = obj.width / 2;

      for (const pt of obj.points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      }

      minX -= pad;
      minY -= pad;
      maxX += pad;
      maxY += pad;

      return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(maxX - minX, 1),
        height: Math.max(maxY - minY, 1),
      };
    }

    case 'image':
    case 'shape':
    case 'text':
    case 'note': {
      const minX = obj.x;
      const minY = obj.y;
      const maxX = obj.x + obj.width;
      const maxY = obj.y + obj.height;
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(obj.width, 1),
        height: Math.max(obj.height, 1),
      };
    }

    case 'line': {
      const pad = Math.max(obj.strokeWidth, 8);
      const minX = Math.min(obj.x1, obj.x2) - pad;
      const minY = Math.min(obj.y1, obj.y2) - pad;
      const maxX = Math.max(obj.x1, obj.x2) + pad;
      const maxY = Math.max(obj.y1, obj.y2) + pad;
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
  }
}

export function isPointInBox(p: Point, box: BoundingBox, margin = 0): boolean {
  return (
    p.x >= box.minX - margin &&
    p.x <= box.maxX + margin &&
    p.y >= box.minY - margin &&
    p.y <= box.maxY + margin
  );
}

export function boxesOverlap(b1: BoundingBox, b2: BoundingBox): boolean {
  return !(
    b1.maxX < b2.minX ||
    b1.minX > b2.maxX ||
    b1.maxY < b2.minY ||
    b1.minY > b2.maxY
  );
}

export function getCombinedBoundingBox(objects: BoardObject[]): BoundingBox | null {
  if (objects.length === 0) return null;

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

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Standard ray-casting algorithm to test if point is inside a 2D polygon.
 */
export function isPointInsidePolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

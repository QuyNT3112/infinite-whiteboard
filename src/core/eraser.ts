import type { BoardObject, Point, StrokePoint } from '../types/board';
import { distance, distancePointToSegment, getObjectBoundingBox, isPointInBox } from './geometry';

export interface EraseResult {
  updatedObjects: BoardObject[];
  hasChanged: boolean;
  erasedCount: number;
}

/**
 * Geometric stroke-only eraser.
 *
 * CRITICAL SAFETY RULES:
 * 1. ImageObject is 100% PROTECTED: Never deleted or modified by eraser.
 * 2. TextObject, StickyNoteObject, ShapeObject, LineObject are 100% PROTECTED.
 * 3. Only 'stroke' and 'highlighter' objects can be erased.
 * 4. Erases geometrically: splits intersected strokes into unaffected remaining segments.
 */
export function applyEraser(
  objects: BoardObject[],
  eraserWorldPoint: Point,
  eraserWorldRadius: number
): EraseResult {
  let hasChanged = false;
  let erasedCount = 0;
  const updatedObjects: BoardObject[] = [];

  for (const obj of objects) {
    // 1. STRICT TYPE FILTER: Non-stroke objects are completely untouched and immune
    if (obj.type !== 'stroke' && obj.type !== 'highlighter') {
      updatedObjects.push(obj);
      continue;
    }

    const strokePad = obj.width / 2;
    const hitRadius = eraserWorldRadius + strokePad;

    // 2. Fast bounding-box rejection test
    const box = getObjectBoundingBox(obj);
    if (!isPointInBox(eraserWorldPoint, box, hitRadius)) {
      updatedObjects.push(obj);
      continue;
    }

    const points = obj.points;
    if (!points || points.length === 0) {
      hasChanged = true;
      erasedCount++;
      continue;
    }

    // 3. Segment & Point intersection test with splitting
    const remainingChunks: StrokePoint[][] = [];
    let currentChunk: StrokePoint[] = [];
    let strokeHit = false;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const ptDist = distance(pt, eraserWorldPoint);
      const isPtHit = ptDist <= hitRadius;

      if (!isPtHit) {
        // If currentChunk already has a point, check if the segment between
        // the previous point and this point crossed through the eraser circle
        if (currentChunk.length > 0) {
          const prevPt = currentChunk[currentChunk.length - 1];
          const segDist = distancePointToSegment(eraserWorldPoint, prevPt, pt);
          if (segDist <= hitRadius) {
            // Cut between prevPt and pt
            strokeHit = true;
            remainingChunks.push(currentChunk);
            currentChunk = [pt];
            continue;
          }
        }
        currentChunk.push(pt);
      } else {
        // This point is inside the eraser circle
        strokeHit = true;
        if (currentChunk.length > 0) {
          remainingChunks.push(currentChunk);
          currentChunk = [];
        }
      }
    }

    if (currentChunk.length > 0) {
      remainingChunks.push(currentChunk);
    }

    if (!strokeHit) {
      // Stroke was within AABB but missed all actual segments/points
      updatedObjects.push(obj);
      continue;
    }

    // Stroke was hit
    hasChanged = true;
    erasedCount++;

    // Filter valid remaining chunks (keep any chunk with at least 1 point)
    const validChunks = remainingChunks.filter((chunk) => chunk.length > 0);

    // If valid chunks remain, preserve them as sub-strokes
    for (let cIdx = 0; cIdx < validChunks.length; cIdx++) {
      const chunk = validChunks[cIdx];
      updatedObjects.push({
        ...obj,
        id: cIdx === 0 ? obj.id : `${obj.id}-split-${cIdx}-${Math.random().toString(36).substring(2, 7)}`,
        points: chunk,
      });
    }
  }

  return {
    updatedObjects,
    hasChanged,
    erasedCount,
  };
}

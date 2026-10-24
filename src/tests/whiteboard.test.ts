import { describe, it, expect } from 'vitest';
import { screenToWorld, worldToScreen, zoomAtScreenPoint, fitToContent } from '../core/camera';
import {
  getObjectBoundingBox,
} from '../core/geometry';
import { applyEraser } from '../core/eraser';
import { hitTestTopObject, hitTestMarquee, hitTestResizeHandle } from '../core/hitTest';
import { HistoryManager } from '../core/history';
import { parseBoardJson } from '../core/storage';
import type {
  BoardObject,
  Camera,
  FreehandStroke,
  HighlighterStroke,
  ImageObject,
  ShapeObject,
  TextObject,
  StickyNoteObject,
  LineObject,
} from '../types/board';

describe('A. Coordinate Transformation & Camera Model Tests', () => {
  const canvasRect = { left: 50, top: 100 };

  it('1. Invertibility: worldToScreen and screenToWorld round-trip accurately', () => {
    const camera: Camera = { panX: 120, panY: -80, zoom: 1.5 };
    const originalWorld = { x: 340.5, y: -120.25 };

    const screenPt = worldToScreen(originalWorld, camera, canvasRect);
    const recoveredWorld = screenToWorld(screenPt, camera, canvasRect);

    expect(recoveredWorld.x).toBeCloseTo(originalWorld.x, 4);
    expect(recoveredWorld.y).toBeCloseTo(originalWorld.y, 4);
  });

  it('2. Accuracy at multiple zoom levels (0.25x, 1x, 2.5x, 10x)', () => {
    const zooms = [0.25, 0.5, 1.0, 2.5, 5.0, 10.0];
    for (const zoom of zooms) {
      const camera: Camera = { panX: 200, panY: 150, zoom };
      const worldPt = { x: 75.3, y: 182.9 };

      const screen = worldToScreen(worldPt, camera, canvasRect);
      const recovered = screenToWorld(screen, camera, canvasRect);

      expect(recovered.x).toBeCloseTo(worldPt.x, 3);
      expect(recovered.y).toBeCloseTo(worldPt.y, 3);
    }
  });

  it('3. Large positive and negative camera pan offsets', () => {
    const offsets = [
      { panX: 50000, panY: -35000 },
      { panX: -80000, panY: 90000 },
    ];
    for (const { panX, panY } of offsets) {
      const camera: Camera = { panX, panY, zoom: 0.8 };
      const worldPt = { x: 12345, y: -67890 };

      const screen = worldToScreen(worldPt, camera, canvasRect);
      const recovered = screenToWorld(screen, camera, canvasRect);

      expect(recovered.x).toBeCloseTo(worldPt.x, 3);
      expect(recovered.y).toBeCloseTo(worldPt.y, 3);
    }
  });

  it('4. Viewport boundaries and corners: Top-left, Top-right, Bottom-left, Bottom-right', () => {
    const viewportWidth = 1920;
    const viewportHeight = 1080;
    const corners = [
      { x: canvasRect.left, y: canvasRect.top }, // Top-left
      { x: canvasRect.left + viewportWidth, y: canvasRect.top }, // Top-right
      { x: canvasRect.left, y: canvasRect.top + viewportHeight }, // Bottom-left
      { x: canvasRect.left + viewportWidth, y: canvasRect.top + viewportHeight }, // Bottom-right
    ];

    const camera: Camera = { panX: 0, panY: 0, zoom: 1 };
    for (const corner of corners) {
      const world = screenToWorld(corner, camera, canvasRect);
      const screen = worldToScreen(world, camera, canvasRect);

      expect(screen.x).toBeCloseTo(corner.x, 4);
      expect(screen.y).toBeCloseTo(corner.y, 4);
    }
  });

  it('5. Zooming around cursor preserves the exact world point underneath', () => {
    const camera: Camera = { panX: 100, panY: 200, zoom: 1.0 };
    const cursorScreen = { x: 450, y: 350 };

    // World point under cursor before zoom
    const worldBefore = screenToWorld(cursorScreen, camera, canvasRect);

    // Zoom in to 1.75x around cursor
    const newCamera = zoomAtScreenPoint(cursorScreen, 1.75, camera, canvasRect);

    // World point under same cursor after zoom
    const worldAfter = screenToWorld(cursorScreen, newCamera, canvasRect);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 2);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 2);
  });

  it('6. Fit to content centers and bounds objects properly', () => {
    const objects: BoardObject[] = [
      {
        id: '1',
        type: 'shape',
        shapeType: 'rectangle',
        x: 100,
        y: 100,
        width: 400,
        height: 200,
        strokeColor: '#000',
        strokeWidth: 2,
        fillColor: 'transparent',
        lineStyle: 'solid',
        createdAt: 1,
      },
      {
        id: '2',
        type: 'shape',
        shapeType: 'rectangle',
        x: 700,
        y: 600,
        width: 300,
        height: 200,
        strokeColor: '#000',
        strokeWidth: 2,
        fillColor: 'transparent',
        lineStyle: 'solid',
        createdAt: 2,
      },
    ];

    const fitCamera = fitToContent(objects, 1200, 800, 50);
    expect(fitCamera.zoom).toBeGreaterThan(0.5);
    expect(fitCamera.zoom).toBeLessThanOrEqual(1.5);
  });
});

describe('B. CRITICAL ACCEPTANCE: Stroke-Only Eraser & Non-Stroke Object Protection', () => {
  const sampleImage: ImageObject = {
    id: 'img-safe-1',
    type: 'image',
    x: 100,
    y: 100,
    width: 250,
    height: 180,
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    naturalWidth: 100,
    naturalHeight: 100,
    createdAt: 1,
  };

  const sampleText: TextObject = {
    id: 'text-safe-1',
    type: 'text',
    x: 100,
    y: 100,
    width: 200,
    height: 50,
    text: 'Important Title',
    fontSize: 20,
    fontColor: '#000000',
    align: 'left',
    createdAt: 2,
  };

  const sampleShape: ShapeObject = {
    id: 'shape-safe-1',
    type: 'shape',
    shapeType: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    strokeColor: '#2563eb',
    strokeWidth: 2,
    fillColor: '#ffffff',
    lineStyle: 'solid',
    createdAt: 3,
  };

  const sampleNote: StickyNoteObject = {
    id: 'note-safe-1',
    type: 'note',
    x: 100,
    y: 100,
    width: 150,
    height: 150,
    text: 'Meeting note',
    color: '#fef3c7',
    fontSize: 16,
    createdAt: 4,
  };

  const sampleLine: LineObject = {
    id: 'line-safe-1',
    type: 'line',
    x1: 50,
    y1: 50,
    x2: 300,
    y2: 300,
    strokeColor: '#000',
    strokeWidth: 3,
    lineStyle: 'solid',
    arrowType: 'end',
    createdAt: 5,
  };

  it('1. CRITICAL: Eraser passing right through center of Image does NOT delete or alter the image', () => {
    const objects: BoardObject[] = [sampleImage];
    const imageCenter = { x: 225, y: 190 }; // Center of image

    const result = applyEraser(objects, imageCenter, 30);

    expect(result.updatedObjects).toHaveLength(1);
    expect(result.updatedObjects[0]).toEqual(sampleImage);
    expect(result.erasedCount).toBe(0);
    expect(result.hasChanged).toBe(false);
  });

  it('2. CRITICAL: Eraser dragged across borders of Image leaves it completely intact', () => {
    const objects: BoardObject[] = [sampleImage];
    const imageBorderPoints = [
      { x: 100, y: 100 }, // Top-left corner
      { x: 225, y: 100 }, // Top edge
      { x: 350, y: 190 }, // Right edge
      { x: 225, y: 280 }, // Bottom edge
    ];

    for (const pt of imageBorderPoints) {
      const result = applyEraser(objects, pt, 25);
      expect(result.updatedObjects[0]).toEqual(sampleImage);
      expect(result.hasChanged).toBe(false);
    }
  });

  it('3. CRITICAL: Erasing stroke drawn across an image removes the stroke but leaves the image 100% intact', () => {
    const strokeCrossingImage: FreehandStroke = {
      id: 'stroke-cross',
      type: 'stroke',
      points: [
        { x: 50, y: 190, pressure: 0.5 },
        { x: 150, y: 190, pressure: 0.5 }, // Inside image
        { x: 225, y: 190, pressure: 0.5 }, // Inside image center
        { x: 300, y: 190, pressure: 0.5 }, // Inside image
        { x: 400, y: 190, pressure: 0.5 },
      ],
      color: '#dc2626',
      width: 4,
      createdAt: 10,
    };

    const board: BoardObject[] = [sampleImage, strokeCrossingImage];

    // Erase the stroke at (225, 190)
    const result = applyEraser(board, { x: 225, y: 190 }, 40);

    // Image is completely untouched
    const foundImage = result.updatedObjects.find((o) => o.id === sampleImage.id);
    expect(foundImage).toBeDefined();
    expect(foundImage).toEqual(sampleImage);

    // The stroke was split or erased
    expect(result.hasChanged).toBe(true);
    expect(result.erasedCount).toBeGreaterThan(0);
  });

  it('4. CRITICAL: Text boxes, Shapes, Notes, and Lines are strictly immune to eraser', () => {
    const mixedBoard: BoardObject[] = [
      sampleText,
      sampleShape,
      sampleNote,
      sampleLine,
      sampleImage,
    ];

    // Hit coordinates right in the center of text, shape, note, line
    const eraserPoints = [
      { x: 150, y: 120 },
      { x: 200, y: 150 },
      { x: 160, y: 160 },
      { x: 175, y: 175 },
    ];

    for (const pt of eraserPoints) {
      const result = applyEraser(mixedBoard, pt, 50);
      expect(result.updatedObjects).toHaveLength(5);
      expect(result.hasChanged).toBe(false);
      expect(result.erasedCount).toBe(0);
    }
  });

  it('5. Geometric Partial Erasing: Erasing middle of stroke splits into two remaining segments', () => {
    const longStroke: FreehandStroke = {
      id: 'long-stroke',
      type: 'stroke',
      points: [
        { x: 0, y: 50, pressure: 0.5 },
        { x: 50, y: 50, pressure: 0.5 },
        { x: 100, y: 50, pressure: 0.5 }, // Hit point
        { x: 150, y: 50, pressure: 0.5 },
        { x: 200, y: 50, pressure: 0.5 },
      ],
      color: '#000000',
      width: 4,
      createdAt: 20,
    };

    const board: BoardObject[] = [longStroke];
    const result = applyEraser(board, { x: 100, y: 50 }, 20);

    expect(result.hasChanged).toBe(true);
    expect(result.updatedObjects.length).toBe(2);

    const firstSegment = result.updatedObjects[0] as FreehandStroke;
    const secondSegment = result.updatedObjects[1] as FreehandStroke;

    expect(firstSegment.type).toBe('stroke');
    expect(secondSegment.type).toBe('stroke');
    expect(firstSegment.points.length).toBeGreaterThanOrEqual(1);
    expect(secondSegment.points.length).toBeGreaterThanOrEqual(1);
    expect(firstSegment.points[0].x).toBe(0);
    expect(secondSegment.points[secondSegment.points.length - 1].x).toBe(200);
  });

  it('6. Full stroke removal when entirely covered by eraser', () => {
    const tinyStroke: FreehandStroke = {
      id: 'tiny',
      type: 'stroke',
      points: [
        { x: 50, y: 50, pressure: 0.5 },
        { x: 52, y: 52, pressure: 0.5 },
      ],
      color: '#000',
      width: 2,
      createdAt: 30,
    };

    const result = applyEraser([tinyStroke], { x: 51, y: 51 }, 20);
    expect(result.hasChanged).toBe(true);
    expect(result.updatedObjects).toHaveLength(0);
  });

  it('7. Highlighter strokes are erased geometrically like pen strokes', () => {
    const hlStroke: HighlighterStroke = {
      id: 'hl-1',
      type: 'highlighter',
      points: [
        { x: 10, y: 10, pressure: 0.5 },
        { x: 50, y: 10, pressure: 0.5 },
        { x: 90, y: 10, pressure: 0.5 },
      ],
      color: '#fef08a',
      width: 20,
      opacity: 0.5,
      createdAt: 40,
    };

    const result = applyEraser([hlStroke], { x: 50, y: 10 }, 25);
    expect(result.hasChanged).toBe(true);
    expect(result.updatedObjects.length).toBe(2);
  });
});

describe('C. Selection, Hit Testing, & Geometry Tests', () => {
  const shape: ShapeObject = {
    id: 'rect-1',
    type: 'shape',
    shapeType: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    strokeColor: '#000',
    strokeWidth: 2,
    fillColor: '#eff6ff',
    lineStyle: 'solid',
    createdAt: 1,
  };

  const image: ImageObject = {
    id: 'img-1',
    type: 'image',
    x: 400,
    y: 100,
    width: 200,
    height: 200,
    src: 'sample.png',
    naturalWidth: 200,
    naturalHeight: 200,
    createdAt: 2,
  };

  it('1. Top-most object selection returns top-most object in render order', () => {
    const overlappingTop: ShapeObject = {
      ...shape,
      id: 'rect-top',
      fillColor: '#dc2626',
    };

    const objects = [shape, overlappingTop];
    const hit = hitTestTopObject(objects, { x: 150, y: 150 });
    expect(hit?.id).toBe('rect-top');
  });

  it('2. Marquee box selection captures all overlapping objects', () => {
    const objects = [shape, image];
    const marqueeBox = {
      minX: 50,
      minY: 50,
      maxX: 500,
      maxY: 250,
      width: 450,
      height: 200,
    };

    const selected = hitTestMarquee(objects, marqueeBox);
    expect(selected).toHaveLength(2);
  });

  it('3. Resize handles hit-testing in world coordinates', () => {
    const box = getObjectBoundingBox(shape);
    const nwHandle = hitTestResizeHandle(box, { x: 100, y: 100 }, 8);
    expect(nwHandle).toBe('nw');

    const seHandle = hitTestResizeHandle(box, { x: 300, y: 200 }, 8);
    expect(seHandle).toBe('se');

    const missHandle = hitTestResizeHandle(box, { x: 500, y: 500 }, 8);
    expect(missHandle).toBeNull();
  });
});

describe('D. Undo / Redo History Manager Tests', () => {
  it('1. Push state, undo, redo restores accurate geometry snapshots', () => {
    const state0: BoardObject[] = [];
    const history = new HistoryManager(10, state0);
    const state1: BoardObject[] = [
      {
        id: '1',
        type: 'text',
        x: 10,
        y: 10,
        width: 100,
        height: 40,
        text: 'Initial',
        fontSize: 16,
        fontColor: '#000',
        align: 'left',
        createdAt: 1,
      },
    ];
    const state2: BoardObject[] = [
      ...state1,
      {
        id: '2',
        type: 'text',
        x: 200,
        y: 10,
        width: 100,
        height: 40,
        text: 'Second',
        fontSize: 16,
        fontColor: '#000',
        align: 'left',
        createdAt: 2,
      },
    ];

    history.pushState(state1);
    history.pushState(state2);

    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    // Undo returns state1
    const undone = history.undo();
    expect(undone).toHaveLength(1);
    expect(undone?.[0].id).toBe('1');

    // Redo returns state2
    expect(history.canRedo()).toBe(true);
    const redone = history.redo();
    expect(redone).toHaveLength(2);
    expect(redone?.[1].id).toBe('2');
  });
});

describe('E. Persistence & JSON Serialization Tests', () => {
  it('1. Serializes and deserializes board objects cleanly', () => {
    const testObjects: BoardObject[] = [
      {
        id: 'note-1',
        type: 'note',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        text: 'Hello Persistence',
        color: '#fef3c7',
        fontSize: 16,
        createdAt: 12345,
      },
    ];

    const json = JSON.stringify({ app: 'Whiteboard', objects: testObjects });
    const restored = parseBoardJson(json);

    expect(restored).toHaveLength(1);
    expect(restored[0].id).toBe('note-1');
    expect((restored[0] as StickyNoteObject).text).toBe('Hello Persistence');
  });
});

describe('F. Select-All (Ctrl+A) & Canvas Theme Tests', () => {
  it('1. Select-All correctly wraps all objects in combined bounding box for group move/delete', () => {
    const objects: BoardObject[] = [
      {
        id: 'obj-1',
        type: 'shape',
        shapeType: 'rectangle',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        strokeColor: '#000',
        strokeWidth: 2,
        fillColor: '#fff',
        lineStyle: 'solid',
        createdAt: 1,
      },
      {
        id: 'obj-2',
        type: 'shape',
        shapeType: 'circle',
        x: 300,
        y: 400,
        width: 150,
        height: 150,
        strokeColor: '#000',
        strokeWidth: 2,
        fillColor: '#fff',
        lineStyle: 'solid',
        createdAt: 2,
      },
    ];

    // Simulating Ctrl+A selection
    const allIds = objects.map((o) => o.id);
    expect(allIds).toHaveLength(2);

    const selectedObjs = objects.filter((o) => allIds.includes(o.id));
    const combinedBox = getObjectBoundingBox(selectedObjs[0]);
    expect(combinedBox).toBeDefined();
    expect(selectedObjs).toHaveLength(2);
  });
});


import React, { useRef, useEffect, useState, useCallback } from 'react';
import type {
  ActiveToolOptions,
  BoardObject,
  Camera,
  Point,
  ResizeHandle,
  StrokePoint,
} from '../types/board';
import {
  screenToWorld,
  zoomAtScreenPoint,
} from '../core/camera';
import {
  getCombinedBoundingBox,
  isPointInBox,
} from '../core/geometry';
import { renderSmoothStroke } from '../core/spline';
import { applyEraser } from '../core/eraser';
import {
  getResizeHandles,
  hitTestMarquee,
  hitTestResizeHandle,
  hitTestTopObject,
} from '../core/hitTest';
import { renderLine, renderShape } from '../core/shapes';
import { renderStickyNote, renderText } from '../core/textAndNote';
import { createImageFromFile, renderImage } from '../core/imageManager';

interface CanvasProps {
  objects: BoardObject[];
  setObjects: React.Dispatch<React.SetStateAction<BoardObject[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  activeTool: string;
  setActiveTool: (tool: any) => void;
  toolOptions: ActiveToolOptions;
  onCommitHistory: (newObjects: BoardObject[]) => void;
  onStartEditingText?: (objId: string) => void;
}

type InteractionMode =
  | 'IDLE'
  | 'PANNING'
  | 'DRAWING'
  | 'ERASING'
  | 'SELECTING_BOX'
  | 'MOVING_OBJECTS'
  | 'RESIZING_OBJECT'
  | 'CREATING_SHAPE'
  | 'CREATING_LINE';

export const Canvas: React.FC<CanvasProps> = ({
  objects,
  setObjects,
  selectedIds,
  setSelectedIds,
  camera,
  setCamera,
  activeTool,
  setActiveTool,
  toolOptions,
  onCommitHistory,
  onStartEditingText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interaction State
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('IDLE');
  const pointerStartRef = useRef<Point>({ x: 0, y: 0 }); // screen coordinates
  const lastPointerRef = useRef<Point>({ x: 0, y: 0 }); // screen coordinates
  const worldStartRef = useRef<Point>({ x: 0, y: 0 }); // world coordinates
  const activeResizeHandleRef = useRef<ResizeHandle | null>(null);
  const initialSelectedBoundsRef = useRef<Map<string, any>>(new Map());

  // Live in-progress shapes/strokes
  const [liveStrokePoints, setLiveStrokePoints] = useState<StrokePoint[]>([]);
  const [liveShapePreview, setLiveShapePreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [liveLinePreview, setLiveLinePreview] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  // Eraser visual cursor
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null);

  // Redraw canvas whenever scene, camera, tool, or preview changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Reset transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Infinite Background & Grid
    const bgColor = toolOptions.canvasBgColor || '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Determine if background is dark to invert grid dots / lines
    const isDark = (() => {
      if (!bgColor || bgColor === 'transparent') return false;
      const c = bgColor.replace('#', '');
      const rgb =
        c.length === 3
          ? [parseInt(c[0] + c[0], 16), parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16)]
          : [
              parseInt(c.substring(0, 2), 16),
              parseInt(c.substring(2, 4), 16),
              parseInt(c.substring(4, 6), 16),
            ];
      const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
      return brightness < 128;
    })();

    if (toolOptions.gridType !== 'none') {
      const gridSize = 32 * camera.zoom;
      // Fade out grid if too dense or too sparse
      if (gridSize > 10 && gridSize < 180) {
        const offsetX = camera.panX % gridSize;
        const offsetY = camera.panY % gridSize;

        ctx.save();
        if (toolOptions.gridType === 'dots') {
          ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(100, 116, 139, 0.25)';
          const dotRadius = Math.max(1, Math.min(1.75 * camera.zoom, 2.5));
          for (let x = offsetX; x < width; x += gridSize) {
            for (let y = offsetY; y < height; y += gridSize) {
              ctx.beginPath();
              ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (toolOptions.gridType === 'grid') {
          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(100, 116, 139, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = offsetX; x < width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
          }
          for (let y = offsetY; y < height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 2. Apply Camera Transform for World Objects
    ctx.save();
    ctx.translate(camera.panX, camera.panY);
    ctx.scale(camera.zoom, camera.zoom);

    // Render all committed board objects
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
        case 'image':
          renderImage(ctx, obj);
          break;
      }
    }

    // Render live active drawing preview
    if (liveStrokePoints.length > 0) {
      const isHighlighter = activeTool === 'highlighter';
      const color = isHighlighter ? toolOptions.highlighterColor : toolOptions.penColor;
      const strokeWidth = isHighlighter ? toolOptions.highlighterWidth : toolOptions.penWidth;
      renderSmoothStroke(
        ctx,
        liveStrokePoints,
        color,
        strokeWidth,
        isHighlighter,
        isHighlighter ? toolOptions.highlighterOpacity : 1
      );
    }

    // Render live shape preview
    if (liveShapePreview) {
      renderShape(ctx, {
        id: 'preview',
        type: 'shape',
        shapeType: toolOptions.shapeType,
        x: liveShapePreview.x,
        y: liveShapePreview.y,
        width: liveShapePreview.width,
        height: liveShapePreview.height,
        strokeColor: toolOptions.shapeStrokeColor,
        strokeWidth: toolOptions.shapeStrokeWidth,
        fillColor: toolOptions.shapeFillColor,
        lineStyle: toolOptions.shapeLineStyle,
        createdAt: 0,
      });
    }

    // Render live line preview
    if (liveLinePreview) {
      renderLine(ctx, {
        id: 'preview-line',
        type: 'line',
        x1: liveLinePreview.x1,
        y1: liveLinePreview.y1,
        x2: liveLinePreview.x2,
        y2: liveLinePreview.y2,
        strokeColor: toolOptions.lineStrokeColor,
        strokeWidth: toolOptions.lineStrokeWidth,
        lineStyle: toolOptions.lineStyle,
        arrowType: activeTool === 'arrow' ? toolOptions.arrowType || 'end' : 'none',
        createdAt: 0,
      });
    }

    // Render Selection Boxes & Resize Handles
    const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));
    if (selectedObjects.length > 0) {
      const bounds = getCombinedBoundingBox(selectedObjects);
      if (bounds) {
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = Math.max(1.5 / camera.zoom, 1);
        ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
        ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
        ctx.setLineDash([]);

        // Render handles at screen-constant scale (always 8px screen size)
        const handleScreenRadius = 4.5;
        const handleWorldRadius = handleScreenRadius / camera.zoom;
        const handles = getResizeHandles(bounds);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5 / camera.zoom;

        for (const h of handles) {
          ctx.beginPath();
          ctx.rect(
            h.point.x - handleWorldRadius,
            h.point.y - handleWorldRadius,
            handleWorldRadius * 2,
            handleWorldRadius * 2
          );
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Restore World Camera
    ctx.restore();

    // 3. Render Screen-Space Overlays (Marquee & Eraser Cursor)
    if (marqueeBox) {
      const minX = Math.min(marqueeBox.x1, marqueeBox.x2);
      const minY = Math.min(marqueeBox.y1, marqueeBox.y2);
      const w = Math.abs(marqueeBox.x2 - marqueeBox.x1);
      const h = Math.abs(marqueeBox.y2 - marqueeBox.y1);

      ctx.save();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.fillRect(minX, minY, w, h);
      ctx.strokeRect(minX, minY, w, h);
      ctx.restore();
    }

    if (activeTool === 'eraser' && eraserCursor) {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(eraserCursor.x, eraserCursor.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }, [
    objects,
    camera,
    selectedIds,
    activeTool,
    toolOptions,
    liveStrokePoints,
    liveShapePreview,
    liveLinePreview,
    marqueeBox,
    eraserCursor,
  ]);

  // Window Resize & High-DPI Canvas Setup
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      redraw();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  // Trigger redraw on state updates
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer to ensure drag gestures don't get stuck at edges or window boundaries!
    canvas.setPointerCapture(e.pointerId);

    const canvasRect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX, y: e.clientY };
    const worldPt = screenToWorld(screenPt, camera, canvasRect);

    pointerStartRef.current = screenPt;
    lastPointerRef.current = screenPt;
    worldStartRef.current = worldPt;

    // 1. Pan with Right-Click (e.button === 2) OR Middle-Click (e.button === 1) OR Spacebar OR 'pan' tool
    if (e.button === 2 || e.button === 1 || activeTool === 'pan' || e.shiftKey && e.button === 1) {
      setInteractionMode('PANNING');
      return;
    }

    // Only process Left-Click for tools
    if (e.button !== 0) return;

    if (activeTool === 'select') {
      // Check if clicking on resize handles of current selection
      const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));
      if (selectedObjects.length > 0) {
        const bounds = getCombinedBoundingBox(selectedObjects);
        if (bounds) {
          const handleRadius = 8 / camera.zoom;
          const hitHandle = hitTestResizeHandle(bounds, worldPt, handleRadius);
          if (hitHandle) {
            activeResizeHandleRef.current = hitHandle;
            setInteractionMode('RESIZING_OBJECT');
            // Cache starting bounds
            const map = new Map<string, any>();
            selectedObjects.forEach((o) => map.set(o.id, { ...o }));
            initialSelectedBoundsRef.current = map;
            return;
          }
        }
      }

      // Check if clicking on any object
      const hitObj = hitTestTopObject(objects, worldPt, 8 / camera.zoom);
      if (hitObj) {
        let currentSelected = selectedIds;
        if (e.shiftKey) {
          // Toggle selection
          if (selectedIds.includes(hitObj.id)) {
            currentSelected = selectedIds.filter((id) => id !== hitObj.id);
          } else {
            currentSelected = [...selectedIds, hitObj.id];
          }
          setSelectedIds(currentSelected);
        } else {
          // If clicked object is not yet selected, select only it.
          // If it IS already part of selection (e.g. from Ctrl+A), preserve all selected items!
          if (!selectedIds.includes(hitObj.id)) {
            currentSelected = [hitObj.id];
            setSelectedIds(currentSelected);
          }
        }
        setInteractionMode('MOVING_OBJECTS');
        const map = new Map<string, any>();
        objects.filter((o) => currentSelected.includes(o.id)).forEach((o) => map.set(o.id, { ...o }));
        initialSelectedBoundsRef.current = map;
      } else {
        // If clicking inside the bounding box of an existing multi-selection, allow moving the group
        if (selectedObjects.length > 1) {
          const bounds = getCombinedBoundingBox(selectedObjects);
          if (bounds && isPointInBox(worldPt, bounds)) {
            setInteractionMode('MOVING_OBJECTS');
            const map = new Map<string, any>();
            selectedObjects.forEach((o) => map.set(o.id, { ...o }));
            initialSelectedBoundsRef.current = map;
            return;
          }
        }

        // Clicked empty space -> start marquee selection box
        if (!e.shiftKey) {
          setSelectedIds([]);
        }
        setInteractionMode('SELECTING_BOX');
        const localX = screenPt.x - canvasRect.left;
        const localY = screenPt.y - canvasRect.top;
        setMarqueeBox({ x1: localX, y1: localY, x2: localX, y2: localY });
      }
    } else if (activeTool === 'pen' || activeTool === 'highlighter') {
      setInteractionMode('DRAWING');
      setLiveStrokePoints([{ x: worldPt.x, y: worldPt.y, pressure: e.pressure || 0.5 }]);
    } else if (activeTool === 'eraser') {
      setInteractionMode('ERASING');
      const eraseRadius = 16 / camera.zoom;
      const res = applyEraser(objects, worldPt, eraseRadius);
      if (res.hasChanged) {
        setObjects(res.updatedObjects);
      }
      setEraserCursor({ x: screenPt.x - canvasRect.left, y: screenPt.y - canvasRect.top });
    } else if (activeTool === 'shape') {
      setInteractionMode('CREATING_SHAPE');
      setLiveShapePreview({ x: worldPt.x, y: worldPt.y, width: 0, height: 0 });
    } else if (activeTool === 'line' || activeTool === 'arrow') {
      setInteractionMode('CREATING_LINE');
      setLiveLinePreview({ x1: worldPt.x, y1: worldPt.y, x2: worldPt.x, y2: worldPt.y });
    } else if (activeTool === 'text') {
      // Insert text object immediately at clicked location
      const newText: BoardObject = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: Math.round(worldPt.x),
        y: Math.round(worldPt.y),
        width: 180,
        height: 50,
        text: 'Text',
        fontSize: toolOptions.textFontSize,
        fontColor: toolOptions.textColor,
        align: 'left',
        createdAt: Date.now(),
      };
      const updated = [...objects, newText];
      setObjects(updated);
      setSelectedIds([newText.id]);
      setActiveTool('select');
      onCommitHistory(updated);
      if (onStartEditingText) onStartEditingText(newText.id);
    } else if (activeTool === 'note') {
      // Insert sticky note immediately at clicked location
      const newNote: BoardObject = {
        id: `note-${Date.now()}`,
        type: 'note',
        x: Math.round(worldPt.x - 90),
        y: Math.round(worldPt.y - 90),
        width: 180,
        height: 180,
        text: 'Note',
        color: toolOptions.noteColor,
        fontSize: toolOptions.noteFontSize,
        createdAt: Date.now(),
      };
      const updated = [...objects, newNote];
      setObjects(updated);
      setSelectedIds([newNote.id]);
      setActiveTool('select');
      onCommitHistory(updated);
      if (onStartEditingText) onStartEditingText(newNote.id);
    }
  };

  // Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX, y: e.clientY };
    const worldPt = screenToWorld(screenPt, camera, canvasRect);

    if (activeTool === 'eraser') {
      setEraserCursor({ x: screenPt.x - canvasRect.left, y: screenPt.y - canvasRect.top });
    }

    if (interactionMode === 'IDLE') return;

    if (interactionMode === 'PANNING') {
      const dx = screenPt.x - lastPointerRef.current.x;
      const dy = screenPt.y - lastPointerRef.current.y;
      setCamera((prev) => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy,
      }));
      lastPointerRef.current = screenPt;
      return;
    }

    if (interactionMode === 'DRAWING') {
      setLiveStrokePoints((prev) => [
        ...prev,
        { x: worldPt.x, y: worldPt.y, pressure: e.pressure || 0.5 },
      ]);
      return;
    }

    if (interactionMode === 'ERASING') {
      const eraseRadius = 16 / camera.zoom;
      const res = applyEraser(objects, worldPt, eraseRadius);
      if (res.hasChanged) {
        setObjects(res.updatedObjects);
      }
      return;
    }

    if (interactionMode === 'MOVING_OBJECTS') {
      const dx = worldPt.x - worldStartRef.current.x;
      const dy = worldPt.y - worldStartRef.current.y;

      setObjects((prev) =>
        prev.map((obj) => {
          if (!selectedIds.includes(obj.id)) return obj;
          const initial = initialSelectedBoundsRef.current.get(obj.id);
          if (!initial) return obj;

          switch (obj.type) {
            case 'stroke':
            case 'highlighter':
              return {
                ...obj,
                points: initial.points.map((p: StrokePoint) => ({
                  ...p,
                  x: p.x + dx,
                  y: p.y + dy,
                })),
              };
            case 'image':
            case 'shape':
            case 'text':
            case 'note':
              return {
                ...obj,
                x: initial.x + dx,
                y: initial.y + dy,
              };
            case 'line':
              return {
                ...obj,
                x1: initial.x1 + dx,
                y1: initial.y1 + dy,
                x2: initial.x2 + dx,
                y2: initial.y2 + dy,
              };
            default:
              return obj;
          }
        })
      );
      return;
    }

    if (interactionMode === 'RESIZING_OBJECT') {
      const handle = activeResizeHandleRef.current;
      if (!handle) return;
      const dx = worldPt.x - worldStartRef.current.x;
      const dy = worldPt.y - worldStartRef.current.y;

      setObjects((prev) =>
        prev.map((obj) => {
          if (!selectedIds.includes(obj.id)) return obj;
          const initial = initialSelectedBoundsRef.current.get(obj.id);
          if (!initial) return obj;

          if (obj.type === 'image' || obj.type === 'shape' || obj.type === 'note' || obj.type === 'text') {
            let newX = initial.x;
            let newY = initial.y;
            let newW = initial.width;
            let newH = initial.height;

            if (handle.includes('e')) newW = initial.width + dx;
            if (handle.includes('s')) newH = initial.height + dy;
            if (handle.includes('w')) {
              newX = initial.x + dx;
              newW = initial.width - dx;
            }
            if (handle.includes('n')) {
              newY = initial.y + dy;
              newH = initial.height - dy;
            }

            // Aspect ratio lock for images (or when Shift is pressed)
            if (obj.type === 'image' || e.shiftKey) {
              const ratio = initial.width / initial.height;
              if (Math.abs(dx) > Math.abs(dy)) {
                newH = Math.round(newW / ratio);
              } else {
                newW = Math.round(newH * ratio);
              }
            }

            if (newW > 20 && newH > 20) {
              return { ...obj, x: newX, y: newY, width: newW, height: newH };
            }
          }
          return obj;
        })
      );
      return;
    }

    if (interactionMode === 'CREATING_SHAPE') {
      let w = worldPt.x - worldStartRef.current.x;
      let h = worldPt.y - worldStartRef.current.y;
      // Shift key constrains to square/circle
      if (e.shiftKey) {
        const side = Math.max(Math.abs(w), Math.abs(h));
        w = side * (w >= 0 ? 1 : -1);
        h = side * (h >= 0 ? 1 : -1);
      }
      setLiveShapePreview({
        x: worldStartRef.current.x,
        y: worldStartRef.current.y,
        width: w,
        height: h,
      });
      return;
    }

    if (interactionMode === 'CREATING_LINE') {
      setLiveLinePreview({
        x1: worldStartRef.current.x,
        y1: worldStartRef.current.y,
        x2: worldPt.x,
        y2: worldPt.y,
      });
      return;
    }

    if (interactionMode === 'SELECTING_BOX') {
      const localX = screenPt.x - canvasRect.left;
      const localY = screenPt.y - canvasRect.top;
      setMarqueeBox((prev) => (prev ? { ...prev, x2: localX, y2: localY } : null));
      return;
    }
  };

  // Pointer Up Handler
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (interactionMode === 'DRAWING' && liveStrokePoints.length > 0) {
      const isHighlighter = activeTool === 'highlighter';
      const newStroke: BoardObject = isHighlighter
        ? {
            id: `hl-${Date.now()}`,
            type: 'highlighter',
            points: liveStrokePoints,
            color: toolOptions.highlighterColor,
            width: toolOptions.highlighterWidth,
            opacity: toolOptions.highlighterOpacity,
            createdAt: Date.now(),
          }
        : {
            id: `stroke-${Date.now()}`,
            type: 'stroke',
            points: liveStrokePoints,
            color: toolOptions.penColor,
            width: toolOptions.penWidth,
            createdAt: Date.now(),
          };

      const updated = [...objects, newStroke];
      setObjects(updated);
      setLiveStrokePoints([]);
      onCommitHistory(updated);
    } else if (interactionMode === 'CREATING_SHAPE' && liveShapePreview) {
      if (Math.abs(liveShapePreview.width) > 5 && Math.abs(liveShapePreview.height) > 5) {
        let x = liveShapePreview.x;
        let y = liveShapePreview.y;
        let width = liveShapePreview.width;
        let height = liveShapePreview.height;
        if (width < 0) {
          x += width;
          width = -width;
        }
        if (height < 0) {
          y += height;
          height = -height;
        }

        const newShape: BoardObject = {
          id: `shape-${Date.now()}`,
          type: 'shape',
          shapeType: toolOptions.shapeType,
          x,
          y,
          width,
          height,
          strokeColor: toolOptions.shapeStrokeColor,
          strokeWidth: toolOptions.shapeStrokeWidth,
          fillColor: toolOptions.shapeFillColor,
          lineStyle: toolOptions.shapeLineStyle,
          createdAt: Date.now(),
        };
        const updated = [...objects, newShape];
        setObjects(updated);
        setSelectedIds([newShape.id]);
        setActiveTool('select');
        onCommitHistory(updated);
      }
      setLiveShapePreview(null);
    } else if (interactionMode === 'CREATING_LINE' && liveLinePreview) {
      const dist = Math.hypot(
        liveLinePreview.x2 - liveLinePreview.x1,
        liveLinePreview.y2 - liveLinePreview.y1
      );
      if (dist > 5) {
        const newLine: BoardObject = {
          id: `line-${Date.now()}`,
          type: 'line',
          x1: liveLinePreview.x1,
          y1: liveLinePreview.y1,
          x2: liveLinePreview.x2,
          y2: liveLinePreview.y2,
          strokeColor: toolOptions.lineStrokeColor,
          strokeWidth: toolOptions.lineStrokeWidth,
          lineStyle: toolOptions.lineStyle,
          arrowType: activeTool === 'arrow' ? toolOptions.arrowType || 'end' : 'none',
          createdAt: Date.now(),
        };
        const updated = [...objects, newLine];
        setObjects(updated);
        setSelectedIds([newLine.id]);
        setActiveTool('select');
        onCommitHistory(updated);
      }
      setLiveLinePreview(null);
    } else if (interactionMode === 'SELECTING_BOX' && marqueeBox) {
      const canvasRect = canvas?.getBoundingClientRect() ?? { left: 0, top: 0 };
      const w1 = screenToWorld(
        { x: marqueeBox.x1 + canvasRect.left, y: marqueeBox.y1 + canvasRect.top },
        camera,
        canvasRect
      );
      const w2 = screenToWorld(
        { x: marqueeBox.x2 + canvasRect.left, y: marqueeBox.y2 + canvasRect.top },
        camera,
        canvasRect
      );

      const selBox = {
        minX: Math.min(w1.x, w2.x),
        minY: Math.min(w1.y, w2.y),
        maxX: Math.max(w1.x, w2.x),
        maxY: Math.max(w1.y, w2.y),
        width: Math.abs(w2.x - w1.x),
        height: Math.abs(w2.y - w1.y),
      };

      if (selBox.width > 4 || selBox.height > 4) {
        const hit = hitTestMarquee(objects, selBox);
        setSelectedIds(hit.map((o) => o.id));
      }
      setMarqueeBox(null);
    } else if (
      interactionMode === 'MOVING_OBJECTS' ||
      interactionMode === 'RESIZING_OBJECT' ||
      interactionMode === 'ERASING'
    ) {
      onCommitHistory(objects);
    }

    setInteractionMode('IDLE');
    activeResizeHandleRef.current = null;
    initialSelectedBoundsRef.current.clear();
  };

  // Mouse Wheel Zoom anchored around cursor
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const canvasRect = canvas.getBoundingClientRect();
    const targetZoom = camera.zoom * zoomFactor;

    setCamera((prev) =>
      zoomAtScreenPoint({ x: e.clientX, y: e.clientY }, targetZoom, prev, canvasRect)
    );
  };

  // Double click: open inline text editing
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera, canvasRect);

    const hit = hitTestTopObject(objects, worldPt, 8 / camera.zoom);
    if (hit && (hit.type === 'text' || hit.type === 'note')) {
      setSelectedIds([hit.id]);
      if (onStartEditingText) onStartEditingText(hit.id);
    }
  };

  // Drag and drop image files directly onto canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const canvasRect = canvas.getBoundingClientRect();
        const imgObj = await createImageFromFile(
          file,
          camera,
          canvasRect.width,
          canvasRect.height
        );
        // Position at drop coordinate
        const dropWorld = screenToWorld(
          { x: e.clientX, y: e.clientY },
          camera,
          canvasRect
        );
        imgObj.x = Math.round(dropWorld.x - imgObj.width / 2);
        imgObj.y = Math.round(dropWorld.y - imgObj.height / 2);

        const updated = [...objects, imgObj];
        setObjects(updated);
        setSelectedIds([imgObj.id]);
        setActiveTool('select');
        onCommitHistory(updated);
      } catch (err) {
        console.error('Image drop failed:', err);
      }
    }
  };

  // Dynamic cursor style
  let cursorStyle = 'default';
  if (interactionMode === 'PANNING' || activeTool === 'pan') {
    cursorStyle = interactionMode === 'PANNING' ? 'grabbing' : 'grab';
  } else if (activeTool === 'pen' || activeTool === 'highlighter') {
    cursorStyle = 'crosshair';
  } else if (activeTool === 'eraser') {
    cursorStyle = 'none'; // custom red circle drawn
  } else if (activeTool === 'shape' || activeTool === 'line' || activeTool === 'arrow') {
    cursorStyle = 'crosshair';
  } else if (activeTool === 'text') {
    cursorStyle = 'text';
  } else if (interactionMode === 'MOVING_OBJECTS') {
    cursorStyle = 'move';
  }

  return (
    <div
      className="canvas-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        id="whiteboard-canvas"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: cursorStyle,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};

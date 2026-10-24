export interface Point {
  x: number;
  y: number;
}

export interface StrokePoint extends Point {
  pressure: number;
  time?: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Camera {
  panX: number;
  panY: number;
  zoom: number;
}

export type ToolType =
  | 'select'
  | 'pan'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'shape'
  | 'line'
  | 'arrow'
  | 'text'
  | 'note';

export type ShapeType =
  | 'rectangle'
  | 'rounded-rectangle'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'pentagon'
  | 'hexagon'
  | 'parallelogram'
  | 'cylinder'
  | 'process'
  | 'document';

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export type ArrowType = 'none' | 'end' | 'start' | 'both';

export interface BaseObject {
  id: string;
  createdAt: number;
  zIndex?: number;
}

export interface FreehandStroke extends BaseObject {
  type: 'stroke';
  points: StrokePoint[];
  color: string;
  width: number;
}

export interface HighlighterStroke extends BaseObject {
  type: 'highlighter';
  points: StrokePoint[];
  color: string;
  width: number;
  opacity: number;
}

export interface ImageObject extends BaseObject {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface ShapeObject extends BaseObject {
  type: 'shape';
  shapeType: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string; // 'transparent' or hex/rgba
  lineStyle: LineStyle;
}

export interface LineObject extends BaseObject {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColor: string;
  strokeWidth: number;
  lineStyle: LineStyle;
  arrowType: ArrowType;
}

export interface TextObject extends BaseObject {
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontColor: string;
  isBold?: boolean;
  isItalic?: boolean;
  align: 'left' | 'center' | 'right';
}

export interface StickyNoteObject extends BaseObject {
  type: 'note';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string; // Note background color
  fontSize: number;
}

export type BoardObject =
  | FreehandStroke
  | HighlighterStroke
  | ImageObject
  | ShapeObject
  | LineObject
  | TextObject
  | StickyNoteObject;

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface ActiveToolOptions {
  penColor: string;
  penWidth: number;
  highlighterColor: string;
  highlighterWidth: number;
  highlighterOpacity: number;
  shapeType: ShapeType;
  shapeStrokeColor: string;
  shapeFillColor: string;
  shapeStrokeWidth: number;
  shapeLineStyle: LineStyle;
  lineStyle: LineStyle;
  arrowType: ArrowType;
  lineStrokeColor: string;
  lineStrokeWidth: number;
  textColor: string;
  textFontSize: number;
  noteColor: string;
  noteFontSize: number;
  gridType: 'dots' | 'grid' | 'none';
  canvasBgColor: string;
}

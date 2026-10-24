import type {
  ActiveToolOptions,
  BoardObject,
  LineStyle,
  ShapeType,
  ToolType,
} from '../types/board';
import {
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  Hexagon,
} from 'lucide-react';

interface ContextBarProps {
  activeTool: ToolType;
  toolOptions: ActiveToolOptions;
  setToolOptions: React.Dispatch<React.SetStateAction<ActiveToolOptions>>;
  selectedObjects: BoardObject[];
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}

const PEN_COLORS = [
  '#0f172a', // Slate/Black
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#eab308', // Yellow
];

const HIGHLIGHTER_COLORS = [
  '#fef08a', // Neon Yellow
  '#bbf7d0', // Mint Green
  '#bae6fd', // Sky Blue
  '#fbcfe8', // Bubblegum Pink
  '#fed7aa', // Peach Orange
];

const NOTE_COLORS = [
  '#fef3c7', // Yellow
  '#d1fae5', // Green
  '#dbeafe', // Blue
  '#fce7f3', // Pink
  '#f3e8ff', // Purple
  '#ffedd5', // Orange
];

export const ContextBar: React.FC<ContextBarProps> = ({
  activeTool,
  toolOptions,
  setToolOptions,
  selectedObjects,
  onDeleteSelected,
  onDuplicateSelected,
  onBringForward,
  onSendBackward,
}) => {
  const isSelectionActive = selectedObjects.length > 0;

  // If objects are selected, prioritize selection actions (Duplicate, Bring Forward, Delete, etc.)
  if (isSelectionActive) {
    return (
      <div className="context-bar selection-bar">
        <span className="context-label">
          {selectedObjects.length} object{selectedObjects.length > 1 ? 's' : ''} selected
        </span>

        <button
          className="context-btn"
          title="Duplicate (Ctrl+D)"
          onClick={onDuplicateSelected}
        >
          <Copy size={16} /> Duplicate
        </button>

        <button
          className="context-btn"
          title="Bring Forward"
          onClick={onBringForward}
        >
          <BringToFront size={16} /> Bring to Front
        </button>

        <button
          className="context-btn"
          title="Send Backward"
          onClick={onSendBackward}
        >
          <SendToBack size={16} /> Send to Back
        </button>

        <div className="context-divider" />

        <button
          className="context-btn danger"
          title="Delete (Delete/Backspace)"
          onClick={onDeleteSelected}
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>
    );
  }

  // Contextual controls for PEN tool
  if (activeTool === 'pen') {
    return (
      <div className="context-bar">
        <div className="color-swatches">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${toolOptions.penColor === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setToolOptions((prev) => ({ ...prev, penColor: c }))}
              title={c}
            />
          ))}
          <input
            type="color"
            className="color-picker-input"
            value={toolOptions.penColor}
            onChange={(e) =>
              setToolOptions((prev) => ({ ...prev, penColor: e.target.value }))
            }
            title="Custom Color"
          />
        </div>

        <div className="context-divider" />

        <div className="width-selectors">
          {[2, 4, 8, 14].map((w) => (
            <button
              key={w}
              className={`width-btn ${toolOptions.penWidth === w ? 'active' : ''}`}
              onClick={() => setToolOptions((prev) => ({ ...prev, penWidth: w }))}
              title={`${w}px`}
            >
              <span
                className="width-dot"
                style={{ width: Math.max(w, 3), height: Math.max(w, 3) }}
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Contextual controls for HIGHLIGHTER tool
  if (activeTool === 'highlighter') {
    return (
      <div className="context-bar">
        <div className="color-swatches">
          {HIGHLIGHTER_COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${
                toolOptions.highlighterColor === c ? 'active' : ''
              }`}
              style={{ backgroundColor: c }}
              onClick={() =>
                setToolOptions((prev) => ({ ...prev, highlighterColor: c }))
              }
              title={c}
            />
          ))}
        </div>

        <div className="context-divider" />

        <div className="width-selectors">
          {[12, 20, 32].map((w) => (
            <button
              key={w}
              className={`width-btn ${
                toolOptions.highlighterWidth === w ? 'active' : ''
              }`}
              onClick={() =>
                setToolOptions((prev) => ({ ...prev, highlighterWidth: w }))
              }
              title={`${w}px`}
            >
              <span
                className="width-bar"
                style={{
                  width: 14,
                  height: Math.min(w * 0.45, 12),
                  backgroundColor: toolOptions.highlighterColor,
                }}
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Contextual controls for SHAPE tool
  if (activeTool === 'shape') {
    const shapes: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
      { type: 'rectangle', label: 'Rectangle', icon: <Square size={16} /> },
      { type: 'rounded-rectangle', label: 'Rounded Rect', icon: <Square size={16} /> },
      { type: 'circle', label: 'Circle', icon: <Circle size={16} /> },
      { type: 'triangle', label: 'Triangle', icon: <Triangle size={16} /> },
      { type: 'diamond', label: 'Diamond', icon: <Diamond size={16} /> },
      { type: 'star', label: 'Star', icon: <Star size={16} /> },
      { type: 'hexagon', label: 'Hexagon', icon: <Hexagon size={16} /> },
      { type: 'parallelogram', label: 'Parallelogram', icon: <Square size={16} /> },
      { type: 'cylinder', label: 'Cylinder', icon: <Circle size={16} /> },
      { type: 'process', label: 'Process', icon: <Square size={16} /> },
    ];

    return (
      <div className="context-bar shape-bar">
        <select
          className="context-select"
          value={toolOptions.shapeType}
          onChange={(e) =>
            setToolOptions((prev) => ({
              ...prev,
              shapeType: e.target.value as ShapeType,
            }))
          }
        >
          {shapes.map((s) => (
            <option key={s.type} value={s.type}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="context-divider" />

        <span className="sub-label">Stroke:</span>
        <input
          type="color"
          className="color-picker-input"
          value={toolOptions.shapeStrokeColor}
          onChange={(e) =>
            setToolOptions((prev) => ({ ...prev, shapeStrokeColor: e.target.value }))
          }
          title="Outline Color"
        />

        <span className="sub-label">Fill:</span>
        <button
          className={`fill-chip ${
            toolOptions.shapeFillColor === 'transparent' ? 'active' : ''
          }`}
          onClick={() =>
            setToolOptions((prev) => ({ ...prev, shapeFillColor: 'transparent' }))
          }
          title="No Fill (Transparent)"
        >
          None
        </button>
        <button
          className={`fill-chip ${
            toolOptions.shapeFillColor === '#ffffff' ? 'active' : ''
          }`}
          onClick={() =>
            setToolOptions((prev) => ({ ...prev, shapeFillColor: '#ffffff' }))
          }
          title="White Fill"
        >
          White
        </button>
        <button
          className={`fill-chip ${
            toolOptions.shapeFillColor === '#eff6ff' ? 'active' : ''
          }`}
          onClick={() =>
            setToolOptions((prev) => ({ ...prev, shapeFillColor: '#eff6ff' }))
          }
          title="Light Blue Fill"
        >
          Blue
        </button>

        <div className="context-divider" />

        <select
          className="context-select"
          value={toolOptions.shapeLineStyle}
          onChange={(e) =>
            setToolOptions((prev) => ({
              ...prev,
              shapeLineStyle: e.target.value as LineStyle,
            }))
          }
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>
    );
  }

  // Contextual controls for LINE / ARROW tool
  if (activeTool === 'arrow') {
    return (
      <div className="context-bar">
        <select
          className="context-select"
          value={toolOptions.arrowType}
          onChange={(e) =>
            setToolOptions((prev) => ({
              ...prev,
              arrowType: e.target.value as any,
            }))
          }
        >
          <option value="end">Single Arrow (→)</option>
          <option value="both">Double Arrow (↔)</option>
          <option value="none">Plain Line (—)</option>
        </select>

        <div className="context-divider" />

        <select
          className="context-select"
          value={toolOptions.lineStyle}
          onChange={(e) =>
            setToolOptions((prev) => ({
              ...prev,
              lineStyle: e.target.value as LineStyle,
            }))
          }
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>

        <div className="context-divider" />

        <input
          type="color"
          className="color-picker-input"
          value={toolOptions.lineStrokeColor}
          onChange={(e) =>
            setToolOptions((prev) => ({ ...prev, lineStrokeColor: e.target.value }))
          }
          title="Line Color"
        />

        <select
          className="context-select"
          value={toolOptions.lineStrokeWidth}
          onChange={(e) =>
            setToolOptions((prev) => ({
              ...prev,
              lineStrokeWidth: Number(e.target.value),
            }))
          }
        >
          <option value={2}>2px</option>
          <option value={4}>4px</option>
          <option value={6}>6px</option>
        </select>
      </div>
    );
  }

  // Contextual controls for STICKY NOTE tool
  if (activeTool === 'note') {
    return (
      <div className="context-bar">
        <span className="sub-label">Note Color:</span>
        <div className="color-swatches">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${toolOptions.noteColor === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setToolOptions((prev) => ({ ...prev, noteColor: c }))}
              title={c}
            />
          ))}
        </div>
      </div>
    );
  }

  // Contextual controls for TEXT tool
  if (activeTool === 'text') {
    return (
      <div className="context-bar">
        <span className="sub-label">Size:</span>
        <select
          className="context-select"
          value={toolOptions.textFontSize}
          onChange={(e) =>
            setToolOptions((prev) => ({
              ...prev,
              textFontSize: Number(e.target.value),
            }))
          }
        >
          <option value={14}>Small (14px)</option>
          <option value={18}>Normal (18px)</option>
          <option value={24}>Large (24px)</option>
          <option value={36}>Heading (36px)</option>
        </select>

        <div className="context-divider" />

        <input
          type="color"
          className="color-picker-input"
          value={toolOptions.textColor}
          onChange={(e) =>
            setToolOptions((prev) => ({ ...prev, textColor: e.target.value }))
          }
          title="Text Color"
        />
      </div>
    );
  }

  return null;
};

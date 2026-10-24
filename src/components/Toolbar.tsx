import React, { useRef } from 'react';
import {
  MousePointer2,
  Hand,
  Pen,
  Highlighter,
  Eraser,
  Shapes,
  ArrowRight,
  Type,
  StickyNote,
  ImagePlus,
  Undo2,
  Redo2,
} from 'lucide-react';
import type { ToolType } from '../types/board';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onInsertImage: (file: File) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onInsertImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onInsertImage(file);
      e.target.value = ''; // reset so same file can be re-selected
    }
  };

  const tools: {
    id: ToolType;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'select',
      label: 'Select',
      shortcut: 'V',
      icon: <MousePointer2 size={19} />,
    },
    {
      id: 'pan',
      label: 'Pan Canvas',
      shortcut: 'H',
      icon: <Hand size={19} />,
    },
    {
      id: 'pen',
      label: 'Pen',
      shortcut: 'P',
      icon: <Pen size={19} />,
    },
    {
      id: 'highlighter',
      label: 'Highlighter',
      shortcut: 'Shift+P',
      icon: <Highlighter size={19} />,
    },
    {
      id: 'eraser',
      label: 'Eraser (Stroke Only)',
      shortcut: 'E',
      icon: <Eraser size={19} />,
    },
    {
      id: 'shape',
      label: 'Shapes',
      shortcut: 'S',
      icon: <Shapes size={19} />,
    },
    {
      id: 'arrow',
      label: 'Lines & Arrows',
      shortcut: 'L',
      icon: <ArrowRight size={19} />,
    },
    {
      id: 'text',
      label: 'Text Box',
      shortcut: 'T',
      icon: <Type size={19} />,
    },
    {
      id: 'note',
      label: 'Sticky Note',
      shortcut: 'N',
      icon: <StickyNote size={19} />,
    },
  ];

  return (
    <div className="toolbar-dock" role="toolbar" aria-label="Drawing Tools">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        onChange={handleFileChange}
      />

      <div className="tool-group">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              id={`tool-btn-${t.id}`}
              className={`tool-button ${isActive ? 'active' : ''}`}
              title={`${t.label} (${t.shortcut})`}
              onClick={() => setActiveTool(t.id)}
              aria-label={t.label}
              aria-pressed={isActive}
            >
              {t.icon}
            </button>
          );
        })}

        <button
          id="tool-btn-image"
          className="tool-button"
          title="Insert Image (Upload or Paste)"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Insert Image"
        >
          <ImagePlus size={19} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="tool-group">
        <button
          id="btn-undo"
          className="tool-button"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Undo"
        >
          <Undo2 size={19} />
        </button>

        <button
          id="btn-redo"
          className="tool-button"
          title="Redo (Ctrl+Y)"
          disabled={!canRedo}
          onClick={onRedo}
          aria-label="Redo"
        >
          <Redo2 size={19} />
        </button>
      </div>
    </div>
  );
};

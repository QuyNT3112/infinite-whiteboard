import React, { useRef } from 'react';
import {
  Download,
  FileJson,
  Upload,
  Trash2,
  HelpCircle,
} from 'lucide-react';

interface HeaderProps {
  onExportPng: () => void;
  onExportJson: () => void;
  onImportJson: (jsonString: string) => void;
  onClearBoard: () => void;
  onOpenShortcuts: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onExportPng,
  onExportJson,
  onImportJson,
  onClearBoard,
  onOpenShortcuts,
}) => {
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onImportJson(content);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  return (
    <header className="app-header">
      <input
        type="file"
        ref={jsonInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleJsonUpload}
      />

      <div className="header-left">
        <div className="app-logo">
          <div className="logo-icon-grid">
            <span className="dot dot-1" />
            <span className="dot dot-2" />
            <span className="dot dot-3" />
            <span className="dot dot-4" />
          </div>
        </div>
        <div className="app-title-group">
          <h1 className="app-title">Whiteboard</h1>
          <span className="app-badge">Infinite Canvas</span>
        </div>
      </div>

      <div className="header-right">
        <button
          id="btn-export-png"
          className="header-btn"
          title="Export board as high-res PNG image"
          onClick={onExportPng}
        >
          <Download size={16} />
          <span>Export Image</span>
        </button>

        <button
          id="btn-export-json"
          className="header-btn"
          title="Save / Export board JSON"
          onClick={onExportJson}
        >
          <FileJson size={16} />
          <span>Save Board</span>
        </button>

        <button
          id="btn-import-json"
          className="header-btn"
          title="Import / Open board JSON"
          onClick={() => jsonInputRef.current?.click()}
        >
          <Upload size={16} />
          <span>Open Board</span>
        </button>

        <div className="header-divider" />

        <button
          id="btn-clear-board"
          className="header-btn danger"
          title="Clear all content from board"
          onClick={onClearBoard}
        >
          <Trash2 size={16} />
          <span>Clear</span>
        </button>

        <button
          id="btn-shortcuts"
          className="header-icon-btn"
          title="Keyboard Shortcuts & Gestures"
          onClick={onOpenShortcuts}
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </header>
  );
};

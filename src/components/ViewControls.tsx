import React, { useState, useRef, useEffect } from 'react';
import type { Camera, BoardObject } from '../types/board';
import { fitToContent } from '../core/camera';
import { ZoomIn, ZoomOut, Maximize2, Grid, RotateCcw, Palette } from 'lucide-react';

interface ViewControlsProps {
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  objects: BoardObject[];
  gridType: 'dots' | 'grid' | 'none';
  setGridType: (type: 'dots' | 'grid' | 'none') => void;
  canvasBgColor: string;
  setCanvasBgColor: (color: string) => void;
}

const CANVAS_THEMES = [
  { label: 'Classic White', color: '#ffffff' },
  { label: 'Warm Paper', color: '#fefae0' },
  { label: 'Soft Gray', color: '#f8fafc' },
  { label: 'Ice Blue', color: '#f0f9ff' },
  { label: 'Mint Green', color: '#f0fdf4' },
  { label: 'Pastel Pink', color: '#fdf2f8' },
  { label: 'Dark Slate', color: '#1e293b' },
  { label: 'Blackboard', color: '#0f172a' },
];

export const ViewControls: React.FC<ViewControlsProps> = ({
  camera,
  setCamera,
  objects,
  gridType,
  setGridType,
  canvasBgColor,
  setCanvasBgColor,
}) => {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement | null>(null);

  const zoomPercent = Math.round(camera.zoom * 100);

  // Close theme popover if clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    if (isThemeOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isThemeOpen]);

  const handleZoomIn = () => {
    setCamera((prev) => ({
      ...prev,
      zoom: Math.min(Math.round(prev.zoom * 1.2 * 100) / 100, 15.0),
    }));
  };

  const handleZoomOut = () => {
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(Math.round(prev.zoom * 0.83 * 100) / 100, 0.1),
    }));
  };

  const handleResetZoom = () => {
    setCamera((prev) => ({
      ...prev,
      zoom: 1.0,
    }));
  };

  const handleFitContent = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    setCamera(fitToContent(objects, width, height));
  };

  const toggleGrid = () => {
    if (gridType === 'dots') setGridType('grid');
    else if (gridType === 'grid') setGridType('none');
    else setGridType('dots');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="view-controls-wrapper" ref={themeRef}>
      {/* Background Theme Popover */}
      {isThemeOpen && (
        <div className="canvas-theme-popover" role="dialog" aria-label="Canvas Theme Palette">
          <div className="theme-popover-title">Canvas Background</div>
          <div className="theme-swatches-grid">
            {CANVAS_THEMES.map((t) => (
              <button
                key={t.color}
                className={`theme-swatch ${canvasBgColor === t.color ? 'active' : ''}`}
                style={{ backgroundColor: t.color }}
                onClick={() => {
                  setCanvasBgColor(t.color);
                  setIsThemeOpen(false);
                }}
                title={t.label}
              />
            ))}
            <input
              type="color"
              className="color-picker-input theme-custom-picker"
              value={canvasBgColor}
              onChange={(e) => setCanvasBgColor(e.target.value)}
              title="Custom Color"
            />
          </div>
        </div>
      )}

      {/* View Controls Dock */}
      <div className="view-controls-dock" role="region" aria-label="View Controls">
        <button
          id="btn-canvas-theme"
          className={`view-btn ${isThemeOpen ? 'active' : ''}`}
          title="Format Canvas Background Color"
          onClick={() => setIsThemeOpen((prev) => !prev)}
        >
          <Palette size={17} />
        </button>

        <button
          id="btn-grid-toggle"
          className="view-btn"
          title={`Grid style: ${gridType} (Click to toggle)`}
          onClick={toggleGrid}
        >
          <Grid size={17} />
        </button>

        <button
          id="btn-fit-content"
          className="view-btn"
          title="Fit All Content into View"
          onClick={handleFitContent}
        >
          <RotateCcw size={17} />
        </button>

        <div className="view-divider" />

        <button
          id="btn-zoom-out"
          className="view-btn"
          title="Zoom Out (Wheel Down)"
          onClick={handleZoomOut}
        >
          <ZoomOut size={17} />
        </button>

        <button
          id="btn-zoom-percent"
          className="zoom-label-btn"
          title="Click to reset to 100%"
          onClick={handleResetZoom}
        >
          {zoomPercent}%
        </button>

        <button
          id="btn-zoom-in"
          className="view-btn"
          title="Zoom In (Wheel Up)"
          onClick={handleZoomIn}
        >
          <ZoomIn size={17} />
        </button>

        <div className="view-divider" />

        <button
          id="btn-fullscreen"
          className="view-btn"
          title="Toggle Fullscreen"
          onClick={toggleFullscreen}
        >
          <Maximize2 size={17} />
        </button>
      </div>
    </div>
  );
};

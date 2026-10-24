import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  ActiveToolOptions,
  BoardObject,
  Camera,
  ToolType,
} from './types/board';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { ContextBar } from './components/ContextBar';
import { ViewControls } from './components/ViewControls';
import { Header } from './components/Header';
import { ShortcutsModal } from './components/ShortcutsModal';
import { TextInputOverlay } from './components/TextInputOverlay';
import { HistoryManager } from './core/history';
import {
  clearBoardStorage,
  exportBoardAsJson,
  exportBoardAsPng,
  loadBoardFromStorage,
  parseBoardJson,
  saveBoardToStorage,
} from './core/storage';
import { createImageFromFile } from './core/imageManager';
import { DEFAULT_CAMERA } from './core/camera';
import './App.css';

const DEFAULT_TOOL_OPTIONS: ActiveToolOptions = {
  penColor: '#0f172a',
  penWidth: 4,
  highlighterColor: '#fef08a',
  highlighterWidth: 20,
  highlighterOpacity: 0.5,
  shapeType: 'rectangle',
  shapeStrokeColor: '#2563eb',
  shapeFillColor: 'transparent',
  shapeStrokeWidth: 3,
  shapeLineStyle: 'solid',
  lineStyle: 'solid',
  arrowType: 'end',
  lineStrokeColor: '#0f172a',
  lineStrokeWidth: 3,
  textColor: '#0f172a',
  textFontSize: 18,
  noteColor: '#fef3c7',
  noteFontSize: 16,
  gridType: 'dots',
  canvasBgColor: '#ffffff',
};

export const App: React.FC = () => {
  // Load initial board and camera from local storage
  const [objects, setObjects] = useState<BoardObject[]>(() => {
    const loaded = loadBoardFromStorage();
    if (loaded.objects && loaded.objects.length > 0) {
      return loaded.objects;
    }
    // Friendly initial welcoming objects
    return [
      {
        id: 'welcome-note-1',
        type: 'note',
        x: 80,
        y: 80,
        width: 220,
        height: 200,
        text: '✨ Welcome to Microsoft Whiteboard!\n\n• Smooth natural pen\n• Image-preserving eraser\n• Drag images or paste with Ctrl+V\n• Pan with Right-Click',
        color: '#fef3c7',
        fontSize: 15,
        createdAt: Date.now(),
      },
      {
        id: 'welcome-shape-1',
        type: 'shape',
        shapeType: 'rounded-rectangle',
        x: 360,
        y: 80,
        width: 200,
        height: 120,
        strokeColor: '#2563eb',
        strokeWidth: 3,
        fillColor: '#eff6ff',
        lineStyle: 'solid',
        createdAt: Date.now(),
      },
      {
        id: 'welcome-text-1',
        type: 'text',
        x: 390,
        y: 125,
        width: 140,
        height: 40,
        text: 'Infinite Canvas',
        fontSize: 18,
        fontColor: '#1e40af',
        isBold: true,
        align: 'center',
        createdAt: Date.now(),
      },
    ];
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [camera, setCamera] = useState<Camera>(() => {
    const loaded = loadBoardFromStorage();
    return loaded.camera || DEFAULT_CAMERA;
  });

  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [toolOptions, setToolOptions] = useState<ActiveToolOptions>(DEFAULT_TOOL_OPTIONS);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // History Manager
  const historyRef = useRef<HistoryManager>(new HistoryManager(60));
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  const updateHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: historyRef.current.canUndo(),
      canRedo: historyRef.current.canRedo(),
    });
  }, []);

  // Initialize history with initial board objects on mount
  useEffect(() => {
    historyRef.current.clear(objects);
    updateHistoryState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Commit history step
  const handleCommitHistory = useCallback((newObjects: BoardObject[]) => {
    historyRef.current.pushState(newObjects);
    updateHistoryState();
  }, [updateHistoryState]);

  // Auto-save to LocalStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveBoardToStorage(objects, camera);
    }, 400);
    return () => clearTimeout(timer);
  }, [objects, camera]);

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    const previous = historyRef.current.undo();
    if (previous) {
      setObjects(previous);
      setSelectedIds([]);
      updateHistoryState();
    }
  }, [updateHistoryState]);

  const handleRedo = useCallback(() => {
    const next = historyRef.current.redo();
    if (next) {
      setObjects(next);
      setSelectedIds([]);
      updateHistoryState();
    }
  }, [updateHistoryState]);

  // Object manipulation
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const remaining = objects.filter((o) => !selectedIds.includes(o.id));
    setObjects(remaining);
    setSelectedIds([]);
    handleCommitHistory(remaining);
  }, [selectedIds, objects, handleCommitHistory]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const newDuplicates: BoardObject[] = [];
    const newSelectedIds: string[] = [];
    const offset = 30;

    for (const obj of objects) {
      if (selectedIds.includes(obj.id)) {
        const newId = `${obj.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        newSelectedIds.push(newId);

        switch (obj.type) {
          case 'stroke':
          case 'highlighter':
            newDuplicates.push({
              ...obj,
              id: newId,
              points: obj.points.map((p) => ({ ...p, x: p.x + offset, y: p.y + offset })),
              createdAt: Date.now(),
            });
            break;
          case 'image':
          case 'shape':
          case 'text':
          case 'note':
            newDuplicates.push({
              ...obj,
              id: newId,
              x: obj.x + offset,
              y: obj.y + offset,
              createdAt: Date.now(),
            });
            break;
          case 'line':
            newDuplicates.push({
              ...obj,
              id: newId,
              x1: obj.x1 + offset,
              y1: obj.y1 + offset,
              x2: obj.x2 + offset,
              y2: obj.y2 + offset,
              createdAt: Date.now(),
            });
            break;
        }
      }
    }

    const updated = [...objects, ...newDuplicates];
    setObjects(updated);
    setSelectedIds(newSelectedIds);
    handleCommitHistory(updated);
  }, [selectedIds, objects, handleCommitHistory]);

  const handleBringForward = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selected = objects.filter((o) => selectedIds.includes(o.id));
    const nonSelected = objects.filter((o) => !selectedIds.includes(o.id));
    const updated = [...nonSelected, ...selected];
    setObjects(updated);
    handleCommitHistory(updated);
  }, [selectedIds, objects, handleCommitHistory]);

  const handleSendBackward = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selected = objects.filter((o) => selectedIds.includes(o.id));
    const nonSelected = objects.filter((o) => !selectedIds.includes(o.id));
    const updated = [...selected, ...nonSelected];
    setObjects(updated);
    handleCommitHistory(updated);
  }, [selectedIds, objects, handleCommitHistory]);

  // Insert image file from picker or paste
  const handleInsertImage = useCallback(async (file: File) => {
    try {
      const imgObj = await createImageFromFile(
        file,
        camera,
        window.innerWidth,
        window.innerHeight
      );
      setObjects((prev) => {
        const updated = [...prev, imgObj];
        handleCommitHistory(updated);
        return updated;
      });
      setSelectedIds([imgObj.id]);
      setActiveTool('select');
    } catch (err) {
      console.error('Failed to insert image:', err);
      alert('Could not insert image file. Please use a PNG, JPG, or WebP image.');
    }
  }, [camera, handleCommitHistory]);

  // Clipboard Paste support (Ctrl+V with image)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleInsertImage(file);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleInsertImage]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (objects.length > 0) {
          setSelectedIds(objects.map((o) => o.id));
          setActiveTool('select');
        }
      } else if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      } else if (isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        setSelectedIds([]);
        setEditingTextId(null);
      } else if (!isCtrlOrCmd) {
        const k = e.key.toLowerCase();
        if (k === 'v') setActiveTool('select');
        else if (k === 'h') setActiveTool('pan');
        else if (k === 'p') setActiveTool(e.shiftKey ? 'highlighter' : 'pen');
        else if (k === 'e') setActiveTool('eraser');
        else if (k === 's') setActiveTool('shape');
        else if (k === 'l') setActiveTool('arrow');
        else if (k === 't') setActiveTool('text');
        else if (k === 'n') setActiveTool('note');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    objects,
    selectedIds,
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    handleDuplicateSelected,
  ]);

  // Header actions
  const handleExportPng = () => {
    exportBoardAsPng(objects, 60, toolOptions.canvasBgColor);
  };

  const handleExportJson = () => {
    exportBoardAsJson(objects);
  };

  const handleImportJson = (jsonString: string) => {
    try {
      const imported = parseBoardJson(jsonString);
      setObjects(imported);
      setSelectedIds([]);
      handleCommitHistory(imported);
    } catch {
      alert('Failed to parse board file. Invalid JSON structure.');
    }
  };

  const handleClearBoard = () => {
    if (window.confirm('Are you sure you want to clear the entire whiteboard?')) {
      setObjects([]);
      setSelectedIds([]);
      clearBoardStorage();
      handleCommitHistory([]);
    }
  };

  const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));

  return (
    <div className="whiteboard-app">
      {/* Top Header */}
      <Header
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onClearBoard={handleClearBoard}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Infinite Canvas */}
      <Canvas
        objects={objects}
        setObjects={setObjects}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        camera={camera}
        setCamera={setCamera}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        toolOptions={toolOptions}
        onCommitHistory={handleCommitHistory}
        onStartEditingText={(id) => setEditingTextId(id)}
      />

      {/* Contextual Properties Bar */}
      <ContextBar
        activeTool={activeTool}
        toolOptions={toolOptions}
        setToolOptions={setToolOptions}
        selectedObjects={selectedObjects}
        onDeleteSelected={handleDeleteSelected}
        onDuplicateSelected={handleDuplicateSelected}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
      />

      {/* Floating Bottom Toolbar Dock */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onInsertImage={handleInsertImage}
      />

      {/* Bottom-Right View / Zoom Controls */}
      <ViewControls
        camera={camera}
        setCamera={setCamera}
        objects={objects}
        gridType={toolOptions.gridType}
        setGridType={(gt) => setToolOptions((prev) => ({ ...prev, gridType: gt }))}
        canvasBgColor={toolOptions.canvasBgColor}
        setCanvasBgColor={(color) => setToolOptions((prev) => ({ ...prev, canvasBgColor: color }))}
      />

      {/* Screen-Anchored Inline Text / Note Editor */}
      <TextInputOverlay
        editingId={editingTextId}
        objects={objects}
        camera={camera}
        onUpdateText={(id, text) => {
          setObjects((prev) =>
            prev.map((o) => (o.id === id ? { ...o, text } : o))
          );
        }}
        onClose={() => {
          setEditingTextId(null);
          handleCommitHistory(objects);
        }}
      />

      {/* Shortcuts & Gestures Cheat Sheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};

export default App;

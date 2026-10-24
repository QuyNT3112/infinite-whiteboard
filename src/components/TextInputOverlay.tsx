import React, { useEffect, useRef } from 'react';
import type { BoardObject, Camera } from '../types/board';
import { worldToScreen } from '../core/camera';

interface TextInputOverlayProps {
  editingId: string | null;
  objects: BoardObject[];
  camera: Camera;
  onUpdateText: (id: string, text: string) => void;
  onClose: () => void;
}

export const TextInputOverlay: React.FC<TextInputOverlayProps> = ({
  editingId,
  objects,
  camera,
  onUpdateText,
  onClose,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingId]);

  const targetObj = objects.find((o) => o.id === editingId);
  if (!editingId || !targetObj || (targetObj.type !== 'text' && targetObj.type !== 'note')) {
    return null;
  }

  // Calculate screen position
  const screenPos = worldToScreen(
    { x: targetObj.x, y: targetObj.y },
    camera,
    { left: 0, top: 0 }
  );

  const screenWidth = Math.max(targetObj.width * camera.zoom, 100);
  const screenHeight = Math.max(targetObj.height * camera.zoom, 60);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Stop propagation so typing does NOT trigger global whiteboard shortcuts!
    e.stopPropagation();

    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey && targetObj.type === 'text') {
      e.preventDefault();
      onClose();
    }
  };

  const isNote = targetObj.type === 'note';

  return (
    <div
      className="text-input-overlay-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <textarea
        ref={textareaRef}
        className={`inline-text-editor ${isNote ? 'note-editor' : ''}`}
        style={{
          position: 'absolute',
          left: `${screenPos.x}px`,
          top: `${screenPos.y}px`,
          width: `${screenWidth}px`,
          height: `${screenHeight}px`,
          fontSize: `${targetObj.fontSize * camera.zoom}px`,
          color: isNote ? '#1e293b' : (targetObj as any).fontColor || '#0f172a',
          backgroundColor: isNote ? (targetObj as any).color : 'rgba(255, 255, 255, 0.95)',
          pointerEvents: 'auto',
          transformOrigin: 'top left',
        }}
        defaultValue={targetObj.text}
        onChange={(e) => onUpdateText(targetObj.id, e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onClose}
      />
    </div>
  );
};

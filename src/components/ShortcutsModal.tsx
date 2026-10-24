import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Mouse & Pointer Gestures',
      items: [
        { label: 'Right-Click + Drag', desc: 'Pan canvas workspace freely' },
        { label: 'Mouse Wheel', desc: 'Zoom in and out anchored around cursor' },
        { label: 'Left-Click + Drag', desc: 'Use active tool (draw, erase, shape, select)' },
        { label: 'Double-Click Object', desc: 'Edit text box or sticky note content' },
        { label: 'Shift + Drag Shape', desc: 'Constrain shape to perfect circle / square' },
      ],
    },
    {
      title: 'Tools & Selection',
      items: [
        { label: 'V', desc: 'Select tool' },
        { label: 'H', desc: 'Hand / Pan tool' },
        { label: 'P', desc: 'Pen tool (natural smooth stroke)' },
        { label: 'Shift + P', desc: 'Highlighter tool' },
        { label: 'E', desc: 'Eraser (Stroke-only partial eraser)' },
        { label: 'S', desc: 'Geometric Shapes tool' },
        { label: 'L', desc: 'Lines & Arrow connectors' },
        { label: 'T', desc: 'Text box' },
        { label: 'N', desc: 'Sticky Note' },
      ],
    },
    {
      title: 'Keyboard Actions',
      items: [
        { label: 'Ctrl + A', desc: 'Select all objects on the board' },
        { label: 'Ctrl + Z', desc: 'Undo' },
        { label: 'Ctrl + Y / Ctrl + Shift + Z', desc: 'Redo' },
        { label: 'Ctrl + D', desc: 'Duplicate selected objects' },
        { label: 'Ctrl + V', desc: 'Paste image from clipboard' },
        { label: 'Delete / Backspace', desc: 'Delete selected objects' },
        { label: 'Escape', desc: 'Deselect or cancel current operation' },
      ],
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Command size={18} />
            <span>Keyboard Shortcuts & Gestures</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {shortcutGroups.map((grp) => (
            <div key={grp.title} className="shortcut-group">
              <h3 className="shortcut-group-title">{grp.title}</h3>
              <div className="shortcut-list">
                {grp.items.map((item) => (
                  <div key={item.label} className="shortcut-row">
                    <kbd className="shortcut-key">{item.label}</kbd>
                    <span className="shortcut-desc">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

"use client";

import { useEffect } from 'react';
import { useActiveView, ViewType } from './ViewContext';

interface ViewTab {
  id: ViewType;
  label: string;
  icon: string;
  shortcut: string;
}

const VIEW_TABS: ViewTab[] = [
  { id: 'board', label: 'Board', icon: '☰', shortcut: 'b' },
  { id: 'list', label: 'List', icon: '≡', shortcut: 'l' },
  { id: 'timeline', label: 'Timeline', icon: '📅', shortcut: 't' },
];

export function ViewSwitcher() {
  const [activeView, setActiveView] = useActiveView();

  // Keyboard shortcuts: Cmd/Ctrl + B/L/T
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      if (!(e.metaKey || e.ctrlKey)) return;

      const key = e.key.toLowerCase();
      const tab = VIEW_TABS.find(t => t.shortcut === key);

      if (tab) {
        e.preventDefault();
        setActiveView(tab.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView]);

  return (
    <div
      className="view-switcher"
      role="tablist"
      aria-label="View options"
    >
      {VIEW_TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeView === tab.id}
          aria-controls={`${tab.id}-panel`}
          id={`${tab.id}-tab`}
          className={`view-tab ${activeView === tab.id ? 'active' : ''}`}
          onClick={() => setActiveView(tab.id)}
          title={`${tab.label} (${tab.shortcut === 'b' ? 'Cmd/Ctrl' : 'Cmd/Ctrl'}+${tab.shortcut.toUpperCase()})`}
        >
          <span className="view-tab-icon" aria-hidden="true">{tab.icon}</span>
          <span className="view-tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

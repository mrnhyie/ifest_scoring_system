"use client";

import { MonitorIcon, SignOutIcon, UndoIcon } from "./icons";

type Props = {
  viewer: boolean;
  live: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onEnd: () => void;
  onSignOut: () => void;
};

export default function Header({ viewer, live, canUndo, onUndo, onEnd, onSignOut }: Props) {
  return (
    <header className="app-header">
      <div className="header-slot start">
        {live && !viewer && (
          <button
            id="undoBtn"
            className="icon-btn"
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo last point"
            title="Undo last point (Z)"
          >
            <UndoIcon />
          </button>
        )}
      </div>
      <h1 className="app-title">Scoreboard</h1>
      <div className="header-slot end">
        {live && !viewer && (
          <button id="endBtn" className="end-btn" type="button" onClick={onEnd}>
            End
          </button>
        )}
        {!viewer && (
          <>
            <a
              id="viewerBtn"
              className="icon-btn viewer-link"
              href="/view"
              target="_blank"
              rel="noopener"
              aria-label="Open viewer"
              title="Open viewer in a new tab"
            >
              <MonitorIcon />
            </a>
            <button
              id="signOutBtn"
              className="icon-btn"
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <SignOutIcon />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

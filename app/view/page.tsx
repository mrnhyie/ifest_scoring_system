"use client";

import { useEffect, useRef, useState } from "react";
import Arena from "@/components/Arena";
import Header from "@/components/Header";
import Waiting from "@/components/Waiting";
import { fetchState } from "@/lib/client";
import type { BoardState, Side } from "@/lib/types";

const pad2 = (n: number) => String(n).padStart(2, "0");
const nameOf = (board: BoardState, side: Side) => board.names[side] || (side === 0 ? "Player 1" : "Player 2");
const noop = () => {};

export default function ViewPage() {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [failures, setFailures] = useState(0);
  const revRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.body.classList.add("is-viewer");
    return () => document.body.classList.remove("is-viewer");
  }, []);

  useEffect(() => {
    revRef.current = board?.rev;
  }, [board?.rev]);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const next = await fetchState(revRef.current);
        if (stopped) return;
        setFailures(0);
        if (next) setBoard(next);
      } catch {
        // Keep showing the last known score while the network hiccups.
        if (!stopped) setFailures((n) => n + 1);
      }
    };
    tick();
    const id = window.setInterval(tick, 700);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!board) return;
    document.title =
      board.stage === "live"
        ? `${board.scores[0]} — ${board.scores[1]} · ${nameOf(board, 0)} vs ${nameOf(board, 1)}`
        : "Scoreboard — waiting";
  }, [board]);

  if (!board) {
    const offline = failures >= 3;
    return (
      <div className="app">
        <Header viewer live={false} canUndo={false} onUndo={noop} onEnd={noop} onSignOut={noop} />
        <div className="status-row">
          <div className="status-pill" id="statusPill">
            <span className="status-dot" />
            <span id="statusText">{offline ? "OFFLINE" : "CONNECTING"}</span>
          </div>
        </div>
        <main>
          <Waiting
            title={offline ? "Can’t reach the scoreboard" : "Connecting to the scoreboard"}
            body={
              offline
                ? "The viewer keeps retrying. Check that the admin view is open and the server is running."
                : "Fetching the current session…"
            }
            showAdminLink={false}
          />
        </main>
      </div>
    );
  }
  const live = board.stage === "live";

  return (
    <div className="app">
      <Header viewer live={live} canUndo={false} onUndo={noop} onEnd={noop} onSignOut={noop} />
      <div className="status-row">
        <div className={`status-pill${live ? " is-live" : ""}`} id="statusPill">
          <span className="status-dot" />
          <span id="statusText">{live ? `LIVE · SESSION ${pad2(board.session)}` : "WAITING"}</span>
        </div>
      </div>
      <main>
        {live ? (
          <Arena viewer board={board} popTick={[0, 0]} />
        ) : (
          <Waiting />
        )}
      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Arena from "@/components/Arena";
import EndDialog from "@/components/EndDialog";
import Gate from "@/components/Gate";
import Header from "@/components/Header";
import SetupStage from "@/components/SetupStage";
import { ApiError, fetchState, getAuthStatus, postForm, postJSON } from "@/lib/client";
import { cropPhoto } from "@/lib/crop";
import type { AuthStatus, BoardState, Side } from "@/lib/types";
import useWakeLock from "@/lib/useWakeLock";

const pad2 = (n: number) => String(n).padStart(2, "0");
const nameOf = (board: BoardState, side: Side) => board.names[side] || (side === 0 ? "Player 1" : "Player 2");

export default function AdminPage() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [draftA, setDraftA] = useState("");
  const [draftB, setDraftB] = useState("");
  const [endOpen, setEndOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [popTick, setPopTick] = useState<[number, number]>([0, 0]);

  const revRef = useRef<number | undefined>(undefined);
  const stageRef = useRef<string | null>(null);
  const fileA = useRef<HTMLInputElement>(null);
  const fileB = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    document.body.classList.remove("is-viewer");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const status = await getAuthStatus();
        if (!alive) return;
        setAuth(status);
        if (status.authed) {
          const state = await fetchState();
          if (alive && state) setBoard(state);
        }
      } catch {
        if (!alive) return;
        setAuth({ needsSetup: false, authed: false, username: null });
        showToast("Can't reach the server. Check the connection and reload.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [showToast]);

  useEffect(() => {
    revRef.current = board?.rev;
  }, [board?.rev]);

  useEffect(() => {
    if (!board) return;
    if (board.stage !== stageRef.current) {
      stageRef.current = board.stage;
      if (board.stage === "setup") {
        setDraftA(board.names[0]);
        setDraftB(board.names[1]);
      }
    }
  }, [board]);

  useEffect(() => {
    if (!board) return;
    document.title =
      board.stage === "live"
        ? `${board.scores[0]} — ${board.scores[1]} · ${nameOf(board, 0)} vs ${nameOf(board, 1)}`
        : "Scoreboard";
  }, [board]);

  useEffect(() => {
    if (!auth?.authed) return;
    let stopped = false;
    const tick = async () => {
      try {
        const next = await fetchState(revRef.current);
        if (!stopped && next) setBoard(next);
      } catch {
        // Keep the last known board while the network hiccups.
      }
    };
    const id = window.setInterval(tick, 1200);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [auth?.authed]);

  const flash = useCallback((side: Side) => {
    setPopTick((current) => {
      const next: [number, number] = [current[0], current[1]];
      next[side] += 1;
      return next;
    });
  }, []);

  const act = useCallback(
    async (body: Record<string, unknown>, optimistic?: (current: BoardState) => BoardState) => {
      if (optimistic) setBoard((current) => (current ? optimistic(current) : current));
      try {
        const data = await postJSON<{ state: BoardState }>("/api/board", body);
        setBoard(data.state);
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setBoard(null);
          setAuth({ needsSetup: false, authed: false, username: null });
          showToast("Your session ended. Sign in again.");
        } else {
          showToast(err instanceof Error ? err.message : "That didn't save. Try again.");
          try {
            const state = await fetchState();
            if (state) setBoard(state);
          } catch {}
        }
        return false;
      }
    },
    [showToast]
  );

  const handleGate = useCallback(
    async (password: string) => {
      const setup = !!auth?.needsSetup;
      await postJSON(setup ? "/api/auth/setup" : "/api/auth/login", { password });
      setAuth({ needsSetup: false, authed: true });
      try {
        const state = await fetchState();
        if (state) setBoard(state);
      } catch {}
    },
    [auth?.needsSetup]
  );

  const signOut = useCallback(async () => {
    try {
      await postJSON("/api/auth/logout", {});
    } catch {}
    setBoard(null);
    setAuth({ needsSetup: false, authed: false });
  }, []);

  const point = useCallback(
    (side: Side, delta: number) => {
      flash(side);
      act({ action: "point", side, delta }, (current) => {
        const scores: [number, number] = [current.scores[0], current.scores[1]];
        scores[side] += delta;
        return { ...current, scores, canUndo: true };
      });
    },
    [act, flash]
  );

  const undo = useCallback(() => {
    const current = board;
    if (!current?.last) return;
    flash(current.last.side);
    act({ action: "undo" }, (state) => {
      if (!state.last) return state;
      const scores: [number, number] = [state.scores[0], state.scores[1]];
      scores[state.last.side] -= state.last.delta;
      return { ...state, scores, canUndo: false, last: null };
    });
  }, [act, board, flash]);

  const start = useCallback(async () => {
    await act({ action: "start", nameA: draftA, nameB: draftB });
    (document.activeElement as HTMLElement | null)?.blur();
  }, [act, draftA, draftB]);

  const rename = useCallback(
    (side: Side, name: string) => {
      act({ action: "rename", side, name });
    },
    [act]
  );

  const confirmEnd = useCallback(() => {
    setEndOpen(false);
    act({ action: "end" });
  }, [act]);

  const pickPhoto = useCallback((side: Side) => {
    (side === 0 ? fileA : fileB).current?.click();
  }, []);

  const uploadPhoto = useCallback(
    async (side: Side, file: File | undefined) => {
      if (!file) return;
      const blob = await cropPhoto(file);
      if (!blob) {
        showToast("That file isn't an image.");
        return;
      }
      const form = new FormData();
      form.append("side", String(side));
      form.append("file", blob, "photo.jpg");
      try {
        const data = await postForm<{ state: BoardState }>("/api/board/photo", form);
        setBoard(data.state);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setBoard(null);
          setAuth({ needsSetup: false, authed: false, username: null });
          showToast("Your session ended. Sign in again.");
        } else {
          showToast(err instanceof Error ? err.message : "The photo could not be saved. Try again.");
        }
      }
    },
    [showToast]
  );

  const live = board?.stage === "live";
  const gated = !!auth && !auth.authed;
  const mode = auth?.needsSetup ? "setup" : "login";

  useWakeLock(!!(auth?.authed && live));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!auth?.authed || board?.stage !== "live" || endOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const key = e.key.toLowerCase();
      if (key === "a") {
        e.preventDefault();
        point(0, 1);
      } else if (key === "d") {
        e.preventDefault();
        point(1, 1);
      } else if (key === "z") {
        e.preventDefault();
        undo();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [auth?.authed, board?.stage, endOpen, point, undo]);

  return (
    <>
      {gated && auth && (
        <Gate key={mode} mode={mode} onSubmit={handleGate} />
      )}

      <div className="app" hidden={gated || !board}>
        {board && (
          <>
            <Header
              viewer={false}
              live={!!live}
              canUndo={board.canUndo}
              onUndo={undo}
              onEnd={() => setEndOpen(true)}
              onSignOut={signOut}
            />
            <div className="status-row">
              <div className={`status-pill${live ? " is-live" : ""}`} id="statusPill">
                <span className="status-dot" />
                <span id="statusText">{live ? `LIVE · SESSION ${pad2(board.session)}` : "NEW SESSION"}</span>
              </div>
            </div>
            <main>
              {live ? (
                <Arena
                  viewer={false}
                  board={board}
                  popTick={popTick}
                  onPoint={point}
                  onRename={rename}
                  onPickPhoto={pickPhoto}
                />
              ) : (
                <SetupStage
                  draftA={draftA}
                  draftB={draftB}
                  onDraftA={setDraftA}
                  onDraftB={setDraftB}
                  photos={board.photos}
                  results={board.results}
                  onPickPhoto={pickPhoto}
                  onStart={start}
                />
              )}
              {live && (
                <p className="foot-hint" id="footHint">
                  <kbd>A</kbd>
                  <kbd>D</kbd> add a point <span className="sep">·</span> <kbd>Z</kbd> undo{" "}
                  <span className="sep">·</span> click a name to rename
                </p>
              )}
            </main>
          </>
        )}
      </div>

      {board && (
        <EndDialog
          open={endOpen}
          a={nameOf(board, 0)}
          b={nameOf(board, 1)}
          sa={board.scores[0]}
          sb={board.scores[1]}
          onCancel={() => setEndOpen(false)}
          onConfirm={confirmEnd}
        />
      )}

      <input
        ref={fileA}
        id="fileA"
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.currentTarget.value = "";
          uploadPhoto(0, file);
        }}
      />
      <input
        ref={fileB}
        id="fileB"
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.currentTarget.value = "";
          uploadPhoto(1, file);
        }}
      />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

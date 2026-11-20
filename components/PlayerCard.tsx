"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Avatar from "./Avatar";
import { PenIcon } from "./icons";
import type { Side } from "@/lib/types";

const DELTAS = [-1, 1, 2, 3];

type Props = {
  side: Side;
  name: string;
  score: number;
  photoRev: number | null;
  viewer: boolean;
  popSignal: number;
  onPoint?: (side: Side, delta: number) => void;
  onRename?: (side: Side, name: string) => void;
  onPickPhoto?: (side: Side) => void;
};

export default function PlayerCard({
  side,
  name,
  score,
  photoRev,
  viewer,
  popSignal,
  onPoint,
  onRename,
  onPickPhoto,
}: Props) {
  const [editing, setEditing] = useState(false);
  const cancelled = useRef(false);
  const scoreRef = useRef<HTMLDivElement>(null);
  const who = side === 0 ? "one" : "two";

  useEffect(() => {
    if (!popSignal) return;
    const el = scoreRef.current;
    if (!el) return;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }, [popSignal]);

  const digits = String(score).length;
  const fit = digits <= 2 ? 1 : digits === 3 ? 0.82 : digits === 4 ? 0.66 : 0.55;

  function commit(value: string) {
    const next = value.trim().slice(0, 24) || (side === 0 ? "Player 1" : "Player 2");
    if (next !== name) onRename?.(side, next);
  }

  return (
    <article
      id={side === 0 ? "sideA" : "sideB"}
      className={`player-card card-${side === 0 ? "a" : "b"}`}
      aria-label={`Player ${who}: ${name}`}
    >
      <div className="card-body">
        <Avatar
          side={side}
          name={name}
          rev={photoRev}
          variant="arena"
          disabled={viewer}
          onPick={() => onPickPhoto?.(side)}
        />
        <div className="info">
          <div className="name-slot">
            {editing ? (
              <input
                id={side === 0 ? "editA" : "editB"}
                className="name-edit"
                type="text"
                maxLength={24}
                defaultValue={name}
                autoFocus
                aria-label={`Rename player ${who}`}
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelled.current = true;
                    e.currentTarget.blur();
                  }
                }}
                onBlur={(e) => {
                  setEditing(false);
                  if (cancelled.current) {
                    cancelled.current = false;
                    return;
                  }
                  commit(e.currentTarget.value);
                }}
              />
            ) : (
              <button
                id={side === 0 ? "nameElA" : "nameElB"}
                className="player-name"
                type="button"
                tabIndex={viewer ? -1 : 0}
                title={viewer ? undefined : `${name} — click to rename`}
                onClick={() => {
                  if (!viewer) setEditing(true);
                }}
              >
                <span className="name-text" id={side === 0 ? "nameTextA" : "nameTextB"}>
                  {name}
                </span>
                {!viewer && <PenIcon />}
              </button>
            )}
          </div>
          <p className="pts">Pts</p>
          <div
            ref={scoreRef}
            id={side === 0 ? "scoreA" : "scoreB"}
            className="score"
            style={{ "--fit": fit } as CSSProperties}
            aria-live="polite"
            aria-label={`${name} score: ${score}`}
          >
            {score}
          </div>
        </div>
      </div>
      {!viewer && (
        <div className="controls">
          {DELTAS.map((delta) => (
            <button
              key={delta}
              className={`ctl${delta === -1 ? " minus" : delta === 1 ? " primary" : ""}`}
              type="button"
              data-side={side}
              data-delta={delta}
              aria-label={
                (delta === -1
                  ? "Subtract one point"
                  : delta === 1
                    ? "Add one point"
                    : delta === 2
                      ? "Add two points"
                      : "Add three points") + ` for ${name}`
              }
              onClick={() => onPoint?.(side, delta)}
            >
              {delta === -1 ? "\u22121" : `+${delta}`}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

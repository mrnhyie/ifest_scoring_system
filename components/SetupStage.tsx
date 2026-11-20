"use client";

import type { KeyboardEvent } from "react";
import Avatar from "./Avatar";
import History from "./History";
import { ArrowIcon } from "./icons";
import type { SessionResult, Side } from "@/lib/types";

type Props = {
  draftA: string;
  draftB: string;
  onDraftA: (value: string) => void;
  onDraftB: (value: string) => void;
  photos: [number | null, number | null];
  results: SessionResult[];
  onPickPhoto: (side: Side) => void;
  onStart: () => void;
};

export default function SetupStage({
  draftA,
  draftB,
  onDraftA,
  onDraftB,
  photos,
  results,
  onPickPhoto,
  onStart,
}: Props) {
  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onStart();
    }
  };

  return (
    <section className="setup" id="setupView">
      <div className="setup-inner">
        <div className="duo">
          <Avatar side={0} name={draftA} rev={photos[0]} variant="duo" onPick={() => onPickPhoto(0)} />
          <div className="vs-badge">vs</div>
          <Avatar side={1} name={draftB} rev={photos[1]} variant="duo" onPick={() => onPickPhoto(1)} />
        </div>
        <p className="duo-hint">Click a circle to add a photo</p>

        <h2 className="setup-title">Who&rsquo;s competing?</h2>
        <p className="setup-sub">Name both players to start the session.</p>

        <div className="name-fields">
          <label className="name-field field-a">
            <span className="field-tag" aria-hidden="true">
              01
            </span>
            <span className="field-text">
              <span className="field-label" aria-hidden="true">
                Player 01
              </span>
              <input
                id="inputA"
                type="text"
                maxLength={24}
                placeholder="Enter name"
                aria-label="Player one name"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                value={draftA}
                onChange={(e) => onDraftA(e.target.value)}
                onKeyDown={onEnter}
              />
            </span>
          </label>
          <label className="name-field field-b">
            <span className="field-tag" aria-hidden="true">
              02
            </span>
            <span className="field-text">
              <span className="field-label" aria-hidden="true">
                Player 02
              </span>
              <input
                id="inputB"
                type="text"
                maxLength={24}
                placeholder="Enter name"
                aria-label="Player two name"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                value={draftB}
                onChange={(e) => onDraftB(e.target.value)}
                onKeyDown={onEnter}
              />
            </span>
          </label>
        </div>

        <button className="start-btn" id="startBtn" type="button" onClick={onStart}>
          <span>Start session</span>
          <ArrowIcon />
        </button>
        <p className="key-hint">
          Press <kbd>Enter</kbd> to start
        </p>

        <History results={results} />
      </div>
    </section>
  );
}

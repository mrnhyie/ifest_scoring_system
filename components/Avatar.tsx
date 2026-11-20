"use client";

import { CamIcon } from "./icons";
import type { Side } from "@/lib/types";

export function initialsOf(name: string, side: Side): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return side === 0 ? "01" : "02";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

type Props = {
  side: Side;
  name: string;
  rev: number | null;
  variant: "duo" | "arena";
  disabled?: boolean;
  onPick?: () => void;
};

export default function Avatar({ side, name, rev, variant, disabled = false, onPick }: Props) {
  const who = name || (side === 0 ? "player one" : "player two");
  const label = variant === "duo" ? `Add or change photo for ${who}` : `Change photo for ${who}`;

  return (
    <button
      className={variant === "duo" ? `duo-avatar duo-${side === 0 ? "a" : "b"}` : "avatar"}
      type="button"
      data-pick={side}
      disabled={disabled}
      aria-label={label}
      onClick={disabled ? undefined : onPick}
    >
      <span className="avatar-shot" data-side={side}>
        {rev ? (
          <img src={`/api/photo/${side}?v=${rev}`} alt="" />
        ) : (
          <span className="initials">{initialsOf(name, side)}</span>
        )}
      </span>
      {!disabled && (
        <span className="cam" aria-hidden="true">
          <CamIcon />
        </span>
      )}
    </button>
  );
}

"use client";

import PlayerCard from "./PlayerCard";
import type { BoardState, Side } from "@/lib/types";

type Props = {
  viewer: boolean;
  board: BoardState;
  popTick: [number, number];
  onPoint?: (side: Side, delta: number) => void;
  onRename?: (side: Side, name: string) => void;
  onPickPhoto?: (side: Side) => void;
};

const nameOf = (board: BoardState, i: Side) => board.names[i] || (i === 0 ? "Player 1" : "Player 2");

export default function Arena({ viewer, board, popTick, onPoint, onRename, onPickPhoto }: Props) {
  return (
    <section className="arena" id="arenaView">
      {([0, 1] as Side[]).map((side) => (
        <PlayerCard
          key={side}
          side={side}
          name={nameOf(board, side)}
          score={board.scores[side]}
          photoRev={board.photos[side]}
          viewer={viewer}
          popSignal={popTick[side]}
          onPoint={onPoint}
          onRename={onRename}
          onPickPhoto={onPickPhoto}
        />
      ))}
    </section>
  );
}

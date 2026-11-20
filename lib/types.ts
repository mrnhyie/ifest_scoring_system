export type Side = 0 | 1;

export type Point = { side: Side; delta: number };

export type SessionResult = {
  n: number;
  a: string;
  b: string;
  sa: number;
  sb: number;
  at: number;
};

export type BoardState = {
  rev: number;
  stage: "setup" | "live";
  session: number;
  names: [string, string];
  scores: [number, number];
  canUndo: boolean;
  last: Point | null;
  results: SessionResult[];
  photos: [number | null, number | null];
  updatedAt: number;
};

export type AuthStatus = {
  needsSetup: boolean;
  authed: boolean;
  username?: string | null;
};

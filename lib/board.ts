import { getDb, type Queryable } from "./db";
import type { BoardState, Point, SessionResult, Side } from "./types";

export class BoardError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MAX_NAME = 24;
const MAX_RESULTS = 7;

const defaultName = (side: Side) => (side === 0 ? "Player 1" : "Player 2");

function cleanName(value: unknown, side: Side): string {
  const name = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME);
  return name || defaultName(side);
}

function parseSide(value: unknown): Side {
  const side = Number(value);
  if (side !== 0 && side !== 1) throw new BoardError(400, "Unknown player.");
  return side;
}

type BoardRow = {
  rev: number | string;
  stage: string;
  session_no: number | string;
  name_a: string;
  name_b: string;
  score_a: number | string;
  score_b: number | string;
  history: Point[] | null;
  results: SessionResult[] | null;
  updated_at: string | Date;
};

function toState(row: BoardRow, photos: [number | null, number | null]): BoardState {
  const history = Array.isArray(row.history) ? row.history : [];
  return {
    rev: Number(row.rev),
    stage: row.stage === "live" ? "live" : "setup",
    session: Number(row.session_no),
    names: [String(row.name_a), String(row.name_b)],
    scores: [Number(row.score_a), Number(row.score_b)],
    canUndo: history.length > 0,
    last: history.length ? history[history.length - 1] : null,
    results: Array.isArray(row.results) ? row.results : [],
    photos,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

async function readState(q: Queryable): Promise<BoardState> {
  const rows = await q.query(
    `select b.*, p0.rev as photo0, p1.rev as photo1
       from board b
       left join photos p0 on p0.side = 0
       left join photos p1 on p1.side = 1
      where b.id = 1`
  );
  const row = rows[0] as BoardRow;
  const photo0 = rows[0].photo0 == null ? null : Number(rows[0].photo0);
  const photo1 = rows[0].photo1 == null ? null : Number(rows[0].photo1);
  return toState(row, [photo0, photo1]);
}

export async function getState(): Promise<BoardState> {
  const db = await getDb();
  return readState(db);
}

type Mutator = (q: Queryable, row: BoardRow) => Promise<void>;

export async function mutate(fn: Mutator): Promise<BoardState> {
  const db = await getDb();
  return db.tx(async (q) => {
    const rows = await q.query("select * from board where id = 1 for update");
    await fn(q, rows[0] as BoardRow);
    await q.query("update board set rev = rev + 1, updated_at = now() where id = 1");
    return readState(q);
  });
}

export async function startSession(nameA: unknown, nameB: unknown): Promise<BoardState> {
  return mutate(async (q, row) => {
    if (row.stage === "live") throw new BoardError(409, "A session is already live.");
    await q.query(
      `update board
          set stage = 'live', session_no = session_no + 1,
              name_a = $1, name_b = $2,
              score_a = 0, score_b = 0, history = '[]'::jsonb
        where id = 1`,
      [cleanName(nameA, 0), cleanName(nameB, 1)]
    );
  });
}

export async function addPoint(sideValue: unknown, deltaValue: unknown): Promise<BoardState> {
  const side = parseSide(sideValue);
  const delta = Number(deltaValue);
  if (![-1, 1, 2, 3].includes(delta)) throw new BoardError(400, "Invalid point change.");
  return mutate(async (q, row) => {
    if (row.stage !== "live") throw new BoardError(409, "No live session.");
    const history: Point[] = Array.isArray(row.history) ? [...row.history] : [];
    history.push({ side, delta });
    const scoreA = Number(row.score_a) + (side === 0 ? delta : 0);
    const scoreB = Number(row.score_b) + (side === 1 ? delta : 0);
    await q.query("update board set score_a = $1, score_b = $2, history = $3::jsonb where id = 1", [
      scoreA,
      scoreB,
      JSON.stringify(history),
    ]);
  });
}

export async function undoTurn(): Promise<BoardState> {
  return mutate(async (q, row) => {
    if (row.stage !== "live") throw new BoardError(409, "No live session.");
    const history: Point[] = Array.isArray(row.history) ? [...row.history] : [];
    const last = history.pop();
    if (!last) throw new BoardError(409, "Nothing to undo.");
    const scoreA = Number(row.score_a) - (last.side === 0 ? last.delta : 0);
    const scoreB = Number(row.score_b) - (last.side === 1 ? last.delta : 0);
    await q.query("update board set score_a = $1, score_b = $2, history = $3::jsonb where id = 1", [
      scoreA,
      scoreB,
      JSON.stringify(history),
    ]);
  });
}

export async function endSession(): Promise<BoardState> {
  return mutate(async (q, row) => {
    if (row.stage !== "live") throw new BoardError(409, "No live session.");
    const results: SessionResult[] = [
      {
        n: Number(row.session_no),
        a: String(row.name_a),
        b: String(row.name_b),
        sa: Number(row.score_a),
        sb: Number(row.score_b),
        at: Date.now(),
      },
      ...(Array.isArray(row.results) ? row.results : []),
    ].slice(0, MAX_RESULTS);
    await q.query(
      `update board
          set stage = 'setup', score_a = 0, score_b = 0,
              history = '[]'::jsonb, results = $1::jsonb
        where id = 1`,
      [JSON.stringify(results)]
    );
  });
}

export async function renamePlayer(sideValue: unknown, nameValue: unknown): Promise<BoardState> {
  const side = parseSide(sideValue);
  return mutate(async (q, row) => {
    if (row.stage !== "live") throw new BoardError(409, "No live session.");
    const column = side === 0 ? "name_a" : "name_b";
    await q.query(`update board set ${column} = $1 where id = 1`, [cleanName(nameValue, side)]);
  });
}

export async function savePhoto(side: Side, mime: string, bytes: Uint8Array): Promise<BoardState> {
  return mutate(async (q) => {
    await q.query(
      `insert into photos (side, mime, bytes, rev) values ($1, $2, $3, 1)
       on conflict (side) do update
         set mime = excluded.mime, bytes = excluded.bytes,
             rev = photos.rev + 1, updated_at = now()`,
      [side, mime, bytes]
    );
  });
}

export async function getPhoto(side: Side): Promise<{ mime: string; bytes: Buffer; rev: number } | null> {
  const db = await getDb();
  const rows = await db.query("select mime, bytes, rev from photos where side = $1", [side]);
  const row = rows[0];
  if (!row) return null;
  const raw = row.bytes;
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array);
  return { mime: String(row.mime), bytes, rev: Number(row.rev) };
}

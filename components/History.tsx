"use client";

import type { SessionResult } from "@/lib/types";

const pad2 = (n: number) => String(n).padStart(2, "0");

export default function History({ results }: { results: SessionResult[] }) {
  return (
    <section className="history" id="past" hidden={results.length === 0}>
      <div className="history-head">
        <h3>Previous sessions</h3>
        <span className="history-count" id="historyCount">
          {results.length ? `${results.length} saved` : ""}
        </span>
      </div>
      <ul id="pastList">
        {results.map((r, i) => {
          const aWin = r.sa > r.sb;
          const bWin = r.sb > r.sa;
          const aCls = aWin ? "win" : bWin ? "lose" : "";
          const bCls = bWin ? "win" : aWin ? "lose" : "";
          const date = new Date(r.at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
          return (
            <li key={`${r.n}-${r.at}-${i}`}>
              <span className="h-no">S{pad2(r.n || 0)}</span>
              <span className="h-line">
                <span className={aCls}>{r.a}</span> <b className={aCls}>{r.sa}</b>{" "}
                <span className="dash">—</span> <b className={bCls}>{r.sb}</b>{" "}
                <span className={bCls}>{r.b}</span>
              </span>
              <span className="h-date">{date}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

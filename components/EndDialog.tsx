"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  a: string;
  b: string;
  sa: number;
  sb: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function EndDialog({ open, a, b, sa, sb, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      id="endDialog"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="sheet">
        <p className="dlg-eyebrow">End session</p>
        <h2>Final score?</h2>
        <p className="dlg-sub">The result will be saved to previous sessions and you&rsquo;ll return to setup.</p>
        <div className="final">
          <div className="final-row">
            <span className="final-dot a" aria-hidden="true" />
            <span className="final-name" id="dlgNameA">
              {a}
            </span>
            <b id="dlgScoreA">{sa}</b>
          </div>
          <div className="final-row">
            <span className="final-dot b" aria-hidden="true" />
            <span className="final-name" id="dlgNameB">
              {b}
            </span>
            <b id="dlgScoreB">{sb}</b>
          </div>
        </div>
        <div className="dialog-actions">
          <button className="btn-soft" id="cancelEnd" type="button" onClick={onCancel}>
            Keep playing
          </button>
          <button className="btn-solid" id="confirmEnd" type="button" onClick={onConfirm}>
            End session
          </button>
        </div>
      </div>
    </dialog>
  );
}

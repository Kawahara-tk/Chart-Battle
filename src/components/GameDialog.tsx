"use client";

import { useEffect, useId, useRef } from "react";
import { MAX_HOLDINGS } from "@/lib/trading/account";

export function GameDialog({
  open,
  title,
  children,
  actions,
  onDismiss,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      className="game-dialog"
      ref={ref}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      <h2 id={id}>{title}</h2>
      <div className="dialog-content">{children}</div>
      <div className="dialog-actions">{actions}</div>
    </dialog>
  );
}

export function HowToPlay() {
  return (
    <>
      <ul className="help-list">
        <li>値上がりしそうなタイミングで購入。</li>
        <li>売りどきを見つけたら売却。</li>
        <li>1分で終了し、結果が表示されます。</li>
      </ul>
      <p className="secondary-text">
        1回押すごとに1口を売買。保有は最大{MAX_HOLDINGS}口です。
      </p>
    </>
  );
}

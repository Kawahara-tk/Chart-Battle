"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameSession } from "./GameSessionProvider";
import { GameHeader } from "./GameHeader";
import { GameDialog, HowToPlay } from "./GameDialog";
import { MarketChart } from "./MarketChart";
import { TradePanel } from "./TradePanel";

export function PlayScreen() {
  const game = useGameSession();
  const router = useRouter();
  const [dialog, setDialog] = useState<"help" | "exit" | "restart" | null>(
    null,
  );
  const resumeAfterDialog = useRef(false);
  const { status, pause, play } = game.replay;
  useEffect(() => {
    if (status === "finished") router.replace("/result");
  }, [status, router]);

  const openDialog = (next: "help" | "exit" | "restart") => {
    if (
      next === "exit" &&
      game.replay.elapsedMs === 0 &&
      game.trading.account.trades.length === 0
    ) {
      router.push("/");
      return;
    }
    resumeAfterDialog.current = status === "playing";
    pause();
    setDialog(next);
  };
  const dismiss = () => {
    setDialog(null);
    if (resumeAfterDialog.current) play();
  };
  const reset = () => {
    setDialog(null);
    resumeAfterDialog.current = false;
    game.prepare(game.scenario.id);
  };

  return (
    <div className="app-shell play-screen">
      <GameHeader
        onHome={() => openDialog("exit")}
        onHelp={() => openDialog("help")}
      />
      <main className="play-main">
        <div className="play-toolbar">
          <h1>短期トレード</h1>
          <div className="play-actions">
            <button
              className="button-secondary"
              disabled={status === "ready" || status === "finished"}
              onClick={status === "playing" ? pause : play}
            >
              {status === "paused" ? "再開する" : "一時停止"}
            </button>
            <button
              className="text-button"
              onClick={() => openDialog("restart")}
            >
              やり直す
            </button>
          </div>
        </div>
        <div className="play-grid">
          <div className="play-chart-column">
            <MarketChart onStart={play} />
            {status === "paused" && !dialog && (
              <p className="pause-notice" role="status">
                一時停止中
              </p>
            )}
          </div>
          <TradePanel
            name={game.scenario.name}
            state={game.trading}
            priceCents={game.priceCents}
            status={status}
            onOrder={game.order}
          />
        </div>
      </main>
      <GameDialog
        open={dialog === "help"}
        title="あそび方"
        onDismiss={dismiss}
        actions={
          <button className="button-primary" onClick={dismiss}>
            {resumeAfterDialog.current ? "プレイに戻る" : "閉じる"}
          </button>
        }
      >
        <HowToPlay />
      </GameDialog>
      <GameDialog
        open={dialog === "exit"}
        title="ホームに戻りますか？"
        onDismiss={dismiss}
        actions={
          <>
            <button className="button-secondary" onClick={dismiss}>
              プレイを続ける
            </button>
            <button
              className="button-primary"
              onClick={() => {
                reset();
                router.push("/");
              }}
            >
              ホームに戻る
            </button>
          </>
        }
      >
        <p>今回のプレイ内容はリセットされます。</p>
      </GameDialog>
      <GameDialog
        open={dialog === "restart"}
        title="最初からやり直しますか？"
        onDismiss={dismiss}
        actions={
          <>
            <button className="button-secondary" onClick={dismiss}>
              キャンセル
            </button>
            <button className="button-primary" onClick={reset}>
              やり直す
            </button>
          </>
        }
      >
        <p>今回のプレイ内容を初期状態に戻します。</p>
      </GameDialog>
    </div>
  );
}

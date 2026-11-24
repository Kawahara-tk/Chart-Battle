"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameSession } from "./GameSessionProvider";
import { GameHeader } from "./GameHeader";
import { GameDialog, HowToPlay } from "./GameDialog";
import { ScenarioPicker } from "./ScenarioPicker";

export function HomeScreen() {
  const game = useGameSession();
  const [selected, setSelected] = useState(game.scenario.id);
  const [help, setHelp] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const router = useRouter();
  const newGame = () => {
    setConfirmNew(false);
    game.prepare(selected);
    router.push("/play");
  };
  const resumable =
    game.replay.status === "paused" && game.replay.elapsedMs > 0;
  const start = () => {
    if (resumable) setConfirmNew(true);
    else newGame();
  };
  return (
    <div className="app-shell home-screen">
      <GameHeader onHelp={() => setHelp(true)} />
      <main className="home-main">
        <section className="home-hero">
          <div className="hero-copy">
            <span className="eyebrow">SNS × VIRTUAL TRADE</span>
            <h1>
              バズを買え。
              <br />
              <span>ピークで売れ。</span>
            </h1>
            <p>話題の波を読んで、1分間の仮想トレード。</p>
            <div className="hero-actions">
              <button className="button-primary" onClick={start}>
                プレイする
              </button>
              <button
                className="button-secondary"
                onClick={() => setHelp(true)}
              >
                あそび方
              </button>
            </div>
            {resumable && (
              <Link className="resume-link" href="/play">
                途中のプレイに戻る
              </Link>
            )}
            <span className="hero-note">
              初期10,000コイン · 実際のお金は使いません
            </span>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="preview-heading">
              <span># 次のトレンド</span>
              <span className="preview-label">CHART PREVIEW</span>
            </div>
            <svg viewBox="0 0 520 300" fill="none">
              <defs>
                <linearGradient id="home-wave" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#b9e8d8" stopOpacity=".65" />
                  <stop offset="1" stopColor="#e6f6f0" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M24 238H496M24 173H496M24 108H496M24 43H496"
                stroke="#e7ebe8"
                strokeDasharray="4 6"
              />
              <path
                d="M24 231C55 232 61 195 90 199S122 234 153 206S177 128 207 145S245 174 275 118S305 38 338 49S365 127 398 107S434 129 496 80V276H24Z"
                fill="url(#home-wave)"
              />
              <path
                d="M24 231C55 232 61 195 90 199S122 234 153 206S177 128 207 145S245 174 275 118S305 38 338 49S365 127 398 107S434 129 496 80"
                stroke="#27856a"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                cx="90"
                cy="199"
                r="6"
                fill="#fff"
                stroke="#27856a"
                strokeWidth="2"
              />
              <circle
                cx="338"
                cy="49"
                r="6"
                fill="#fff"
                stroke="#e89653"
                strokeWidth="2"
              />
              <rect
                x="63"
                y="226"
                width="54"
                height="29"
                rx="14.5"
                fill="#e0f1e8"
              />
              <text
                x="90"
                y="245"
                textAnchor="middle"
                fill="#20634e"
                fontSize="13"
              >
                BUY
              </text>
              <rect
                x="311"
                y="4"
                width="54"
                height="29"
                rx="14.5"
                fill="#fae5d3"
              />
              <text
                x="338"
                y="23"
                textAnchor="middle"
                fill="#95551e"
                fontSize="13"
              >
                SELL
              </text>
            </svg>
            <span className="preview-caption">
              波に乗る。売りどきを見つける。
            </span>
          </div>
        </section>
        <section className="home-market">
          <ScenarioPicker selected={selected} onSelect={setSelected} />
          <div className="market-start">
            <span>
              1プレイ 1分 <i />
              初期資金 10,000コイン
            </span>
            <button className="button-primary" onClick={start}>
              この市場でプレイ
            </button>
          </div>
        </section>
      </main>
      <footer className="site-footer">モックデータを使用した体験版</footer>
      <GameDialog
        open={help}
        title="あそび方"
        onDismiss={() => setHelp(false)}
        actions={
          <button className="button-primary" onClick={() => setHelp(false)}>
            わかった
          </button>
        }
      >
        <HowToPlay />
      </GameDialog>
      <GameDialog
        open={confirmNew}
        title="新しくプレイしますか？"
        onDismiss={() => setConfirmNew(false)}
        actions={
          <>
            <button
              className="button-secondary"
              onClick={() => setConfirmNew(false)}
            >
              キャンセル
            </button>
            <button className="button-primary" onClick={newGame}>
              新しくプレイ
            </button>
          </>
        }
      >
        <p>途中のプレイはリセットされます。</p>
      </GameDialog>
    </div>
  );
}

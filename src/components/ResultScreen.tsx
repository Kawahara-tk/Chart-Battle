"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameSession } from "./GameSessionProvider";
import { GameHeader } from "./GameHeader";
import { MarketChart } from "./MarketChart";
import { valueAccount } from "@/lib/trading/account";
import { formatCoins, formatPnl } from "@/lib/trading/format";

export function ResultScreen() {
  const game = useGameSession();
  const router = useRouter();
  const value = valueAccount(game.trading.account, game.priceCents);
  return (
    <div className="app-shell result-screen">
      <GameHeader />
      <main className="result-main">
        {game.replay.status !== "finished" ? (
          <section className="empty-result">
            <h1>結果はまだありません</h1>
            <p>プレイを終えると、ここに結果が表示されます。</p>
            <Link className="button-primary" href="/">
              ホームへ
            </Link>
          </section>
        ) : (
          <>
            <section className="result-hero">
              <span className="eyebrow">RESULT</span>
              <h1>今回の結果</h1>
              <span className="result-market">{game.scenario.name}</span>
              <div className="result-score" data-testid="final-score">
                {formatCoins(value.totalCents)}
                <span>コイン</span>
              </div>
              <span
                className={`result-profit ${value.pnlCents < 0 ? "loss" : "gain"}`}
              >
                {formatPnl(value.pnlCents)}コイン
              </span>
              <div className="result-stats">
                <div>
                  <span>残りコイン</span>
                  <strong>{formatCoins(game.trading.account.cashCents)}</strong>
                </div>
                <div>
                  <span>保有評価額</span>
                  <strong>{formatCoins(value.holdingsCents)}</strong>
                </div>
                <div>
                  <span>取引回数</span>
                  <strong>
                    {game.trading.account.trades.length}
                    <small>回</small>
                  </strong>
                </div>
              </div>
              <div className="result-actions">
                <button
                  className="button-primary"
                  onClick={() => {
                    game.prepare(game.scenario.id);
                    router.push("/play");
                  }}
                >
                  もう一度プレイ
                </button>
                <Link className="button-secondary" href="/">
                  ホームへ
                </Link>
              </div>
            </section>
            <div className="result-chart">
              <MarketChart />
            </div>
          </>
        )}
      </main>
      <footer className="site-footer">モックデータを使用した体験版</footer>
    </div>
  );
}

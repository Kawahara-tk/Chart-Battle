"use client";

import { MARKET_SECONDS } from "@/lib/market/mock-data";
import { formatMarketTime } from "@/lib/trading/format";
import { useGameSession } from "./GameSessionProvider";
import { TrendChart } from "./TrendChart";

export function MarketChart({ onStart }: { onStart?: () => void }) {
  const game = useGameSession();
  const change = (game.priceCents / 100 / game.curve.start.y - 1) * 100;
  return (
    <section className="market-panel" aria-labelledby="market-title">
      <div className="market-summary">
        <div>
          <h2 id="market-title">{game.scenario.name}</h2>
          <span className="market-symbol-label">{game.scenario.symbol}</span>
        </div>
        <div className="price-summary">
          <span className="current-price" data-testid="current-price">
            {(game.priceCents / 100).toFixed(2)}
          </span>
          <span
            className={change < 0 ? "price-change loss" : "price-change gain"}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="chart-stage">
        <TrendChart
          curve={game.curve}
          segments={game.segments}
          current={game.current}
          marketSeconds={MARKET_SECONDS}
          name={game.scenario.name}
          trades={game.trading.account.trades}
        />
        {game.replay.status === "ready" && onStart && (
          <div className="start-overlay">
            <button className="button-primary" onClick={onStart}>
              トレード開始
            </button>
          </div>
        )}
      </div>
      <div className="chart-bottom">
        <span>
          市場時刻{" "}
          <b data-testid="market-time">{formatMarketTime(game.time)}</b>
        </span>
        <span className="chart-marker-legend">
          <i className="buy-dot" />
          購入
          <i className="sell-dot" />
          売却
        </span>
      </div>
    </section>
  );
}

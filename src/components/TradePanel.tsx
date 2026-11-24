import type { ReplayStatus } from "@/lib/replay/clock";
import {
  MAX_HOLDINGS,
  type TradeSide,
  type TradingState,
} from "@/lib/trading/account";
import { formatCoins } from "@/lib/trading/format";

export function TradePanel({
  name,
  state,
  priceCents,
  status,
  onOrder,
}: {
  name: string;
  state: TradingState;
  priceCents: number;
  status: ReplayStatus;
  onOrder: (side: TradeSide) => void;
}) {
  const account = state.account;
  const active = status === "playing";
  const trade = state.lastTrade;
  const atLimit = account.quantity >= MAX_HOLDINGS;
  const hasFunds = account.cashCents >= priceCents;
  let hint = "1クリックで1口";
  if (status === "ready") hint = "開始すると売買できます";
  if (status === "paused") hint = "一時停止中";
  if (status === "finished") hint = "売買は終了しました";
  if (active && !hasFunds) hint = "購入に必要なコインが足りません";
  if (active && atLimit) hint = "保有上限に達しました";
  return (
    <section className="trade-panel" aria-labelledby="trade-title">
      <div className="order-panel-heading">
        <h2 id="trade-title">売買</h2>
        <span>{name}</span>
      </div>
      <div className="trade-position">
        <div className="position-holdings">
          <div className="position-label">
            <span>保有</span>
            <strong>
              {account.quantity} / {MAX_HOLDINGS}口
            </strong>
          </div>
          <div
            className="holdings-gauge"
            role="meter"
            aria-label="保有口数"
            aria-valuemin={0}
            aria-valuemax={MAX_HOLDINGS}
            aria-valuenow={account.quantity}
            aria-valuetext={`${MAX_HOLDINGS}口中${account.quantity}口を保有`}
          >
            {Array.from({ length: MAX_HOLDINGS }, (_, index) => (
              <span
                key={index}
                className={index < account.quantity ? "is-filled" : undefined}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        <div className="position-cash">
          <span>残りコイン</span>
          <strong data-testid="cash-balance">
            {formatCoins(account.cashCents)}
          </strong>
        </div>
      </div>
      <div className="order-quote">
        <span>1口の価格</span>
        <strong>
          {formatCoins(priceCents)}
          <small>コイン</small>
        </strong>
      </div>
      <div className="trade-buttons">
        <button
          className="button-buy"
          type="button"
          disabled={!active || atLimit || !hasFunds}
          onClick={() => onOrder("buy")}
        >
          1口買う
        </button>
        <button
          className="button-sell"
          type="button"
          disabled={!active || account.quantity === 0}
          onClick={() => onOrder("sell")}
        >
          1口売る
        </button>
      </div>
      <p className="order-help">{hint}</p>
      <div className="trade-feedback" aria-live="polite" aria-atomic="true">
        {state.error ? (
          <p className="loss" role="alert">
            {state.error}
          </p>
        ) : (
          trade && (
            <p key={trade.id}>
              {trade.side === "buy" ? "購入" : "売却"} {trade.quantity}口 ·{" "}
              {formatCoins(trade.priceCents)}コイン
            </p>
          )
        )}
      </div>
    </section>
  );
}

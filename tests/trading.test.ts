import assert from "node:assert/strict";
import test from "node:test";
import {
  createAccount,
  createTradingState,
  executeTrade,
  INITIAL_CASH_CENTS,
  MAX_HOLDINGS,
  priceToCents,
  tradingReducer,
  valueAccount,
  type Account,
  type Quote,
  type TradeSide,
} from "../src/lib/trading/account";
import { createPriceCurve, curveAtTime } from "../src/lib/market/curve";
import {
  initialClock,
  playClock,
  REPLAY_DURATION_MS,
  settleClock,
} from "../src/lib/replay/clock";
import { quoteAtClock } from "../src/lib/trading/quote";

const quote = (priceCents = 10_000, marketTime = 1): Quote => ({
  marketId: "test",
  priceCents,
  marketTime,
  status: "playing",
});
function trade(
  account: Account,
  side: TradeSide,
  quantity: number,
  priceCents = 10_000,
  marketTime = 1,
) {
  for (let i = 0; i < quantity; i++) {
    const result = executeTrade(account, side, quote(priceCents, marketTime));
    assert.equal(result.ok, true);
    account = result.account;
  }
  return account;
}

test("a session begins with exactly 10,000 coins and no positions or history", () => {
  const account = createAccount("test");
  assert.equal(account.cashCents, INITIAL_CASH_CENTS);
  assert.equal(account.quantity, 0);
  assert.equal(account.costBasisCents, 0);
  assert.deepEqual(account.trades, []);
  assert.equal(valueAccount(account, 10_000).totalCents, INITIAL_CASH_CENTS);
});

test("buying moves cash into holdings without changing total assets at the same price", () => {
  const account = trade(createAccount("test"), "buy", 1);
  assert.equal(account.cashCents, 990_000);
  assert.equal(account.quantity, 1);
  assert.equal(account.costBasisCents, 10_000);
  assert.equal(valueAccount(account, 10_000).totalCents, INITIAL_CASH_CENTS);
  assert.equal(account.trades.length, 1);
  assert.equal(account.trades[0].quantity, 1);
  assert.equal(account.trades[0].totalCents, 10_000);
});

test("buy, rise, partial sell, rebuy and close track realized and unrealized profit", () => {
  let account = trade(createAccount("test"), "buy", 10, 10_000, 1);
  let value = valueAccount(account, 15_000);
  assert.equal(value.pnlCents, 50_000);
  assert.equal(value.unrealizedPnlCents, 50_000);
  assert.equal(value.realizedPnlCents, 0);
  account = trade(account, "sell", 4, 15_000, 2);
  value = valueAccount(account, 15_000);
  assert.equal(account.quantity, 6);
  assert.equal(value.realizedPnlCents, 20_000);
  assert.equal(value.unrealizedPnlCents, 30_000);
  account = trade(account, "buy", 4, 12_000, 3);
  assert.equal(valueAccount(account, 12_000).averagePriceCents, 10_800);
  account = trade(account, "sell", 10, 9_000, 4);
  assert.equal(account.costBasisCents, 0);
  assert.equal(account.quantity, 0);
  assert.equal(account.realizedPnlCents, 2000);
  assert.equal(valueAccount(account, 9_000).pnlCents, 2000);
  assert.deepEqual(
    account.trades.map((t) => t.id),
    Array.from({ length: 28 }, (_, index) => index + 1),
  );
});

test("losses reduce total assets and are split into realized and remaining losses", () => {
  let account = trade(createAccount("test"), "buy", 10);
  account = trade(account, "sell", 4, 8000, 2);
  const value = valueAccount(account, 8000);
  assert.equal(value.realizedPnlCents, -8000);
  assert.equal(value.unrealizedPnlCents, -12_000);
  assert.equal(value.pnlCents, -20_000);
});

test("exact cash buys one unit, insufficient cash and selling from zero are rejected", () => {
  const bought = trade(createAccount("test"), "buy", 1, INITIAL_CASH_CENTS);
  assert.equal(bought.cashCents, 0);
  assert.equal(executeTrade(bought, "buy", quote()).ok, false);
  const sold = trade(bought, "sell", 1, INITIAL_CASH_CENTS);
  assert.equal(sold.cashCents, INITIAL_CASH_CENTS);
  assert.equal(sold.quantity, 0);
  assert.equal(executeTrade(sold, "sell", quote()).ok, false);
});

test("invalid prices never mutate the account", () => {
  const account = createAccount("test");
  const original = structuredClone(account);
  for (const price of [0, -10, 0.5, NaN, Infinity]) {
    assert.equal(executeTrade(account, "buy", quote(price)).ok, false);
  }
  assert.deepEqual(account, original);
});

test("trading is rejected before play, while paused, and after the deadline", () => {
  const account = createAccount("test");
  for (const status of ["ready", "paused", "finished"] as const) {
    assert.equal(
      executeTrade(account, "buy", { ...quote(), status }).ok,
      false,
    );
  }
  const curve = createPriceCurve([
    { time: 0, price: 100 },
    { time: 86_400, price: 200 },
  ]);
  // Even a stale "playing" status at the precise deadline cannot authorize an order.
  const expired = quoteAtClock(
    curve,
    "test",
    { ...playClock(initialClock(), 0), elapsedMs: REPLAY_DURATION_MS },
    REPLAY_DURATION_MS,
    86_400,
  );
  assert.equal(expired.status, "finished");
  assert.equal(executeTrade(account, "buy", expired).ok, false);
});

test("wrong markets, negative/nonfinite timestamps and backward orders are rejected", () => {
  const account = trade(createAccount("test"), "buy", 1, 10_000, 50);
  for (const bad of [
    { ...quote(), marketId: "other" },
    { ...quote(), marketTime: -1 },
    { ...quote(), marketTime: NaN },
    quote(10_000, 49),
  ]) {
    assert.equal(executeTrade(account, "sell", bad).ok, false);
  }
});

test("repeated clicks stop at 10 holdings, allow buying again after a sale, and stop selling at zero", () => {
  let state = createTradingState("test");
  const buy = { type: "trade", side: "buy", quote: quote() } as const;
  const sell = { ...buy, side: "sell" } as const;
  assert.equal(MAX_HOLDINGS, 10);

  for (let i = 0; i < 15; i++) state = tradingReducer(state, buy);
  assert.equal(state.account.quantity, 10);
  assert.equal(state.account.cashCents, 900_000);
  assert.equal(state.account.trades.length, 10);
  assert.ok(state.error);

  state = tradingReducer(state, sell);
  assert.equal(state.account.quantity, 9);
  state = tradingReducer(state, buy);
  assert.equal(state.account.quantity, 10);
  assert.equal(state.error, null);

  for (let i = 0; i < 15; i++) state = tradingReducer(state, sell);
  assert.equal(state.account.quantity, 0);
  assert.equal(state.account.cashCents, INITIAL_CASH_CENTS);
  assert.equal(state.account.trades.length, 22);
  assert.ok(state.account.trades.every((entry) => entry.quantity === 1));
  assert.ok(state.error);
});

test("reset and scenario changes clear account, feedback and history together", () => {
  const state = tradingReducer(createTradingState("test"), {
    type: "trade",
    side: "buy",
    quote: quote(),
  });
  for (const marketId of ["test", "other"]) {
    const reset = tradingReducer(state, { type: "reset", marketId });
    assert.deepEqual(reset, createTradingState(marketId));
  }
});

test("rounded acquisition costs have no residual after repeated partial sales", () => {
  let account = trade(createAccount("test"), "buy", 1, 10_001);
  account = trade(account, "buy", 2, 10_000);
  for (let i = 0; i < 3; i++) {
    account = trade(account, "sell", 1, 10_001);
    const value = valueAccount(account, 10_001);
    assert.equal(
      value.pnlCents,
      value.realizedPnlCents + value.unrealizedPnlCents,
    );
  }
  assert.equal(account.costBasisCents, 0);
  assert.equal(account.realizedPnlCents, 2);
  assert.equal(account.cashCents, INITIAL_CASH_CENTS + 2);
});

test("click-time quote samples the newly settled clock rather than the previous frame", () => {
  const curve = createPriceCurve([
    { time: 0, price: 100 },
    { time: 86_400, price: 200 },
  ]);
  const previousFrame = playClock(initialClock(), 0);
  const now = settleClock(
    previousFrame,
    REPLAY_DURATION_MS / 2,
    REPLAY_DURATION_MS,
  );
  const current = quoteAtClock(curve, "test", now, REPLAY_DURATION_MS, 86_400);
  assert.equal(current.marketTime, 43_200);
  assert.equal(
    current.priceCents,
    priceToCents(curveAtTime(curve, current.marketTime).current.y),
  );
  assert.equal(current.priceCents, 15_000);
  const account = trade(
    createAccount("test"),
    "buy",
    1,
    current.priceCents,
    current.marketTime,
  );
  assert.equal(account.trades[0].priceCents, 15_000);
});

test("the final score includes unsold holdings at the terminal quote without manufacturing a sale", () => {
  const account = trade(createAccount("test"), "buy", 10);
  const value = valueAccount(account, 15_000);
  assert.equal(value.totalCents, 1_050_000);
  assert.equal(account.trades.length, 10);
  assert.equal(account.realizedPnlCents, 0);
  assert.equal(value.unrealizedPnlCents, 50_000);
});

test("many same-price round trips cannot generate money from floating point error", () => {
  let account = createAccount("test");
  for (let i = 0; i < 300; i++) {
    account = trade(account, "buy", 3, 9876, i * 2);
    account = trade(account, "sell", 3, 9876, i * 2 + 1);
  }
  assert.equal(account.cashCents, INITIAL_CASH_CENTS);
  assert.equal(account.realizedPnlCents, 0);
  assert.equal(account.costBasisCents, 0);
});

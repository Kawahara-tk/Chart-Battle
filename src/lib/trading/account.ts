import type { ReplayStatus } from "../replay/clock";

export const INITIAL_COINS = 10_000;
export const INITIAL_CASH_CENTS = INITIAL_COINS * 100;
export const MAX_HOLDINGS = 10;

export type TradeSide = "buy" | "sell";
export type Quote = Readonly<{
  marketId: string;
  marketTime: number;
  priceCents: number;
  status: ReplayStatus;
}>;
export type Trade = Readonly<{
  id: number;
  side: TradeSide;
  quantity: number;
  marketTime: number;
  priceCents: number;
  totalCents: number;
  realizedPnlCents: number;
}>;
export type Account = Readonly<{
  marketId: string;
  cashCents: number;
  quantity: number;
  costBasisCents: number;
  realizedPnlCents: number;
  trades: readonly Trade[];
}>;
export type TradeResult =
  { ok: true; account: Account; trade: Trade } | { ok: false; error: string };

export function createAccount(marketId: string): Account {
  return {
    marketId,
    cashCents: INITIAL_CASH_CENTS,
    quantity: 0,
    costBasisCents: 0,
    realizedPnlCents: 0,
    trades: [],
  };
}

/** Two decimal coin precision is shared by the quote display and execution. */
export function priceToCents(price: number): number {
  const cents = Math.round(price * 100);
  if (!Number.isFinite(price) || !Number.isSafeInteger(cents) || cents <= 0)
    throw new Error("Invalid price");
  return cents;
}

/** Pure spot-trading ledger. All money is held as integer hundredths of a coin. */
export function executeTrade(
  account: Account,
  side: TradeSide,
  quote: Quote,
): TradeResult {
  const fail = (error: string): TradeResult => ({ ok: false, error });
  if (quote.marketId !== account.marketId)
    return fail("銘柄が変更されています。もう一度操作してください。");
  if (quote.status !== "playing")
    return fail(
      quote.status === "finished"
        ? "ゲームは終了しました。もう一度プレイするにはリセットしてください。"
        : "売買は再生中にできます。",
    );
  if (
    !Number.isFinite(quote.marketTime) ||
    quote.marketTime < 0 ||
    !Number.isSafeInteger(quote.priceCents) ||
    quote.priceCents <= 0
  )
    return fail("取引価格を取得できませんでした。");
  const lastTrade = account.trades.at(-1);
  if (lastTrade && quote.marketTime < lastTrade.marketTime)
    return fail("再生位置が変更されています。もう一度操作してください。");
  const buying = side === "buy";
  if (buying && account.quantity >= MAX_HOLDINGS)
    return fail(`保有上限は${MAX_HOLDINGS}口です。`);
  if (buying && quote.priceCents > account.cashCents)
    return fail("コインが足りません。");
  if (!buying && account.quantity === 0)
    return fail("売却できる保有分がありません。");

  // Allocate one unit's average cost. The last sale consumes the exact remainder.
  const soldCost = buying
    ? 0
    : Math.round(account.costBasisCents / account.quantity);
  const realizedPnlCents = buying ? 0 : quote.priceCents - soldCost;
  const trade: Trade = {
    id: account.trades.length + 1,
    side,
    quantity: 1,
    marketTime: quote.marketTime,
    priceCents: quote.priceCents,
    totalCents: quote.priceCents,
    realizedPnlCents,
  };
  return {
    ok: true,
    trade,
    account: {
      ...account,
      cashCents:
        account.cashCents + (buying ? -quote.priceCents : quote.priceCents),
      quantity: account.quantity + (buying ? 1 : -1),
      costBasisCents:
        account.costBasisCents + (buying ? quote.priceCents : -soldCost),
      realizedPnlCents: account.realizedPnlCents + realizedPnlCents,
      trades: [...account.trades, trade],
    },
  };
}

export function valueAccount(account: Account, priceCents: number) {
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0)
    throw new Error("Invalid valuation price");
  const holdingsCents = account.quantity * priceCents;
  const totalCents = account.cashCents + holdingsCents;
  return {
    holdingsCents,
    totalCents,
    pnlCents: totalCents - INITIAL_CASH_CENTS,
    unrealizedPnlCents: holdingsCents - account.costBasisCents,
    realizedPnlCents: account.realizedPnlCents,
    averagePriceCents: account.quantity
      ? account.costBasisCents / account.quantity
      : null,
  };
}

export type TradingState = Readonly<{
  account: Account;
  error: string | null;
  lastTrade: Trade | null;
}>;
export type TradingAction =
  | { type: "reset"; marketId: string }
  | { type: "trade"; side: TradeSide; quote: Quote };

export function createTradingState(marketId: string): TradingState {
  return { account: createAccount(marketId), error: null, lastTrade: null };
}

/** Evaluate each click against the latest balance and holdings, even in one React batch. */
export function tradingReducer(
  state: TradingState,
  action: TradingAction,
): TradingState {
  if (action.type === "reset") return createTradingState(action.marketId);
  const result = executeTrade(state.account, action.side, action.quote);
  return result.ok
    ? { account: result.account, error: null, lastTrade: result.trade }
    : { ...state, error: result.error, lastTrade: null };
}

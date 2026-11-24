const coinsFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCoins(cents: number): string {
  return coinsFormatter.format(cents / 100);
}

export function formatPnl(cents: number): string {
  return `${cents >= 0 ? "+" : ""}${formatCoins(cents)}`;
}

export function formatMarketTime(seconds: number): string {
  const value = Math.floor(seconds);
  return [Math.floor(value / 3600), Math.floor((value % 3600) / 60), value % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

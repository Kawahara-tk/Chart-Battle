import type { PostCount, PricePoint } from "./types";

// Four 5-minute buckets on either side of a mock replay point.
const REPLAY_SMOOTHING_RADIUS = 4;

/** Prototype only: normalize each scenario's first bucket to 100. Not a finalized game economy. */
export function countsToPrices(
  counts: readonly PostCount[],
  initialIndex = 100,
): PricePoint[] {
  if (!Number.isFinite(initialIndex) || initialIndex <= 0)
    throw new Error("Initial index must be positive");
  if (counts.length === 0) return [];
  const baseline = counts[0].count;
  if (baseline <= 0) throw new Error("Baseline count must be positive");
  return counts.map((point, i) => {
    if (
      !Number.isFinite(point.time) ||
      !Number.isFinite(point.count) ||
      point.count < 0 ||
      (i > 0 && point.time <= counts[i - 1].time)
    )
      throw new Error("Invalid post-count series");
    return { time: point.time, price: (point.count / baseline) * initialIndex };
  });
}

export function countsToReplayPrices(
  counts: readonly PostCount[],
): PricePoint[] {
  const prices = countsToPrices(counts);
  if (prices.length < 2) return prices;

  // Give nearby buckets more weight and use only available buckets at the edges.
  const smoothed = prices.map(({ time }, index) => {
    const first = Math.max(0, index - REPLAY_SMOOTHING_RADIUS);
    const last = Math.min(prices.length - 1, index + REPLAY_SMOOTHING_RADIUS);
    let weightedPrice = 0;
    let totalWeight = 0;
    for (let neighbor = first; neighbor <= last; neighbor++) {
      const weight = REPLAY_SMOOTHING_RADIUS + 1 - Math.abs(index - neighbor);
      weightedPrice += prices[neighbor].price * weight;
      totalWeight += weight;
    }
    return { time, price: weightedPrice / totalWeight };
  });

  const baseline = smoothed[0].price;
  return smoothed.map(({ time, price }) => ({
    time,
    price: (price / baseline) * prices[0].price,
  }));
}

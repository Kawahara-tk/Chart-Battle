import { curveAtTime, type PriceCurve } from "../market/curve";
import type { ReplayClock } from "../replay/clock";
import { priceToCents, type Quote } from "./account";

/** The click-time clock is settled before sampling the same curve used by the chart. */
export function quoteAtClock(
  curve: PriceCurve,
  marketId: string,
  clock: ReplayClock,
  durationMs: number,
  marketSeconds: number,
): Quote {
  const elapsed = Math.min(durationMs, Math.max(0, clock.elapsedMs));
  const marketTime = (elapsed / durationMs) * marketSeconds;
  return {
    marketId,
    marketTime,
    priceCents: priceToCents(curveAtTime(curve, marketTime).current.y),
    status: elapsed >= durationMs ? "finished" : clock.status,
  };
}

export const REPLAY_DURATION_MS = 60_000;

export type ReplayStatus = "ready" | "playing" | "paused" | "finished";
export type ReplayClock = Readonly<{
  elapsedMs: number;
  anchorMs: number | null;
  status: ReplayStatus;
}>;

export function initialClock(): ReplayClock {
  return { elapsedMs: 0, anchorMs: null, status: "ready" };
}

export function settleClock(
  clock: ReplayClock,
  now: number,
  durationMs: number,
): ReplayClock {
  if (clock.status !== "playing" || clock.anchorMs === null) return clock;
  const elapsedMs = Math.min(
    durationMs,
    clock.elapsedMs + Math.max(0, now - clock.anchorMs),
  );
  return {
    ...clock,
    elapsedMs,
    anchorMs: now,
    status: elapsedMs >= durationMs ? "finished" : "playing",
  };
}

export function playClock(clock: ReplayClock, now: number): ReplayClock {
  if (clock.status === "finished" || clock.status === "playing") return clock;
  return { ...clock, status: "playing", anchorMs: now };
}

export function pauseClock(
  clock: ReplayClock,
  now: number,
  durationMs: number,
): ReplayClock {
  const settled = settleClock(clock, now, durationMs);
  return settled.status === "playing"
    ? { ...settled, status: "paused", anchorMs: null }
    : settled;
}

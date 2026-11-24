"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  initialClock,
  pauseClock,
  playClock,
  REPLAY_DURATION_MS,
  settleClock,
  type ReplayClock,
} from "@/lib/replay/clock";

export function useReplay(durationMs = REPLAY_DURATION_MS) {
  const clockRef = useRef<ReplayClock>(initialClock());
  const [clock, setClock] = useState(clockRef.current);
  const publish = useCallback((next: ReplayClock) => {
    clockRef.current = next;
    setClock(next);
  }, []);

  useEffect(() => {
    if (clock.status !== "playing") return;
    let frame = 0;
    const tick = (now: number) => {
      const next = settleClock(clockRef.current, now, durationMs);
      publish(next);
      if (next.status === "playing") frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clock.status, durationMs, publish]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden)
        publish(pauseClock(clockRef.current, performance.now(), durationMs));
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, [durationMs, publish]);

  const play = useCallback(
    () => publish(playClock(clockRef.current, performance.now())),
    [publish],
  );
  const pause = useCallback(
    () => publish(pauseClock(clockRef.current, performance.now(), durationMs)),
    [durationMs, publish],
  );
  const reset = useCallback(() => publish(initialClock()), [publish]);
  const snapshot = useCallback(() => {
    const next = settleClock(clockRef.current, performance.now(), durationMs);
    publish(next);
    return next;
  }, [durationMs, publish]);
  return {
    ...clock,
    progress: clock.elapsedMs / durationMs,
    durationMs,
    snapshot,
    play,
    pause,
    reset,
  };
}

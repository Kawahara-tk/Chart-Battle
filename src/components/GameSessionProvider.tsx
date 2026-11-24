"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useReplay } from "@/hooks/useReplay";
import { createPriceCurve, curveAtTime } from "@/lib/market/curve";
import { MARKET_SECONDS, mockDataSource } from "@/lib/market/mock-data";
import { countsToReplayPrices } from "@/lib/market/price";
import type { ScenarioId } from "@/lib/market/types";
import {
  createTradingState,
  priceToCents,
  tradingReducer,
  type TradeSide,
} from "@/lib/trading/account";
import { quoteAtClock } from "@/lib/trading/quote";

function useSessionState() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("rising");
  const scenario = mockDataSource.getScenario(scenarioId);
  const curve = useMemo(
    () => createPriceCurve(countsToReplayPrices(scenario.counts)),
    [scenario],
  );
  const replay = useReplay();
  const [trading, dispatch] = useReducer(
    tradingReducer,
    scenarioId,
    createTradingState,
  );
  const time = replay.progress * MARKET_SECONDS;
  const visible = useMemo(() => curveAtTime(curve, time), [curve, time]);
  const pathname = usePathname();
  const { reset, pause, snapshot, durationMs } = replay;

  // A browser back/forward navigation must not leave a game ticking off screen.
  useEffect(() => {
    if (pathname !== "/play") pause();
  }, [pathname, pause]);

  const prepare = useCallback(
    (id: ScenarioId) => {
      reset();
      setScenarioId(id);
      dispatch({ type: "reset", marketId: id });
    },
    [reset],
  );

  const order = useCallback(
    (side: TradeSide) => {
      const quote = quoteAtClock(
        curve,
        scenarioId,
        snapshot(),
        durationMs,
        MARKET_SECONDS,
      );
      dispatch({ type: "trade", side, quote });
    },
    [curve, scenarioId, snapshot, durationMs],
  );

  return {
    scenario,
    curve,
    replay,
    trading,
    time,
    ...visible,
    priceCents: priceToCents(visible.current.y),
    prepare,
    order,
  };
}

const SessionContext = createContext<ReturnType<typeof useSessionState> | null>(
  null,
);

export function GameSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useSessionState();
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useGameSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Game session provider is missing");
  return session;
}

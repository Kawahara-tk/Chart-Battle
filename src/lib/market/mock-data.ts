import type { MarketDataSource, MarketScenario, ScenarioId } from "./types";

export const MARKET_SECONDS = 24 * 60 * 60;
const INTERVAL_SECONDS = 5 * 60;

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createCounts(id: ScenarioId) {
  const random = seededRandom({ rising: 41, spike: 83, calm: 127 }[id]);
  return Array.from(
    { length: MARKET_SECONDS / INTERVAL_SECONDS + 1 },
    (_, i) => {
      const t = i / (MARKET_SECONDS / INTERVAL_SECONDS);
      const wave = Math.sin(t * 31) * 0.055 + Math.sin(t * 79) * 0.018;
      const noise = (random() - 0.5) * 0.025;
      const shape =
        id === "rising"
          ? 1 + t * 1.05 + wave + 0.22 * Math.exp(-(((t - 0.62) / 0.1) ** 2))
          : id === "spike"
            ? 1 +
              wave +
              1.65 * Math.exp(-(((t - 0.48) / 0.085) ** 2)) -
              0.23 * Math.exp(-(((t - 0.72) / 0.09) ** 2))
            : 1 + wave * 0.55 + Math.sin(t * 13) * 0.045;
      return {
        time: i * INTERVAL_SECONDS,
        count: Math.max(1, Math.round(1200 * (shape + noise))),
      };
    },
  );
}

export const MOCK_SCENARIOS: readonly MarketScenario[] = [
  {
    id: "rising",
    symbol: "GAME",
    name: "#新作ゲーム",
    label: "じわじわ上昇",
    description: "少しずつ広がる話題。小さな波を繰り返しながら上昇。",
    counts: createCounts("rising"),
  },
  {
    id: "spike",
    symbol: "ANIME",
    name: "#アニメ速報",
    label: "急騰と急落",
    description: "一気に集まる注目。大きなピークと、その後の反動。",
    counts: createCounts("spike"),
  },
  {
    id: "calm",
    symbol: "DAILY",
    name: "#日常のひとこと",
    label: "穏やかな横ばい",
    description: "いつもの話題。小さな値動きの見え方をチェック。",
    counts: createCounts("calm"),
  },
];

export const mockDataSource: MarketDataSource = {
  getScenario(id) {
    const scenario = MOCK_SCENARIOS.find((item) => item.id === id);
    if (!scenario) throw new Error(`Unknown mock scenario: ${id}`);
    return scenario;
  },
};

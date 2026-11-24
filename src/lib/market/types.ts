/** Time is seconds from the start of the historical replay, not wall-clock time. */
export type PostCount = Readonly<{ time: number; count: number }>;
export type PricePoint = Readonly<{ time: number; price: number }>;
export type ScenarioId = "rising" | "spike" | "calm";
export type MarketScenario = Readonly<{
  id: ScenarioId;
  symbol: string;
  name: string;
  label: string;
  description: string;
  counts: readonly PostCount[];
}>;

export interface MarketDataSource {
  getScenario(id: ScenarioId): MarketScenario;
}

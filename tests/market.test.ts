import assert from "node:assert/strict";
import test from "node:test";
import {
  createPriceCurve,
  curveAtTime,
  curveToPath,
  visiblePriceDomain,
} from "../src/lib/market/curve";
import {
  MARKET_SECONDS,
  MOCK_SCENARIOS,
  mockDataSource,
} from "../src/lib/market/mock-data";
import { countsToPrices, countsToReplayPrices } from "../src/lib/market/price";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test("each mock covers the same 24-hour timeline and starts at index 100", () => {
  for (const scenario of MOCK_SCENARIOS) {
    assert.equal(mockDataSource.getScenario(scenario.id), scenario);
    assert.equal(scenario.counts.length, 289);
    const prices = countsToReplayPrices(scenario.counts);
    assert.equal(prices[0].time, 0);
    assert.equal(prices.at(-1)?.time, MARKET_SECONDS);
    assert.equal(prices[0].price, 100);
    assert.ok(
      scenario.counts.every((p) => Number.isInteger(p.count) && p.count > 0),
    );
  }
});

test("normalization is independent of absolute posting volume", () => {
  const first = [
    { time: 0, count: 100 },
    { time: 300, count: 200 },
  ];
  assert.deepEqual(
    countsToPrices(first),
    countsToPrices(first.map((p) => ({ ...p, count: p.count * 1000 }))),
  );
});

test("the current quote is the exact endpoint of the revealed cubic, with no future segments", () => {
  for (const scenario of MOCK_SCENARIOS) {
    const prices = countsToReplayPrices(scenario.counts);
    const curve = createPriceCurve(prices);
    for (let time = 37; time < MARKET_SECONDS; time += 137) {
      const { current, segments } = curveAtTime(curve, time);
      close(current.x, time);
      assert.deepEqual(segments.at(-1)?.end, current);
      assert.ok(segments.every((s) => s.end.x <= time + 1e-8));
      assert.ok(
        curveToPath(
          curve.start,
          segments,
          (x) => x,
          (y) => y,
        ).endsWith(`${current.x.toFixed(3)},${current.y.toFixed(3)}`),
      );
      const index = Math.floor(time / 300);
      const low = Math.min(prices[index].price, prices[index + 1].price);
      const high = Math.max(prices[index].price, prices[index + 1].price);
      assert.ok(
        current.y >= low - 1e-8 && current.y <= high + 1e-8,
        "interpolation must not overshoot its source interval",
      );
    }
  }
});

test("replay smoothing reduces small reversals while preserving the spike and its drop", () => {
  const countReversals = (prices: ReturnType<typeof countsToPrices>) => {
    const directions = prices
      .slice(1)
      .map((point, index) => Math.sign(point.price - prices[index].price))
      .filter(Boolean);
    return directions.filter(
      (direction, index) => index > 0 && direction !== directions[index - 1],
    ).length;
  };

  for (const scenario of MOCK_SCENARIOS) {
    const raw = countsToPrices(scenario.counts);
    const replay = countsToReplayPrices(scenario.counts);
    assert.ok(countReversals(replay) < countReversals(raw) / 2, scenario.id);
  }

  const { counts } = mockDataSource.getScenario("spike");
  const raw = countsToPrices(counts);
  const replay = countsToReplayPrices(counts);
  const rawPeak = Math.max(...raw.map(({ price }) => price));
  assert.ok(Math.max(...replay.map(({ price }) => price)) > rawPeak * 0.95);
  const afterPeak = replay.slice(Math.floor(replay.length * 0.6));
  assert.ok(Math.min(...afterPeak.map(({ price }) => price)) < 85);
});

test("all source values are preserved at their timestamps and replay clamps at both ends", () => {
  const prices = countsToPrices(MOCK_SCENARIOS[1].counts);
  const curve = createPriceCurve(prices);
  for (const point of prices)
    close(curveAtTime(curve, point.time).current.y, point.price);
  assert.deepEqual(curveAtTime(curve, -10), {
    segments: [],
    current: curve.start,
  });
  assert.deepEqual(curveAtTime(curve, MARKET_SECONDS + 10).current, {
    x: MARKET_SECONDS,
    y: prices.at(-1)!.price,
  });
});

test("revealing later points keeps completed history unchanged", () => {
  const curve = createPriceCurve(countsToPrices(MOCK_SCENARIOS[0].counts));
  assert.deepEqual(
    curveAtTime(curve, 603).segments.slice(0, -1),
    curveAtTime(curve, 1000).segments.slice(0, 2),
  );
});

test("axis range ignores an enormous future spike", () => {
  const curve = createPriceCurve([
    { time: 0, price: 100 },
    { time: 10, price: 100 },
    { time: 20, price: 1_000_000 },
  ]);
  const { segments } = curveAtTime(curve, 10);
  assert.ok(visiblePriceDomain(curve.start, segments)[1] < 200);
  assert.deepEqual(
    visiblePriceDomain(curve.start, []),
    visiblePriceDomain(curve.start, segments),
  );
});

test("empty, singleton and two-point inputs have explicit behavior", () => {
  assert.deepEqual(countsToPrices([]), []);
  assert.throws(() => createPriceCurve([]));
  const singleton = createPriceCurve([{ time: 0, price: 50 }]);
  assert.deepEqual(curveAtTime(singleton, 10), {
    segments: [],
    current: { x: 0, y: 50 },
  });
  close(
    curveAtTime(
      createPriceCurve([
        { time: 0, price: 100 },
        { time: 10, price: 200 },
      ]),
      5,
    ).current.y,
    150,
  );
});

test("invalid data fails before it can produce a malformed chart", () => {
  assert.throws(() => countsToPrices([{ time: 0, count: 0 }]));
  assert.throws(() =>
    countsToPrices([
      { time: 0, count: 10 },
      { time: 0, count: 20 },
    ]),
  );
  assert.throws(() => countsToPrices([{ time: 0, count: Number.NaN }]));
  assert.throws(() => createPriceCurve([{ time: 0, price: Infinity }]));
});

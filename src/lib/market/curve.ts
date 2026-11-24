import { curveMonotoneX, line } from "d3-shape";
import type { PricePoint } from "./types";

export type Coordinate = Readonly<{ x: number; y: number }>;
export type CurveSegment = Readonly<{
  start: Coordinate;
  control1: Coordinate;
  control2: Coordinate;
  end: Coordinate;
}>;
export type PriceCurve = Readonly<{
  start: Coordinate;
  segments: readonly CurveSegment[];
}>;

const mix = (a: Coordinate, b: Coordinate, u: number): Coordinate => ({
  x: a.x + (b.x - a.x) * u,
  y: a.y + (b.y - a.y) * u,
});

/** Capture D3's exact cubic geometry so rendering and current-price evaluation share one curve. */
export function createPriceCurve(points: readonly PricePoint[]): PriceCurve {
  if (points.length === 0)
    throw new Error("Price curve requires at least one point");
  for (let i = 0; i < points.length; i++) {
    if (
      !Number.isFinite(points[i].time) ||
      !Number.isFinite(points[i].price) ||
      (i > 0 && points[i].time <= points[i - 1].time)
    )
      throw new Error("Invalid price series");
  }
  const segments: CurveSegment[] = [];
  const start = { x: points[0].time, y: points[0].price };
  let cursor = start;
  const collector = {
    moveTo(x: number, y: number) {
      cursor = { x, y };
    },
    lineTo(x: number, y: number) {
      const end = { x, y };
      segments.push({
        start: cursor,
        control1: mix(cursor, end, 1 / 3),
        control2: mix(cursor, end, 2 / 3),
        end,
      });
      cursor = end;
    },
    bezierCurveTo(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      x: number,
      y: number,
    ) {
      const end = { x, y };
      segments.push({
        start: cursor,
        control1: { x: x1, y: y1 },
        control2: { x: x2, y: y2 },
        end,
      });
      cursor = end;
    },
    closePath() {},
  };
  // The monotone line generator only needs these four path-context methods.
  line<PricePoint>()
    .x((d) => d.time)
    .y((d) => d.price)
    .curve(curveMonotoneX)
    .context(collector as CanvasRenderingContext2D)(points);
  return { start, segments };
}

/** de Casteljau subdivision preserves the original curve when revealing a partial segment. */
function prefix(segment: CurveSegment, u: number): CurveSegment {
  const a = mix(segment.start, segment.control1, u);
  const b = mix(segment.control1, segment.control2, u);
  const c = mix(segment.control2, segment.end, u);
  const d = mix(a, b, u);
  const e = mix(b, c, u);
  return { start: segment.start, control1: a, control2: d, end: mix(d, e, u) };
}

export function curveAtTime(
  curve: PriceCurve,
  time: number,
): { segments: readonly CurveSegment[]; current: Coordinate } {
  if (!Number.isFinite(time)) throw new Error("Replay time must be finite");
  const visible: CurveSegment[] = [];
  let current = curve.start;
  for (const segment of curve.segments) {
    if (time >= segment.end.x) {
      visible.push(segment);
      current = segment.end;
    } else if (time > segment.start.x) {
      // D3 monotoneX places x controls at one-third and two-thirds of each interval.
      const partial = prefix(
        segment,
        (time - segment.start.x) / (segment.end.x - segment.start.x),
      );
      visible.push(partial);
      current = partial.end;
      break;
    } else break;
  }
  return { segments: visible, current };
}

export function curveToPath(
  start: Coordinate,
  segments: readonly CurveSegment[],
  x: (value: number) => number,
  y: (value: number) => number,
): string {
  const pair = (p: Coordinate) => `${x(p.x).toFixed(3)},${y(p.y).toFixed(3)}`;
  return (
    `M${pair(start)}` +
    segments
      .map((s) => `C${pair(s.control1)} ${pair(s.control2)} ${pair(s.end)}`)
      .join("")
  );
}

/** Expand from the starting range using only the already-revealed curve. */
export function visiblePriceDomain(
  start: Coordinate,
  segments: readonly CurveSegment[],
): readonly [number, number] {
  const values = [
    start.y,
    ...segments.flatMap((s) => [
      s.start.y,
      s.control1.y,
      s.control2.y,
      s.end.y,
    ]),
  ];
  const low = Math.min(start.y * 0.65, ...values);
  const high = Math.max(start.y * 1.35, ...values);
  const padding = Math.max(1, (high - low) * 0.12);
  return [Math.max(0, low - padding), high + padding];
}

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  curveToPath,
  curveAtTime,
  visiblePriceDomain,
  type Coordinate,
  type CurveSegment,
  type PriceCurve,
} from "@/lib/market/curve";
import type { Trade } from "@/lib/trading/account";
import { formatCoins, formatMarketTime } from "@/lib/trading/format";

export function TrendChart({
  curve,
  segments,
  current,
  marketSeconds,
  name,
  trades,
}: {
  curve: PriceCurve;
  segments: readonly CurveSegment[];
  current: Coordinate;
  marketSeconds: number;
  name: string;
  trades: readonly Trade[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const id = useId().replaceAll(":", "");
  const markers = useMemo(
    () =>
      trades.map((trade) => ({
        trade,
        position: curveAtTime(curve, trade.marketTime).current,
      })),
    [curve, trades],
  );
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = width < 500 ? 240 : 350;
  const left = 12;
  const right = width - 58;
  const top = 24;
  const bottom = height - 36;
  const [min, max] = visiblePriceDomain(curve.start, segments);
  const x = (value: number) => left + (value / marketSeconds) * (right - left);
  const y = (value: number) =>
    bottom - ((value - min) / (max - min)) * (bottom - top);
  const path = curveToPath(curve.start, segments, x, y);
  const area = `${path}L${x(current.x)},${bottom}L${left},${bottom}Z`;
  const lineColor = "#238269";
  const xLabels = width < 500 ? [0, 6, 12, 18, 24] : [0, 4, 8, 12, 16, 20, 24];

  return (
    <div className="chart-canvas" ref={container}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>{`${name}の価格チャート`}</title>
        <desc id={`${id}-description`}>
          モック投稿件数を仮の指数に変換した24時間のリプレイ。Bは購入、Sは売却。
        </desc>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.19" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}-plot`}>
            <rect
              x={left - 5}
              y={top - 8}
              width={right - left + 10}
              height={bottom - top + 16}
            />
          </clipPath>
        </defs>
        {[0, 1, 2, 3, 4].map((tick) => {
          const price = min + ((max - min) * tick) / 4;
          return (
            <g key={tick}>
              <line
                x1={left}
                x2={right}
                y1={y(price)}
                y2={y(price)}
                stroke="#e4e9ed"
                strokeDasharray="3 5"
              />
              <text x={right + 14} y={y(price) + 4} className="chart-tick">
                {price.toFixed(0)}
              </text>
            </g>
          );
        })}
        {xLabels.map((hour) => (
          <text
            key={hour}
            x={x(hour * 3600)}
            y={height - 8}
            textAnchor={hour === 0 ? "start" : hour === 24 ? "end" : "middle"}
            className="chart-tick"
          >
            {String(hour).padStart(2, "0")}:00
          </text>
        ))}
        <line
          x1={left}
          x2={right}
          y1={y(curve.start.y)}
          y2={y(curve.start.y)}
          stroke="#a7b2bd"
          strokeOpacity="0.6"
          strokeDasharray="4 5"
        />
        <g clipPath={`url(#${id}-plot)`}>
          <path d={area} fill={`url(#${id}-fill)`} />
          <path
            d={path}
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <line
            x1={x(current.x)}
            x2={x(current.x)}
            y1={top}
            y2={bottom}
            stroke={lineColor}
            strokeOpacity="0.22"
            strokeDasharray="3 5"
          />
          <circle
            cx={x(current.x)}
            cy={y(current.y)}
            r="9"
            fill={lineColor}
            fillOpacity="0.12"
          />
          <circle
            cx={x(current.x)}
            cy={y(current.y)}
            r="4"
            fill={lineColor}
            stroke="#ffffff"
            strokeWidth="2"
          />
        </g>
        <g clipPath={`url(#${id}-plot)`}>
          {markers
            .filter(({ trade }) => trade.marketTime <= current.x)
            .map(({ trade, position }) => {
              const buying = trade.side === "buy";
              const color = buying ? "#8edcc5" : "#ffab76";
              const labelY = Math.max(
                top + 10,
                Math.min(bottom - 10, y(position.y) + (buying ? 19 : -19)),
              );
              return (
                <g
                  key={trade.id}
                  className="trade-marker"
                  data-trade-side={trade.side}
                >
                  <title>{`${buying ? "購入" : "売却"} #${trade.id} · ${trade.quantity}口 · ${formatCoins(trade.priceCents)}コイン · ${formatMarketTime(trade.marketTime)}`}</title>
                  <line
                    x1={x(position.x)}
                    x2={x(position.x)}
                    y1={y(position.y)}
                    y2={labelY}
                    stroke={color}
                    strokeOpacity="0.65"
                  />
                  <circle
                    cx={x(position.x)}
                    cy={y(position.y)}
                    r="3.5"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <circle cx={x(position.x)} cy={labelY} r="8" fill={color} />
                  <text
                    x={x(position.x)}
                    y={labelY + 3}
                    textAnchor="middle"
                    fill="#14211d"
                    fontFamily="monospace"
                    fontSize="9"
                    fontWeight="700"
                  >
                    {buying ? "B" : "S"}
                  </text>
                </g>
              );
            })}
        </g>
      </svg>
    </div>
  );
}

"use client";

import React, { useId } from "react";

interface SparklineProps {
  data: number[];
  color?: "indigo" | "emerald" | "blue" | "amber" | "rose";
  height?: number;
  width?: number;
  showDot?: boolean;
}

export function Sparkline({
  data,
  color = "indigo",
  height = 36,
  width = 96,
  showDot = true,
}: SparklineProps) {
  const gradientId = useId();

  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const paddingY = 4;
  const usableHeight = height - paddingY * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - 4) + 2;
    const y = height - paddingY - ((val - min) / range) * usableHeight;
    return { x, y };
  });

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    // Smooth Catmull-Rom or cubic Bezier
    const prev = points[i - 1];
    const cpX1 = prev.x + (pt.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (pt.x - prev.x) / 2;
    const cpY2 = pt.y;
    return `${acc} C ${cpX1},${cpY1} ${cpX2},${cpY2} ${pt.x},${pt.y}`;
  }, "");

  const lastPt = points[points.length - 1];
  const areaD = `${pathD} L ${lastPt.x},${height} L ${points[0].x},${height} Z`;

  const colorConfig = {
    indigo: {
      stroke: "#6366F1",
      fillStart: "rgba(99, 102, 241, 0.35)",
      fillEnd: "rgba(99, 102, 241, 0.0)",
      dot: "#4F46E5",
      dotRing: "rgba(99, 102, 241, 0.4)",
    },
    emerald: {
      stroke: "#10B981",
      fillStart: "rgba(16, 185, 129, 0.35)",
      fillEnd: "rgba(16, 185, 129, 0.0)",
      dot: "#059669",
      dotRing: "rgba(16, 185, 129, 0.4)",
    },
    blue: {
      stroke: "#3B82F6",
      fillStart: "rgba(59, 130, 246, 0.35)",
      fillEnd: "rgba(59, 130, 246, 0.0)",
      dot: "#2563EB",
      dotRing: "rgba(59, 130, 246, 0.4)",
    },
    amber: {
      stroke: "#F59E0B",
      fillStart: "rgba(245, 158, 11, 0.35)",
      fillEnd: "rgba(245, 158, 11, 0.0)",
      dot: "#D97706",
      dotRing: "rgba(245, 158, 11, 0.4)",
    },
    rose: {
      stroke: "#F43F5E",
      fillStart: "rgba(244, 63, 94, 0.35)",
      fillEnd: "rgba(244, 63, 94, 0.0)",
      dot: "#E11D48",
      dotRing: "rgba(244, 63, 94, 0.4)",
    },
  }[color];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible shrink-0 select-none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorConfig.fillStart} />
          <stop offset="100%" stopColor={colorConfig.fillEnd} />
        </linearGradient>
      </defs>

      {/* Area Gradient */}
      <path d={areaD} fill={`url(#${gradientId})`} />

      {/* Smooth Line */}
      <path
        d={pathD}
        fill="none"
        stroke={colorConfig.stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pulse Dot at Latest Point */}
      {showDot && (
        <g transform={`translate(${lastPt.x}, ${lastPt.y})`}>
          <circle
            r={5}
            fill={colorConfig.dotRing}
            className="animate-ping opacity-75"
          />
          <circle
            r={3.5}
            fill={colorConfig.dot}
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        </g>
      )}
    </svg>
  );
}

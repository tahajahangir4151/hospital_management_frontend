"use client";

import React, { useId } from "react";

export type SparklineColor =
  | "indigo"
  | "emerald"
  | "blue"
  | "amber"
  | "rose"
  | "teal"
  | "purple"
  | "cyan"
  | (string & {});

interface SparklineProps {
  data: number[];
  color?: SparklineColor;
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

  const knownConfigs: Record<string, { stroke: string; fillStart: string; fillEnd: string; dot: string; dotRing: string }> = {
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
    teal: {
      stroke: "#14B8A6",
      fillStart: "rgba(20, 184, 166, 0.35)",
      fillEnd: "rgba(20, 184, 166, 0.0)",
      dot: "#0D9488",
      dotRing: "rgba(20, 184, 166, 0.4)",
    },
    purple: {
      stroke: "#8B5CF6",
      fillStart: "rgba(139, 92, 246, 0.35)",
      fillEnd: "rgba(139, 92, 246, 0.0)",
      dot: "#7C3AED",
      dotRing: "rgba(139, 92, 246, 0.4)",
    },
    cyan: {
      stroke: "#06B6D4",
      fillStart: "rgba(6, 182, 212, 0.35)",
      fillEnd: "rgba(6, 182, 212, 0.0)",
      dot: "#0891B2",
      dotRing: "rgba(6, 182, 212, 0.4)",
    },
    "#10b981": {
      stroke: "#10B981",
      fillStart: "rgba(16, 185, 129, 0.35)",
      fillEnd: "rgba(16, 185, 129, 0.0)",
      dot: "#059669",
      dotRing: "rgba(16, 185, 129, 0.4)",
    },
    "#3b82f6": {
      stroke: "#3B82F6",
      fillStart: "rgba(59, 130, 246, 0.35)",
      fillEnd: "rgba(59, 130, 246, 0.0)",
      dot: "#2563EB",
      dotRing: "rgba(59, 130, 246, 0.4)",
    },
    "#6366f1": {
      stroke: "#6366F1",
      fillStart: "rgba(99, 102, 241, 0.35)",
      fillEnd: "rgba(99, 102, 241, 0.0)",
      dot: "#4F46E5",
      dotRing: "rgba(99, 102, 241, 0.4)",
    },
    "#f59e0b": {
      stroke: "#F59E0B",
      fillStart: "rgba(245, 158, 11, 0.35)",
      fillEnd: "rgba(245, 158, 11, 0.0)",
      dot: "#D97706",
      dotRing: "rgba(245, 158, 11, 0.4)",
    },
    "#14b8a6": {
      stroke: "#14B8A6",
      fillStart: "rgba(20, 184, 166, 0.35)",
      fillEnd: "rgba(20, 184, 166, 0.0)",
      dot: "#0D9488",
      dotRing: "rgba(20, 184, 166, 0.4)",
    },
    "#0284c7": {
      stroke: "#0284C7",
      fillStart: "rgba(2, 132, 199, 0.35)",
      fillEnd: "rgba(2, 132, 199, 0.0)",
      dot: "#0369A1",
      dotRing: "rgba(2, 132, 199, 0.4)",
    },
    "#e11d48": {
      stroke: "#E11D48",
      fillStart: "rgba(225, 29, 72, 0.35)",
      fillEnd: "rgba(225, 29, 72, 0.0)",
      dot: "#BE123C",
      dotRing: "rgba(225, 29, 72, 0.4)",
    },
  };

  const colorConfig = knownConfigs[color] || {
    stroke: color,
    fillStart: "rgba(99, 102, 241, 0.3)",
    fillEnd: "rgba(99, 102, 241, 0.0)",
    dot: color,
    dotRing: "rgba(99, 102, 241, 0.3)",
  };

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

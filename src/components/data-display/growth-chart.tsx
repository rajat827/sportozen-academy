"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
const data = [
  { month: "May", players: 14 },
  { month: "Jun", players: 17 },
  { month: "Jul", players: 16 },
  { month: "Aug", players: 20 },
  { month: "Sep", players: 22 },
  { month: "Oct", players: 24 },
];
export default function GrowthChart() {
  return (
    <div
      className="chart"
      role="img"
      aria-label="Demo player growth: May 14, June 17, July 16, August 20, September 22, October 24"
    >
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart
          data={data}
          margin={{ top: 15, right: 10, left: -22, bottom: 0 }}
        >
          <defs>
            <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2795d2" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#2795d2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            vertical={false}
            stroke="#e9eef2"
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#677788" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#677788" }}
            domain={[0, 30]}
          />
          <Tooltip />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="players"
            stroke="#2789d0"
            strokeWidth={2.5}
            fill="url(#growth)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// File: src/components/charts/AreaChart.tsx

"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  [key: string]: string | number;
}

interface AreaChartProps {
  data: ChartDataPoint[];
  areas: {
    dataKey: string;
    fill: string;
    stroke: string;
    name: string;
  }[];
  xAxisKey: string;
  height?: number;
}

export function AreaChart({
  data,
  areas,
  xAxisKey,
  height = 300,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          {areas.map((area, index) => (
            <linearGradient
              key={index}
              id={`gradient-${index}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={area.stroke} stopOpacity={0.3} />
              <stop offset="95%" stopColor={area.stroke} stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>
        <XAxis
          dataKey={xAxisKey}
          className="text-sm text-gray-600"
          tick={{ fontSize: 12 }}
        />
        <YAxis className="text-sm text-gray-600" tick={{ fontSize: 12 }} />
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "none",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        />
        {areas.map((area, index) => (
          <Area
            key={index}
            type="monotone"
            dataKey={area.dataKey}
            stroke={area.stroke}
            strokeWidth={2}
            fill={`url(#gradient-${index})`}
            name={area.name}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

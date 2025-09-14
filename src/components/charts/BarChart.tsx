// File: src/components/charts/BarChart.tsx

"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ChartDataPoint {
  [key: string]: string | number;
}

interface BarChartProps {
  data: ChartDataPoint[];
  bars: {
    dataKey: string;
    fill: string;
    name: string;
  }[];
  xAxisKey: string;
  height?: number;
}

export function BarChart({
  data,
  bars,
  xAxisKey,
  height = 300,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey={xAxisKey}
          className="text-sm text-gray-600"
          tick={{ fontSize: 12 }}
        />
        <YAxis className="text-sm text-gray-600" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "none",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        />
        <Legend />
        {bars.map((bar, index) => (
          <Bar
            key={index}
            dataKey={bar.dataKey}
            fill={bar.fill}
            name={bar.name}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

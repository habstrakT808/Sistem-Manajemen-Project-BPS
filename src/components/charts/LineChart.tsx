// File: src/components/charts/LineChart.tsx

"use client";

import {
  LineChart as RechartsLineChart,
  Line,
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

interface LineChartProps {
  data: ChartDataPoint[];
  lines: {
    dataKey: string;
    stroke: string;
    name: string;
  }[];
  xAxisKey: string;
  height?: number;
}

export function LineChart({
  data,
  lines,
  xAxisKey,
  height = 300,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
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
        {lines.map((line, index) => (
          <Line
            key={index}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.stroke}
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6, stroke: line.stroke, strokeWidth: 2 }}
            name={line.name}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

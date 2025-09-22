// File: src/components/pegawai/EarningsAnalytics.tsx
// NEW: Enhanced earnings analytics with transport breakdown

"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Target,
  Award,
  PieChart,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { toast } from "sonner";

interface EarningsRecord {
  id: string;
  type: string;
  amount: number;
  occurred_on: string;
  description: string;
  projects: {
    nama_project: string;
  };
}

interface EarningsData {
  current_month: {
    month: number;
    year: number;
    total_earnings: number;
    records: EarningsRecord[];
  };
  historical_data: Array<{
    month: number;
    year: number;
    month_name: string;
    total: number;
  }>;
}

async function fetchEarningsData(
  month: number,
  year: number
): Promise<EarningsData> {
  const response = await fetch(
    `/api/pegawai/earnings?month=${month}&year=${year}`,
    {
      cache: "no-store",
    }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch earnings");
  }
  return result;
}

export default function EarningsAnalytics() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const {
    data: earningsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<EarningsData, Error>({
    queryKey: ["pegawai", "earnings", { selectedMonth, selectedYear }],
    queryFn: () => fetchEarningsData(selectedMonth, selectedYear),
    staleTime: 2 * 60 * 1000,
  });

  const handleMonthChange = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const handleRefresh = async () => {
    const res = await refetch();
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success("Earnings data refreshed");
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/pegawai/earnings/export?month=${selectedMonth}&year=${selectedYear}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `earnings_${selectedYear}_${selectedMonth.toString().padStart(2, "0")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Earnings report downloaded");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export earnings data");
    }
  };

  const currentMonthName = new Date(
    selectedYear,
    selectedMonth - 1
  ).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse border-0 shadow-xl rounded-xl p-6"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="animate-pulse border-0 shadow-xl rounded-xl p-6 h-96"></div>
          <div className="animate-pulse border-0 shadow-xl rounded-xl p-6 h-96"></div>
        </div>
      </div>
    );
  }

  if (!earningsData) return null;

  const { current_month, historical_data } = earningsData;
  const avgMonthlyEarnings =
    historical_data.length > 0
      ? historical_data.reduce((sum, month) => sum + month.total, 0) /
        historical_data.length
      : 0;

  const statsCards = [
    {
      title: "This Month",
      value: formatCurrency(current_month.total_earnings),
      description: `${current_month.records.length} allocations`,
      icon: DollarSign,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
    },
    {
      title: "Monthly Average",
      value: formatCurrency(avgMonthlyEarnings),
      description: "Based on history",
      icon: TrendingUp,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
    },
    {
      title: "Projects",
      value: new Set(current_month.records.map((r) => r.projects.nama_project))
        .size,
      description: "Unique projects",
      icon: Target,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
    },
    {
      title: "Avg per Task",
      value: formatCurrency(
        current_month.records.length > 0
          ? current_month.total_earnings / current_month.records.length
          : 0
      ),
      description: "Average allocation",
      icon: Award,
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            My Earnings Analytics
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Track your transport allowances and financial progress over time.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white rounded-xl shadow-lg p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMonthChange("prev")}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-gray-900 min-w-[120px] text-center">
              {currentMonthName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMonthChange("next")}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={isFetching}
            variant="outline"
            className="border-2 border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden rounded-xl"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-50`}
              ></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600 mb-2">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500">{stat.description}</p>
                  </div>
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Earnings Trend Chart */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <TrendingUp className="w-6 h-6 mr-3" />
              Earnings Trend
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Monthly transport earnings over time
            </p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historical_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month_name"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                  tickFormatter={(value) => `${value / 1000}K`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Earnings",
                  ]}
                  labelStyle={{ color: "#374151" }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: "#10b981", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Month Details */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center">
                <MapPin className="w-6 h-6 mr-3" />
                {currentMonthName}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
            <p className="text-green-100 text-sm mt-1">
              Transport allocation details
            </p>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {current_month.records.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No earnings this month</p>
              </div>
            ) : (
              current_month.records.map((record, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="w-4 h-4 text-green-500" />
                        <div className="font-semibold text-gray-900">
                          {record.projects.nama_project}
                        </div>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          {record.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {record.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        Date:{" "}
                        {new Date(record.occurred_on).toLocaleDateString(
                          "id-ID"
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 text-lg">
                        {formatCurrency(record.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {current_month.records.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Earnings:</span>
                  <span className="text-green-600">
                    {formatCurrency(current_month.total_earnings)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Yearly Overview */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <PieChart className="w-6 h-6 mr-3" />
            Yearly Overview
          </h2>
          <p className="text-purple-100 text-sm mt-1">
            Monthly earnings breakdown for {selectedYear}
          </p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={historical_data.filter((h) => h.year === selectedYear)}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month_name" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(value) => `${value / 1000}K`}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatCurrency(value),
                  "Earnings",
                ]}
                labelStyle={{ color: "#374151" }}
              />
              <Bar
                dataKey="total"
                fill="url(#colorGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="border-0 shadow-xl bg-gradient-to-r from-green-600 to-teal-600 text-white overflow-hidden rounded-xl">
        <div className="p-8">
          <h2 className="text-2xl font-bold mb-6">Financial Performance</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Target className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">
                {historical_data.length > 0
                  ? Math.round(
                      (current_month.total_earnings /
                        Math.max(avgMonthlyEarnings, 1)) *
                        100
                    )
                  : 100}
                %
              </div>
              <div className="text-green-100 text-sm">vs Monthly Average</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">
                {historical_data.reduce((sum, month) => sum + month.total, 0) >
                0
                  ? formatCurrency(
                      historical_data.reduce(
                        (sum, month) => sum + month.total,
                        0
                      )
                    )
                  : formatCurrency(0)}
              </div>
              <div className="text-green-100 text-sm">
                Total Lifetime Earnings
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Award className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">
                {current_month.records.length}
              </div>
              <div className="text-green-100 text-sm">Tasks with Transport</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

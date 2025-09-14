// File: src/components/pegawai/EarningsTracker.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
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
} from "recharts";
import { toast } from "sonner";

interface EarningsData {
  current_month: {
    month: number;
    year: number;
    total_earnings: number;
    records: Array<{
      amount: number;
      description: string;
      created_at: string;
      projects: {
        nama_project: string;
        tanggal_mulai: string;
        deadline: string;
      };
    }>;
  };
  historical_data: Array<{
    month: number;
    year: number;
    month_name: string;
    total: number;
  }>;
}

export default function EarningsTracker() {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchEarningsData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/pegawai/earnings?month=${selectedMonth}&year=${selectedYear}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch earnings");
      }

      setEarningsData(result);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast.error("Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

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

  const currentMonthName = new Date(
    selectedYear,
    selectedMonth - 1
  ).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            My Earnings
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Track your transport allowances and financial progress.
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
            onClick={fetchEarningsData}
            variant="outline"
            className="border-2 border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  This Month
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    earningsData?.current_month.total_earnings || 0
                  )}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Projects
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {earningsData?.current_month?.records?.length || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Avg/Project
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {earningsData?.current_month?.records?.length
                    ? formatCurrency(
                        (earningsData.current_month?.total_earnings || 0) /
                          (earningsData.current_month?.records?.length || 1)
                      )
                    : formatCurrency(0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Earnings Trend Chart */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <TrendingUp className="w-6 h-6 mr-3" />
              Earnings Trend
            </h2>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={earningsData?.historical_data || []}>
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
                <DollarSign className="w-6 h-6 mr-3" />
                {currentMonthName}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {earningsData?.current_month?.records?.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No earnings this month</p>
              </div>
            ) : (
              earningsData?.current_month.records.map((record, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {record.projects.nama_project}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {record.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Project:{" "}
                        {new Date(
                          record.projects.tanggal_mulai
                        ).toLocaleDateString("id-ID")}{" "}
                        -{" "}
                        {new Date(record.projects.deadline).toLocaleDateString(
                          "id-ID"
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 text-lg">
                        {formatCurrency(record.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(record.created_at).toLocaleDateString(
                          "id-ID"
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {earningsData?.current_month?.records?.length &&
              earningsData.current_month?.records?.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Earnings:</span>
                    <span className="text-green-600">
                      {formatCurrency(
                        earningsData.current_month?.total_earnings || 0
                      )}
                    </span>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

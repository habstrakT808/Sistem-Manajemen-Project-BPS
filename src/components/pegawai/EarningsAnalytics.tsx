// File: src/components/pegawai/EarningsAnalytics.tsx

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  RefreshCw,
  FileText,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
  Target,
  Award,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  Eye,
  AlertCircle,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "sonner";

interface EarningsRecord {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  bulan: number;
  tahun: number;
  projects: {
    id: string;
    nama_project: string;
    tanggal_mulai: string;
    deadline: string;
    status: "upcoming" | "active" | "completed";
  };
}

interface MonthlyEarnings {
  month: number;
  year: number;
  month_name: string;
  total: number;
  project_count: number;
  records: EarningsRecord[];
}

interface EarningsAnalytics {
  total_earnings: number;
  total_projects: number;
  average_per_project: number;
  best_month: {
    month_name: string;
    amount: number;
  };
  growth_percentage: number;
  monthly_average: number;
  current_month_rank: number;
  projected_annual: number;
}

interface ProjectContribution {
  project_name: string;
  amount: number;
  percentage: number;
  project_count: number;
  status: string;
}

interface EarningsData {
  current_period: MonthlyEarnings;
  historical_data: MonthlyEarnings[];
  analytics: EarningsAnalytics;
  project_contributions: ProjectContribution[];
  yearly_summary: {
    year: number;
    total: number;
    months_active: number;
    projects_completed: number;
  };
}

type PeriodType = "monthly" | "quarterly" | "yearly" | "custom";
type ViewType = "overview" | "trends" | "projects" | "detailed";

export function EarningsAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [currentView, setCurrentView] = useState<ViewType>("overview");
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const periodParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("period", selectedPeriod);
    params.set("year", selectedYear.toString());
    if (selectedPeriod === "monthly")
      params.set("month", selectedMonth.toString());
    return params.toString();
  }, [selectedPeriod, selectedYear, selectedMonth]);

  const fetchEarningsData = useCallback(async (): Promise<EarningsData> => {
    const response = await fetch(
      `/api/pegawai/earnings/analytics?${periodParams}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      const errorResult = await response.json();
      throw new Error(
        errorResult.error || "Failed to fetch earnings analytics"
      );
    }
    const result = await response.json();
    return result as EarningsData;
  }, [periodParams]);

  const {
    data: earningsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<EarningsData, Error>({
    queryKey: ["pegawai", "earnings", "analytics", { periodParams }],
    queryFn: fetchEarningsData,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = useCallback(async () => {
    const res = await refetch();
    if (res.error) toast.error(res.error.message);
    else toast.success("Earnings data refreshed successfully");
  }, [refetch]);

  const handlePeriodNavigation = useCallback(
    (direction: "prev" | "next") => {
      if (selectedPeriod === "monthly") {
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
      } else if (selectedPeriod === "yearly") {
        setSelectedYear(
          direction === "prev" ? selectedYear - 1 : selectedYear + 1
        );
      }
    },
    [selectedPeriod, selectedMonth, selectedYear]
  );

  const handleExport = useCallback(
    async (format: "pdf" | "excel" | "csv") => {
      setExportLoading(format);
      try {
        const response = await fetch(`/api/pegawai/earnings/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format,
            period: selectedPeriod,
            year: selectedYear,
            month: selectedMonth,
          }),
        });
        if (!response.ok) throw new Error("Export failed");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `earnings-${selectedPeriod}-${selectedYear}${selectedPeriod === "monthly" ? `-${selectedMonth}` : ""}.${format === "excel" ? "xlsx" : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Earnings report exported as ${format.toUpperCase()}`);
      } catch {
        toast.error("Export failed. Please try again.");
      } finally {
        setExportLoading(null);
      }
    },
    [selectedPeriod, selectedYear, selectedMonth]
  );

  useEffect(() => {
    // no-op; React Query handles fetching on key change
  }, [periodParams]);

  // Chart data transformations
  const chartData = useMemo(() => {
    if (!earningsData) return { trends: [], projects: [], monthly: [] };

    const trends = earningsData.historical_data.map((item, index) => ({
      month: item.month_name,
      earnings: item.total,
      projects: item.project_count,
      average: earningsData.analytics.monthly_average,
      growth:
        index > 0
          ? ((item.total - earningsData.historical_data[index - 1].total) /
              earningsData.historical_data[index - 1].total) *
            100
          : 0,
    }));

    const projects = earningsData.project_contributions.map((item) => ({
      name:
        item.project_name.length > 15
          ? item.project_name.substring(0, 15) + "..."
          : item.project_name,
      value: item.amount,
      percentage: item.percentage,
      count: item.project_count,
    }));

    const monthly = earningsData.historical_data.map((item) => ({
      month: item.month_name.substring(0, 3),
      current: item.total,
      target: earningsData.analytics.monthly_average * 1.1,
      projects: item.project_count,
    }));

    return { trends, projects, monthly };
  }, [earningsData]);

  const currentPeriodName = useMemo(() => {
    if (selectedPeriod === "monthly") {
      return new Date(selectedYear, selectedMonth - 1).toLocaleDateString(
        "id-ID",
        {
          month: "long",
          year: "numeric",
        }
      );
    } else if (selectedPeriod === "yearly") {
      return selectedYear.toString();
    } else if (selectedPeriod === "quarterly") {
      const quarter = Math.ceil(selectedMonth / 3);
      return `Q${quarter} ${selectedYear}`;
    }
    return "Custom Period";
  }, [selectedPeriod, selectedYear, selectedMonth]);

  if (isLoading && !earningsData) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-6 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="flex space-x-4">
            <div className="h-12 bg-gray-200 rounded-xl w-32"></div>
            <div className="h-12 bg-gray-200 rounded-xl w-32"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-0 shadow-xl rounded-xl p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="border-0 shadow-xl rounded-xl p-6 h-96 bg-gray-100"></div>
          <div className="border-0 shadow-xl rounded-xl p-6 h-96 bg-gray-100"></div>
        </div>
      </div>
    );
  }

  if (error && !earningsData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Failed to Load Earnings Data
            </h2>
            <p className="text-gray-600 max-w-md">{error.message}</p>
            <Button
              onClick={handleRefresh}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
              />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!earningsData) return null;

  const { current_period, analytics, project_contributions, yearly_summary } =
    earningsData;

  // Chart colors
  const chartColors = [
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
  ];

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Earnings Analytics
            </h1>
            <div className="flex items-center space-x-4 mt-3">
              <Badge className="bg-gradient-to-r from-green-500 to-teal-600 text-white border-0">
                <DollarSign className="w-3 h-3 mr-1" />
                {currentPeriodName}
              </Badge>
              <Badge className="bg-white text-green-600 border border-green-200">
                <Award className="w-3 h-3 mr-1" />
                {analytics.total_projects} Projects
              </Badge>
              <Badge className="bg-white text-teal-600 border border-teal-200">
                <Target className="w-3 h-3 mr-1" />
                Rank #{analytics.current_month_rank}
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Period Navigation */}
            <div className="flex items-center space-x-2 bg-white rounded-xl shadow-lg p-2 border border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePeriodNavigation("prev")}
                className="hover:bg-green-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-gray-900 min-w-[140px] text-center">
                {currentPeriodName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePeriodNavigation("next")}
                className="hover:bg-green-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* View Selector */}
            <Select
              value={currentView}
              onValueChange={(value: ViewType) => setCurrentView(value)}
            >
              <SelectTrigger className="w-40">
                <Eye className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="trends">Trends</SelectItem>
                <SelectItem value="projects">Projects</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select
            value={selectedPeriod}
            onValueChange={(value: PeriodType) => setSelectedPeriod(value)}
          >
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

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
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => handleExport("pdf")}
            disabled={exportLoading === "pdf"}
            variant="outline"
            className="border-2 border-red-200 text-red-600 hover:bg-red-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            {exportLoading === "pdf" ? "Exporting..." : "PDF"}
          </Button>

          <Button
            onClick={() => handleExport("excel")}
            disabled={exportLoading === "excel"}
            variant="outline"
            className="border-2 border-green-200 text-green-600 hover:bg-green-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {exportLoading === "excel" ? "Exporting..." : "Excel"}
          </Button>

          <Button
            onClick={() => window.print()}
            variant="outline"
            className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Total Earnings
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatCurrency(current_period.total)}
                </p>
                <div className="flex items-center">
                  {analytics.growth_percentage >= 0 ? (
                    <ArrowUp className="w-4 h-4 text-green-600 mr-1" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-red-600 mr-1" />
                  )}
                  <span
                    className={`text-sm font-semibold ${analytics.growth_percentage >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {Math.abs(analytics.growth_percentage).toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    vs last period
                  </span>
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Average per Project
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatCurrency(
                    current_period.project_count > 0
                      ? current_period.total / current_period.project_count
                      : 0
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  From {current_period.project_count} project
                  {current_period.project_count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Best Month
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatCurrency(analytics.best_month.amount)}
                </p>
                <p className="text-sm text-gray-500">
                  {analytics.best_month.month_name}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Award className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Projected Annual
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatCurrency(analytics.projected_annual)}
                </p>
                <p className="text-sm text-gray-500">Based on current trends</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Content Based on View */}
      {currentView === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Earnings Trend */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <TrendingUp className="w-6 h-6 mr-3" />
                Earnings Trend
              </h2>
              <p className="text-green-100 text-sm mt-2">
                Monthly earnings progression
              </p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData.trends}>
                  <defs>
                    <linearGradient
                      id="earningsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="month"
                    className="text-sm text-gray-600"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    className="text-sm text-gray-600"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      `${(value / 1000000).toFixed(1)}M`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Earnings",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#earningsGradient)"
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: "#10b981", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Contributions */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <PieChart className="w-6 h-6 mr-3" />
                Project Contributions
              </h2>
              <p className="text-blue-100 text-sm mt-2">
                Earnings breakdown by project
              </p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={350}>
                <RechartsPieChart>
                  <Pie
                    data={chartData.projects}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {chartData.projects.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Earnings",
                    ]}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {currentView === "trends" && (
        <div className="space-y-8">
          {/* Monthly Comparison */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <BarChart3 className="w-6 h-6 mr-3" />
                Monthly Performance
              </h2>
              <p className="text-purple-100 text-sm mt-2">
                Current vs target comparison
              </p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData.monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="month"
                    className="text-sm text-gray-600"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    className="text-sm text-gray-600"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      `${(value / 1000000).toFixed(1)}M`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: number) => [formatCurrency(value), ""]}
                  />
                  <Legend />
                  <Bar
                    dataKey="current"
                    fill="#10b981"
                    name="Current Earnings"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="target"
                    fill="#f59e0b"
                    name="Target"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {currentView === "projects" && (
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Award className="w-6 h-6 mr-3" />
              Project Performance
            </h2>
            <p className="text-indigo-100 text-sm mt-2">
              Detailed project earnings breakdown
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {project_contributions.map((project, index) => (
                <div
                  key={index}
                  className="group p-6 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors text-lg">
                        {project.project_name}
                      </div>
                      <div className="text-sm text-gray-500 group-hover:text-indigo-500 mt-2">
                        {project.project_count} project
                        {project.project_count > 1 ? "s" : ""} •{" "}
                        {project.percentage.toFixed(1)}% of total earnings
                      </div>
                      <div className="mt-3 flex items-center space-x-2">
                        <Badge
                          className={`${
                            project.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : project.status === "active"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {project.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="ml-6 text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(project.amount)}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(project.percentage, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentView === "detailed" && (
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <FileText className="w-6 h-6 mr-3" />
              Detailed Records
            </h2>
            <p className="text-gray-300 text-sm mt-2">
              Complete earnings transaction history
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {current_period.records.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    No earnings records for this period
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Records will appear when projects are assigned
                  </p>
                </div>
              ) : (
                current_period.records.map((record, index) => (
                  <div
                    key={index}
                    className="group p-6 rounded-2xl border border-gray-200 hover:border-green-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors text-lg">
                            {record.projects.nama_project}
                          </div>
                          <Badge
                            className={`${
                              record.projects.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : record.projects.status === "active"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {record.projects.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          {record.description}
                        </div>
                        <div className="text-sm text-gray-500 mt-2 flex items-center space-x-4">
                          <span>
                            Project Period:{" "}
                            {new Date(
                              record.projects.tanggal_mulai
                            ).toLocaleDateString("id-ID")}{" "}
                            -{" "}
                            {new Date(
                              record.projects.deadline
                            ).toLocaleDateString("id-ID")}
                          </span>
                          <span>•</span>
                          <span>
                            Received:{" "}
                            {new Date(record.created_at).toLocaleDateString(
                              "id-ID"
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="ml-6 text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(record.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Transport Allowance
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {current_period.records.length > 0 && (
                <div className="border-t pt-6 mt-6">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span className="text-gray-900">
                      Total {currentPeriodName}:
                    </span>
                    <span className="text-green-600">
                      {formatCurrency(current_period.total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Yearly Summary */}
      <div className="border-0 shadow-xl bg-gradient-to-r from-green-600 to-teal-600 text-white overflow-hidden rounded-xl">
        <div className="p-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <Calendar className="w-8 h-8 mr-3" />
            {yearly_summary.year} Summary
          </h3>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {formatCurrency(yearly_summary.total)}
              </div>
              <div className="text-green-100 text-sm">Total Earnings</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {yearly_summary.months_active}
              </div>
              <div className="text-green-100 text-sm">Active Months</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {yearly_summary.projects_completed}
              </div>
              <div className="text-green-100 text-sm">Projects Completed</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {yearly_summary.total > 0
                  ? formatCurrency(
                      yearly_summary.total /
                        Math.max(yearly_summary.months_active, 1)
                    )
                  : formatCurrency(0)}
              </div>
              <div className="text-green-100 text-sm">Monthly Average</div>
            </div>
          </div>

          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full translate-y-12 -translate-x-12"></div>
        </div>
      </div>
    </div>
  );
}

// File: src/components/ketua-tim/FinancialDashboard.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Users,
  FolderOpen,
  Download,
  FileText,
  PieChart,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface FinancialStats {
  total_monthly_spending: number;
  transport_spending: number;
  honor_spending: number;
  active_projects_budget: number;
  budget_utilization: number;
  projects_with_budget: number;
}

interface ProjectBudget {
  id: string;
  nama_project: string;
  total_budget: number;
  transport_budget: number;
  honor_budget: number;
  status: "upcoming" | "active" | "completed";
  deadline: string;
  budget_percentage: number;
}

interface SpendingTrend {
  month: string;
  transport: number;
  honor: number;
  total: number;
}

interface FinancialData {
  stats: FinancialStats;
  project_budgets: ProjectBudget[];
  spending_trends: SpendingTrend[];
  top_spenders: {
    pegawai: Array<{ name: string; amount: number; projects: number }>;
    mitra: Array<{
      name: string;
      amount: number;
      projects: number;
      remaining_limit: number;
    }>;
  };
}

export default function FinancialDashboard() {
  const [financialData, setFinancialData] = useState<FinancialData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");

  // File: src/components/ketua-tim/FinancialDashboard.tsx (Update fetchFinancialData function)

  const fetchFinancialData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(
        `/api/ketua-tim/financial?period=${selectedPeriod}`
      );

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || "Failed to fetch financial data");
      }

      const result = await response.json();
      setFinancialData(result);
    } catch (error) {
      console.error("Error fetching financial data:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load financial data";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [selectedPeriod]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFinancialData();
    setRefreshing(false);
    toast.success("Financial data refreshed");
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchFinancialData();
      setLoading(false);
    };

    loadData();
  }, [fetchFinancialData]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse border-0 shadow-xl rounded-xl"
            >
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !financialData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Failed to Load Financial Data
            </h2>
            <p className="text-gray-600 max-w-md">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchFinancialData().finally(() => setLoading(false));
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!financialData) return null;

  const { stats, project_budgets, top_spenders } = financialData;

  const statsCards = [
    {
      title: "Monthly Spending",
      value: formatCurrency(stats.total_monthly_spending),
      description: "Total this month",
      icon: DollarSign,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "Transport Budget",
      value: formatCurrency(stats.transport_spending),
      description: "Pegawai allowances",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      trend: "+8%",
      trendUp: true,
    },
    {
      title: "Partner Fees",
      value: formatCurrency(stats.honor_spending),
      description: "Mitra payments",
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      trend: "+15%",
      trendUp: true,
    },
    {
      title: "Budget Utilization",
      value: `${stats.budget_utilization}%`,
      description: "Of allocated budget",
      icon: PieChart,
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
      trend: "5%",
      trendUp: false,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Financial Dashboard
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Monitor project budgets, spending trends, and financial performance.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-2 border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <p className="text-3xl font-bold text-gray-900 mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500">{stat.description}</p>
                  </div>
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {stat.trendUp ? (
                      <ArrowUp className="w-4 h-4 text-green-600 mr-1" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-600 mr-1" />
                    )}
                    <span
                      className={`text-sm font-semibold ${stat.trendUp ? "text-green-600" : "text-red-600"}`}
                    >
                      {stat.trend}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      vs last month
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Budgets & Top Spenders */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Project Budgets */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white text-xl font-semibold">
                <FolderOpen className="w-6 h-6 mr-3" />
                Project Budgets
              </div>
              <Badge className="bg-white/20 text-white">
                {project_budgets.length}
              </Badge>
            </div>
            <div className="text-purple-100 mt-2 text-sm">
              Budget allocation by project
            </div>
          </div>
          <div className="p-6 space-y-4">
            {project_budgets.map((project, index) => (
              <Link key={index} href={`/ketua-tim/projects/${project.id}`}>
                <div className="group flex items-center p-4 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-gray-100 hover:border-purple-200 hover:shadow-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                      {project.nama_project}
                    </div>
                    <div className="text-sm text-gray-500 group-hover:text-purple-500 mt-1">
                      Transport: {formatCurrency(project.transport_budget)} •
                      Honor: {formatCurrency(project.honor_budget)}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Deadline:{" "}
                      {new Date(project.deadline).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(project.total_budget)}
                    </div>
                    <Badge
                      className={`${
                        project.status === "active"
                          ? "bg-green-100 text-green-800"
                          : project.status === "upcoming"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {project.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Spenders */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6">
            <div className="flex items-center text-white text-xl font-semibold">
              <BarChart3 className="w-6 h-6 mr-3" />
              Top Spenders
            </div>
            <div className="text-orange-100 mt-2 text-sm">
              Highest budget allocations
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Top Pegawai */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Team Members</h4>
              <div className="space-y-2">
                {top_spenders.pegawai.map((pegawai, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {pegawai.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pegawai.projects} projects
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(pegawai.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Mitra */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Partners</h4>
              <div className="space-y-2">
                {top_spenders.mitra.map((mitra, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      mitra.remaining_limit < 0
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-100"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {mitra.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {mitra.projects} projects
                      </div>
                      {mitra.remaining_limit < 0 && (
                        <div className="text-xs text-red-600 flex items-center mt-1">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Exceeds limit by{" "}
                          {formatCurrency(Math.abs(mitra.remaining_limit))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-semibold ${
                          mitra.remaining_limit < 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {formatCurrency(mitra.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {mitra.remaining_limit >= 0
                          ? `${formatCurrency(mitra.remaining_limit)} left`
                          : "Over limit"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden rounded-xl">
        <div className="p-8">
          <h3 className="text-2xl font-bold mb-6">
            Financial Reports & Actions
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Button
              asChild
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-auto p-4 justify-start"
            >
              <Link href="/ketua-tim/reports">
                <div className="flex items-center">
                  <FileText className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Generate Report</div>
                    <div className="text-sm opacity-80">
                      Monthly financial report
                    </div>
                  </div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-auto p-4 justify-start"
            >
              <Link href="/ketua-tim/projects/new">
                <div className="flex items-center">
                  <FolderOpen className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">New Project</div>
                    <div className="text-sm opacity-80">Create with budget</div>
                  </div>
                </div>
              </Link>
            </Button>

            <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-auto p-4 justify-start">
              <div className="flex items-center">
                <CheckCircle className="w-6 h-6 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Budget Review</div>
                  <div className="text-sm opacity-80">Review allocations</div>
                </div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

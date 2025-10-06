// File: src/components/admin/TransportAnalytics.tsx
// NEW: Transport analytics dashboard for admin

"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Users,
  FolderOpen,
  TrendingUp,
  Download,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TransportAnalytics {
  daily_transport: Array<{
    occurred_on: string;
    amount: number;
    user_id: string;
    users: { nama_lengkap: string };
    tasks: {
      title: string;
      projects: { nama_project: string };
    };
  }>;
  user_statistics: Array<{
    name: string;
    email: string;
    total: number;
    count: number;
  }>;
  project_statistics: Array<{
    name: string;
    total: number;
    count: number;
  }>;
  summary: {
    total_amount: number;
    total_allocations: number;
    unique_users: number;
    unique_projects: number;
  };
}

async function fetchTransportAnalytics(
  period: string,
): Promise<TransportAnalytics> {
  const response = await fetch(
    `/api/admin/analytics/transport?period=${period}`,
    {
      cache: "no-store",
    },
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result._error || "Gagal mengambil analitik transport");
  }
  return result.data;
}

export default function TransportAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");

  const {
    data: analytics,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<TransportAnalytics, Error>({
    queryKey: ["admin", "analytics", "transport", { selectedPeriod }],
    queryFn: () => fetchTransportAnalytics(selectedPeriod),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    const res = await refetch();
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success("Analytics refreshed");
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/admin/analytics/transport/export?period=${selectedPeriod}`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transport_analytics_${selectedPeriod}days.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Ekspor berhasil diunduh");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Gagal mengekspor data");
    }
  };

  // Process daily data for chart
  const dailyChartData = React.useMemo(() => {
    if (!analytics?.daily_transport) return [];

    const dailyMap = new Map<string, number>();
    analytics.daily_transport.forEach((record) => {
      const date = record.occurred_on;
      dailyMap.set(date, (dailyMap.get(date) || 0) + record.amount);
    });

    return Array.from(dailyMap.entries())
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString("id-ID", {
          month: "short",
          day: "numeric",
        }),
        amount: amount / 1000, // Convert to thousands for better chart display
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14); // Last 14 days
  }, [analytics]);

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
      </div>
    );
  }

  if (!analytics) return null;

  const { summary, user_statistics, project_statistics } = analytics;

  const statsCards = [
    {
      title: "Total Transport",
      value: formatCurrency(summary.total_amount),
      description: `${summary.total_allocations} alokasi`,
      icon: DollarSign,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
    },
    {
      title: "Pengguna Aktif",
      value: summary.unique_users,
      description: "Pengguna dengan transport",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
    },
    {
      title: "Proyek Aktif",
      value: summary.unique_projects,
      description: "Proyek dengan transport",
      icon: FolderOpen,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
    },
    {
      title: "Rata-rata per Pengguna",
      value: formatCurrency(
        summary.unique_users > 0
          ? summary.total_amount / summary.unique_users
          : 0,
      ),
      description: "Rata-rata alokasi",
      icon: TrendingUp,
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
            Analitik Transport
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Pantau alokasi transport, pola penggunaan, dan dampak finansial.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 hari</SelectItem>
              <SelectItem value="30">30 hari</SelectItem>
              <SelectItem value="90">90 hari</SelectItem>
              <SelectItem value="365">1 tahun</SelectItem>
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
            Muat Ulang
          </Button>

          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Ekspor CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden rounded-xl bg-white"
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Transport Trend */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <TrendingUp className="w-6 h-6 mr-3" />
              Tren Transport Harian
            </h2>
            <p className="text-green-100 text-sm mt-1">
              Pola alokasi 14 hari terakhir
            </p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(value) => `${value}K`} />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value * 1000),
                    "Transport",
                  ]}
                  labelStyle={{ color: "#374151" }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Users */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Users className="w-6 h-6 mr-3" />
              Penerima Transport Teratas
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Alokasi transport tertinggi
            </p>
          </div>
          <div className="p-6 space-y-4">
            {user_statistics.slice(0, 10).map((user, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">
                      {user.count} alokasi
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-600">
                    {formatCurrency(user.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Statistics */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <FolderOpen className="w-6 h-6 mr-3" />
            Transport berdasarkan Tugas
          </h2>
          <p className="text-purple-100 text-sm mt-1">
            Rincian alokasi transport per tugas
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project_statistics.map((project, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">
                      {project.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {project.count} alokasi
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-600">
                      {formatCurrency(project.total)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

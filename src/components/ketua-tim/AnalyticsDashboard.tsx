// File: src/components/ketua-tim/AnalyticsDashboard.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  BarChart3,
  Users,
  Clock,
  Target,
  RefreshCw,
  AlertCircle,
  Download,
  CheckCircle,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsStats {
  total_projects: number;
  completion_rate: number;
  average_project_duration: number;
  team_utilization: number;
  on_time_delivery: number;
  budget_efficiency: number;
}

interface ProjectPerformance {
  project_name: string;
  completion_percentage: number;
  days_remaining: number;
  team_size: number;
  budget_used: number;
  status: "on_track" | "at_risk" | "delayed";
}

interface TeamProductivity {
  member_name: string;
  tasks_completed: number;
  tasks_pending: number;
  completion_rate: number;
  projects_assigned: number;
  workload_level: "low" | "medium" | "high";
}

interface AnalyticsData {
  stats: AnalyticsStats;
  project_performance: ProjectPerformance[];
  team_productivity: TeamProductivity[];
  monthly_trends: {
    month: string;
    projects_completed: number;
    tasks_completed: number;
    budget_spent: number;
  }[];
}

async function fetchAnalyticsData(
  selectedPeriod: string,
  month?: number,
  year?: number,
): Promise<AnalyticsData> {
  const response = await fetch(
    `/api/ketua-tim/analytics?period=${selectedPeriod}${month ? `&month=${month}` : ""}${year ? `&year=${year}` : ""}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const errorResult = await response.json();
    throw new Error(errorResult.error || "Failed to fetch analytics data");
  }
  const result = await response.json();
  return result as AnalyticsData;
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState("3_months");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const month = selectedDate.getMonth() + 1;
  const year = selectedDate.getFullYear();

  const {
    data: analyticsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<AnalyticsData, Error>({
    queryKey: ["ketua", "analytics", { selectedPeriod, month, year }],
    queryFn: () => fetchAnalyticsData(selectedPeriod, month, year),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    router.prefetch("/ketua-tim/projects");
    router.prefetch("/ketua-tim/team");
    router.prefetch("/ketua-tim/tasks");
    router.prefetch("/ketua-tim/financial");
  }, [router]);

  const handleRefresh = async () => {
    const res = await refetch();
    if (res.error) toast.error(res.error.message);
    else toast.success("Data analitik berhasil diperbarui");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track":
        return "bg-green-100 text-green-800 border-green-200";
      case "at_risk":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "delayed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Loading skeleton
  if (isLoading && !analyticsData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
  if (error && !analyticsData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Failed to Load Analytics
            </h2>
            <p className="text-gray-600 max-w-md">{error.message}</p>
            <Button
              onClick={handleRefresh}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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

  if (!analyticsData) return null;

  const { stats, project_performance, team_productivity } = analyticsData;

  const statsCards = [
    {
      title: "Total Proyek",
      value: stats.total_projects.toString(),
      description: "Total sepanjang waktu",
      icon: BarChart3,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
    },
    {
      title: "Tingkat Penyelesaian",
      value: `${stats.completion_rate}%`,
      description: "Proyek selesai",
      icon: CheckCircle,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
    },
    {
      title: "Rata-rata Durasi",
      value: `${stats.average_project_duration} hari`,
      description: "Waktu penyelesaian proyek",
      icon: Clock,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
    },
    // Removed: Team Utilization, On-Time Delivery, Budget Efficiency
  ];

  return (
    <div className="relative space-y-10">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 blur-3xl opacity-60"></div>
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 blur-3xl opacity-60"></div>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-white/60 bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur shadow-xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Dasbor Analitik
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Lacak performa, produktivitas, dan wawasan proyek.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Pilih Bulan */}
          <Select
            value={String(month)}
            onValueChange={(v) => {
              const d = new Date(selectedDate);
              d.setMonth(Number(v) - 1);
              setSelectedDate(d);
            }}
          >
            <SelectTrigger className="w-44 rounded-xl border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {new Date(2000, m - 1, 1).toLocaleDateString("id-ID", {
                    month: "long",
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Pilih Tahun */}
          <Select
            value={String(year)}
            onValueChange={(v) => {
              const d = new Date(selectedDate);
              d.setFullYear(Number(v));
              setSelectedDate(d);
            }}
          >
            <SelectTrigger className="w-36 rounded-xl border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 6 }).map((_, i) => {
                const y = new Date().getFullYear() - i;
                return (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button
            onClick={handleRefresh}
            disabled={isFetching}
            variant="outline"
            className="rounded-xl border-2 border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Muat Ulang
          </Button>

          <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
            <Download className="w-4 h-4 mr-2" />
            Ekspor Laporan
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-30`}
              ></div>
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-white/40 blur-2xl"></div>
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
                    className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg ring-1 ring-white/40`}
                  >
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Performance & Team Productivity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Project Performance */}
        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur shadow-xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white text-xl font-semibold">
                <Activity className="w-6 h-6 mr-3" />
                Kinerja Proyek
              </div>
              <Badge className="bg-white/20 text-white">
                {project_performance.length}
              </Badge>
            </div>
            <div className="text-blue-100 mt-2 text-sm">
              Status dan progres proyek saat ini
            </div>
          </div>
          <div className="p-6 space-y-4">
            {project_performance.map((project, index) => (
              <div
                key={index}
                className="p-4 rounded-2xl border border-gray-100/70 hover:border-blue-200/80 hover:bg-blue-50/70 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-900">
                    {project.project_name}
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Progres</div>
                    <div className="font-semibold">
                      {project.completion_percentage}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Sisa Hari</div>
                    <div className="font-semibold">
                      {project.days_remaining} hari
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Ukuran Tim</div>
                    <div className="font-semibold">
                      {project.team_size} anggota
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Anggaran Terpakai</div>
                    <div className="font-semibold">
                      {formatCurrency(project.budget_used)}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progres</span>
                    <span>{project.completion_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200/70 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${project.completion_percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Productivity */}
        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur shadow-xl">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white text-xl font-semibold">
                <Users className="w-6 h-6 mr-3" />
                Produktivitas Tim
              </div>
              <Badge className="bg-white/20 text-white">
                {team_productivity.length}
              </Badge>
            </div>
            <div className="text-green-100 mt-2 text-sm">
              Performa tiap anggota tim
            </div>
          </div>
          <div className="p-6 space-y-4">
            {team_productivity.map((member, index) => (
              <div
                key={index}
                className="p-4 rounded-2xl border border-gray-100/70 hover:border-green-200/80 hover:bg-green-50/70 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-900">
                    {member.member_name}
                  </div>
                  <Badge className={getWorkloadColor(member.workload_level)}>
                    {member.workload_level.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Selesai</div>
                    <div className="font-semibold">
                      {member.tasks_completed} tugas
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Tertunda</div>
                    <div className="font-semibold">
                      {member.tasks_pending} tugas
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Tingkat Keberhasilan</div>
                    <div className="font-semibold">
                      {member.completion_rate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Proyek</div>
                    <div className="font-semibold">
                      {member.projects_assigned} aktif
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tingkat Penyelesaian</span>
                    <span>{member.completion_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200/70 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${member.completion_rate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="border-0 shadow-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white overflow-hidden rounded-2xl ring-1 ring-white/20">
        <div className="p-8">
          <h3 className="text-2xl font-bold mb-6">Ringkasan Performa</h3>
          <div className="grid md:grid-cols-1 gap-8 text-center relative">
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Target className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">{stats.completion_rate}%</div>
              <div className="text-purple-100 text-sm">
                Tingkat penyelesaian keseluruhan
              </div>
            </div>

            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-16 translate-x-16 blur-xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full translate-y-12 -translate-x-12 blur-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

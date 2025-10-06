// File: src/components/pegawai/PegawaiDashboard.tsx
// UPDATED: Modern, beautiful dashboard with enhanced UI/UX

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useActiveProject } from "@/components/providers";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  FolderOpen,
  DollarSign,
  Star,
  CheckCircle,
  ArrowRight,
  Target,
  TrendingUp,
  Award,
  RefreshCw,
  AlertCircle,
  Play,
  CheckSquare,
  Calendar,
  Leaf,
  MapPin,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface PegawaiDashboardStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_earnings: number;
  transport_earnings: number;
  pending_transport_allocations?: number;
  transport_required?: number;
  transport_allocated?: number;
  pending_reviews?: number;
}

interface TodayTask {
  id: string;
  title: string;
  deskripsi_tugas: string;
  start_date: string;
  end_date: string;
  has_transport: boolean;
  status: "pending" | "in_progress" | "completed";
  project_name: string;
  response_pegawai?: string;
  transport_allocations: Array<{
    allocation_date: string | null;
    canceled_at: string | null;
  }>;
}

interface AssignedProject {
  id: string;
  nama_project: string;
  status: "upcoming" | "active" | "completed";
  deadline: string;
  ketua_tim_name: string;
  my_progress: number;
  user_role: "leader" | "member";
}

interface DashboardData {
  stats: PegawaiDashboardStats;
  today_tasks: TodayTask[];
  assigned_projects: AssignedProject[];
}

async function fetchPegawaiDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/pegawai/dashboard", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch dashboard data");
  }
  return result as DashboardData;
}

export default function PegawaiDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProject, setActiveProject } = useActiveProject();
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardData, Error>({
    queryKey: [
      "pegawai",
      "dashboard",
      {
        projectId: searchParams.get("project_id") || activeProject?.id || null,
      },
    ],
    queryFn: async () => {
      const selectedProjectId =
        searchParams.get("project_id") || activeProject?.id || undefined;
      // Persist into context if provided via URL and context empty
      if (selectedProjectId && !activeProject?.id) {
        setActiveProject({ id: selectedProjectId, role: "member" });
      }
      const qs = selectedProjectId
        ? `?project_id=${encodeURIComponent(selectedProjectId)}`
        : "";
      const res = await fetch(`/api/pegawai/dashboard${qs}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengambil data dasbor");
      return json as DashboardData;
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    const res = await refetch();
    setRefreshing(false);
    if (res.error) toast.error(res.error.message);
    else toast.success("Dasbor diperbarui");
  };

  const handleTaskStatusUpdate = async (
    taskId: string,
    newStatus: "in_progress" | "completed",
    response?: string,
  ) => {
    setUpdatingTask(taskId);
    try {
      const updateData: { status: string; response_pegawai?: string } = {
        status: newStatus,
      };
      if (response) updateData.response_pegawai = response;

      const apiResponse = await fetch(`/api/pegawai/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!apiResponse.ok) {
        const error = await apiResponse.json();
        throw new Error(error.error || "Gagal memperbarui tugas");
      }

      toast.success(
        `Tugas ${newStatus === "completed" ? "selesai" : "dimulai"}!`,
      );
      await refetch();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal memperbarui tugas",
      );
    } finally {
      setUpdatingTask(null);
    }
  };

  useEffect(() => {
    router.prefetch("/pegawai/tasks");
    router.prefetch("/pegawai/projects");
    router.prefetch("/pegawai/earnings");
    router.prefetch("/pegawai/reviews");
  }, [router]);

  if (isLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 text-lg">Memuat ruang kerja Anda...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-6">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
          <h2 className="text-3xl font-bold text-gray-900">
            Gagal Memuat Dasbor
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">{error.message}</p>
          <Button
            onClick={handleRefresh}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <RefreshCw
              className={`w-5 h-5 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { stats, today_tasks, assigned_projects } = dashboardData;

  const completionTotal = stats.completed_tasks + stats.pending_tasks;
  const completionRate =
    completionTotal > 0
      ? Math.round((stats.completed_tasks / completionTotal) * 100)
      : 0;

  const performanceCards = [
    {
      title: "Task Completion Rate",
      value: `${completionRate}%`,
      description: `${stats.completed_tasks}/${completionTotal} completed`,
      icon: Target,
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
      href: "/pegawai/tasks",
    },
    {
      title: "Transport Dates",
      value: `${stats.transport_allocated || 0}/${stats.transport_required || 0}`,
      description: "Allocated / Required",
      icon: MapPin,
      color: "from-red-500 to-red-600",
      bgColor: "from-red-50 to-red-100",
      href: "/pegawai/tasks?filter=transport",
      urgent:
        (stats.transport_required || 0) - (stats.transport_allocated || 0) > 0,
    },
    {
      title: "Pending Reviews",
      value: stats.pending_reviews || 0,
      description: "Mitra reviews needed",
      icon: Star,
      color: "from-yellow-500 to-yellow-600",
      bgColor: "from-yellow-50 to-yellow-100",
      href: "/pegawai/reviews",
    },
  ];

  const todayDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-90"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-8 right-8 w-1 h-1 bg-white rounded-full"></div>
          <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-white rounded-full"></div>
          <div className="absolute bottom-12 right-4 w-2 h-2 bg-white rounded-full"></div>
        </div>

        <div className="relative px-2 md:px-4 lg:px-6 py-8 md:py-12">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      Selamat Datang Kembali!
                    </h1>
                    <p className="text-emerald-100 text-base md:text-lg">
                      {todayDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300">
                    <Leaf className="w-3 h-3 mr-1" />
                    Akses Pegawai
                  </Badge>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date().toLocaleDateString("id-ID", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </Badge>
                  {(stats.pending_transport_allocations || 0) > 0 && (
                    <Badge className="bg-red-500/80 backdrop-blur-sm text-white border-red-400/50 animate-pulse hover:bg-red-500 transition-all duration-300">
                      <MapPin className="w-3 h-3 mr-1" />
                      {stats.pending_transport_allocations} Butuh Tanggal
                      Transport
                    </Badge>
                  )}
                </div>
              </div>

              <div className="hidden lg:flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-4 py-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold">
                    Hari yang Produktif!
                  </span>
                </div>

                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Muat Ulang
                </Button>

                <Button
                  asChild
                  className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-6 py-3 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  <Link
                    href={
                      activeProject?.id
                        ? `/pegawai/tasks?project_id=${activeProject.id}`
                        : "/pegawai/tasks"
                    }
                    prefetch
                    onMouseEnter={() => router.prefetch("/pegawai/tasks")}
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Lihat Semua Tugas
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-2 md:px-4 lg:px-6 -mt-8 relative z-10">
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tugas</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.total_tasks}
                </p>
                <p className="text-xs text-green-600 font-medium">
                  +{stats.completed_tasks} selesai
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Proyek Aktif
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.total_projects}
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  {stats.active_projects} aktif
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pendapatan Bulanan
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.total_earnings || 0)}
                </p>
                <p className="text-xs text-emerald-600 font-medium">
                  Biaya transport
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Penyelesaian Tugas
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.completed_tasks}/
                  {stats.completed_tasks + stats.pending_tasks}
                </p>
                <p className="text-xs text-orange-600 font-medium">Bulan ini</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-8">
          {performanceCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Link
                key={index}
                href={stat.href}
                prefetch
                onMouseEnter={() => router.prefetch(stat.href)}
              >
                <div
                  className={`group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 cursor-pointer ${
                    stat.urgent ? "ring-2 ring-red-300 animate-pulse" : ""
                  }`}
                >
                  {/* Animated background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  {/* Floating particles effect */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-full translate-y-8 -translate-x-8 group-hover:scale-150 transition-transform duration-700"></div>

                  <div className="relative p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-600 mb-3 tracking-wide uppercase">
                          {stat.title}
                        </p>
                        <p className="text-4xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors duration-300">
                          {stat.value}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">
                          {stat.description}
                        </p>
                      </div>
                      <div
                        className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg group-hover:shadow-xl`}
                      >
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-emerald-600 font-medium">
                          Aktif
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Today's Tasks & Projects */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Today's Tasks */}
          <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-xl">
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 md:p-8">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div className="absolute top-4 right-4 w-1 h-1 bg-white rounded-full"></div>
                <div className="absolute bottom-3 left-6 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div className="absolute bottom-6 right-2 w-1 h-1 bg-white rounded-full"></div>
              </div>

              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      Tugas Hari Ini
                    </h3>
                    <p className="text-emerald-100 text-sm font-medium">
                      Tugas untuk hari ini dan pekan ini
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-lg px-4 py-2">
                  {today_tasks.length}
                </Badge>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-4 md:space-y-6">
              {today_tasks.length > 0 ? (
                <>
                  {today_tasks.map((task, index) => {
                    const allocatedDays =
                      task.transport_allocations?.filter(
                        (alloc) => alloc.allocation_date && !alloc.canceled_at,
                      ).length || 0;
                    const needsTransportDate =
                      task.has_transport && allocatedDays === 0;
                    const isOverdue =
                      new Date(task.end_date) < new Date() &&
                      task.status !== "completed";

                    return (
                      <div
                        key={index}
                        className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 transform hover:scale-105 hover:shadow-xl ${
                          task.status === "completed"
                            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                            : task.status === "in_progress"
                              ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200"
                              : needsTransportDate
                                ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                                : isOverdue
                                  ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
                                  : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 hover:border-emerald-300 hover:from-emerald-50 hover:to-green-50"
                        }`}
                      >
                        {/* Animated background effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge
                                  className={
                                    task.status === "completed"
                                      ? "bg-green-100 text-green-800"
                                      : task.status === "in_progress"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-gray-100 text-gray-800"
                                  }
                                >
                                  {task.status.toUpperCase()}
                                </Badge>

                                {task.has_transport && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    <DollarSign className="w-3 h-3 mr-1" />
                                    Transport
                                  </Badge>
                                )}

                                {needsTransportDate && (
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 animate-pulse">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Date Needed
                                  </Badge>
                                )}

                                {isOverdue && (
                                  <Badge className="bg-red-100 text-red-800 border-red-200">
                                    OVERDUE
                                  </Badge>
                                )}
                              </div>

                              <div
                                className={`font-semibold mb-2 ${
                                  task.status === "completed"
                                    ? "text-green-800 line-through"
                                    : task.status === "in_progress"
                                      ? "text-blue-800"
                                      : "text-gray-900"
                                }`}
                              >
                                {task.title}
                              </div>

                              <div className="text-sm text-gray-600 mb-2">
                                Proyek: {task.project_name}
                              </div>

                              <div className="text-sm text-gray-500">
                                {new Date(task.start_date).toLocaleDateString(
                                  "id-ID",
                                )}{" "}
                                -{" "}
                                {new Date(task.end_date).toLocaleDateString(
                                  "id-ID",
                                )}
                              </div>

                              {task.response_pegawai && (
                                <div className="text-sm text-gray-500 bg-white p-2 rounded border mt-2">
                                  <strong>Respon:</strong>{" "}
                                  {task.response_pegawai}
                                </div>
                              )}
                            </div>

                            <div className="ml-4 flex flex-col space-y-2">
                              {needsTransportDate ? (
                                <Button
                                  size="sm"
                                  asChild
                                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white animate-pulse"
                                >
                                  <Link
                                    href={`/pegawai/tasks/${task.id}/transport`}
                                  >
                                    <MapPin className="w-3 h-3 mr-1" />
                                    Pilih Tanggal
                                  </Link>
                                </Button>
                              ) : (
                                task.has_transport && (
                                  <Button
                                    size="sm"
                                    asChild
                                    variant="outline"
                                    className="border-green-300 text-green-700 hover:bg-green-50"
                                  >
                                    <Link
                                      href={`/pegawai/tasks/${task.id}/transport`}
                                    >
                                      <Calendar className="w-3 h-3 mr-1" />
                                      Ubah Tanggal
                                    </Link>
                                  </Button>
                                )
                              )}

                              {task.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleTaskStatusUpdate(
                                      task.id,
                                      "in_progress",
                                    )
                                  }
                                  disabled={updatingTask === task.id}
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Mulai
                                </Button>
                              )}

                              {task.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const response = prompt(
                                      "Tambahkan respon Anda (opsional):",
                                    );
                                    handleTaskStatusUpdate(
                                      task.id,
                                      "completed",
                                      response || undefined,
                                    );
                                  }}
                                  disabled={updatingTask === task.id}
                                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                                >
                                  <CheckSquare className="w-3 h-3 mr-1" />
                                  Selesaikan
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-4">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-2 border-green-200 text-green-600 hover:bg-green-50"
                    >
                      <Link href="/pegawai/tasks">
                        Lihat Semua Tugas Saya
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">
                    Tidak ada tugas hari ini!
                  </p>
                  <p className="text-sm text-gray-400">
                    Nikmati waktu luang Anda
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* My Projects */}
          <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-xl">
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 md:p-8">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div className="absolute top-4 right-4 w-1 h-1 bg-white rounded-full"></div>
                <div className="absolute bottom-3 left-6 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div className="absolute bottom-6 right-2 w-1 h-1 bg-white rounded-full"></div>
              </div>

              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      Proyek Saya
                    </h3>
                    <p className="text-blue-100 text-sm font-medium">
                      Proyek yang saya ikuti
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-lg px-4 py-2">
                  {assigned_projects.length}
                </Badge>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-4 md:space-y-6">
              {assigned_projects.length > 0 ? (
                <>
                  {assigned_projects.map((project, index) => (
                    <Link
                      key={index}
                      href={`/pegawai/projects/${project.id}`}
                      prefetch
                      onMouseEnter={() =>
                        router.prefetch(`/pegawai/projects/${project.id}`)
                      }
                    >
                      <div className="group flex items-center p-6 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-gray-100 hover:border-blue-200 hover:shadow-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {project.nama_project}
                            </div>
                            <Badge
                              className={
                                project.user_role === "leader"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }
                            >
                              {project.user_role === "leader"
                                ? "KETUA"
                                : "ANGGOTA"}
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-500 group-hover:text-blue-500 mt-1">
                            Ketua: {project.ketua_tim_name}
                          </div>

                          <div className="text-sm text-gray-400 mt-1">
                            Tenggat:{" "}
                            {new Date(project.deadline).toLocaleDateString(
                              "id-ID",
                            )}
                          </div>

                          <div className="mt-2 flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${project.my_progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-600">
                              {project.my_progress}%
                            </span>
                          </div>
                        </div>

                        <div className="ml-4">
                          <Badge
                            className={
                              project.status === "active"
                                ? "bg-green-100 text-green-800"
                                : project.status === "upcoming"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }
                          >
                            {project.status === "active"
                              ? "AKTIF"
                              : project.status === "upcoming"
                                ? "SEGERA"
                                : "SELESAI"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}

                  <div className="pt-4">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Link
                        href="/pegawai/projects"
                        prefetch
                        onMouseEnter={() =>
                          router.prefetch("/pegawai/projects")
                        }
                      >
                        Lihat Semua Proyek Saya
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Belum ada proyek</p>
                  <p className="text-sm text-gray-400">
                    Tunggu penugasan proyek
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-2xl mt-8">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full"></div>
            <div className="absolute top-8 right-8 w-1 h-1 bg-white rounded-full"></div>
            <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-white rounded-full"></div>
            <div className="absolute bottom-12 right-4 w-2 h-2 bg-white rounded-full"></div>
            <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-white rounded-full"></div>
            <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>

          {/* Floating elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 animate-pulse"></div>
          <div
            className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16 animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 w-24 h-24 bg-white/5 rounded-full -translate-x-12 -translate-y-12 animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>

          <div className="relative p-8 md:p-12">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ikhtisar Kinerja
              </h2>
              <p className="text-emerald-100 text-base md:text-lg">
                Metrik produktivitas Anda secara ringkas
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 text-center">
              <div className="group space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Target className="w-8 h-8" />
                  </div>
                </div>
                <div className="text-4xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {stats.completed_tasks > 0 && stats.pending_tasks > 0
                    ? Math.round(
                        (stats.completed_tasks /
                          (stats.completed_tasks + stats.pending_tasks)) *
                          100,
                      )
                    : stats.completed_tasks > 0
                      ? 100
                      : 0}
                  %
                </div>
                <div className="text-emerald-100 text-sm font-medium">
                  Tingkat penyelesaian tugas
                </div>
              </div>

              <div className="group space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                </div>
                <div className="text-4xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {assigned_projects.length > 0
                    ? Math.round(
                        assigned_projects.reduce(
                          (acc, p) => acc + p.my_progress,
                          0,
                        ) / assigned_projects.length,
                      )
                    : 0}
                  %
                </div>
                <div className="text-emerald-100 text-sm font-medium">
                  Rata-rata progres proyek
                </div>
              </div>

              <div className="group space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Award className="w-8 h-8" />
                  </div>
                </div>
                <div className="text-4xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {stats.total_projects}
                </div>
                <div className="text-emerald-100 text-sm font-medium">
                  Proyek aktif
                </div>
              </div>

              <div className="group space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-8 h-8" />
                  </div>
                </div>
                <div className="text-4xl font-bold group-hover:scale-110 transition-transform duration-300">
                  {formatCurrency(stats.transport_earnings || 0)}
                </div>
                <div className="text-emerald-100 text-sm font-medium">
                  Transport bulanan
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// File: src/components/ketua-tim/MemberDetail.tsx

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  User,
  Calendar,
  BarChart3,
  DollarSign,
  FolderOpen,
  ClipboardList,
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Download,
  Target,
  Activity,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { LineChart, BarChart, PieChart } from "@/components/charts";

interface MemberDetailData {
  personal_info: {
    id: string;
    nama_lengkap: string;
    email: string;
    no_telepon: string | null;
    alamat: string | null;
    nip: string | null;
    is_active: boolean;
    created_at: string;
  };
  current_projects: Array<{
    id: string;
    nama_project: string;
    status: "upcoming" | "active" | "completed";
    tanggal_mulai: string;
    deadline: string;
    progress: number;
    uang_transport: number;
    task_count: number;
    completed_tasks: number;
  }>;
  task_statistics: {
    total_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    average_completion_time: number;
  };
  monthly_earnings: {
    current_month: {
      total: number;
      breakdown: Array<{
        project_name: string;
        amount: number;
        date: string;
      }>;
    };
    historical: Array<{
      month: string;
      year: number;
      total: number;
    }>;
  };
  calendar_data: Array<{
    date: string;
    tasks: Array<{
      id: string;
      deskripsi_tugas: string;
      status: string;
      project_name: string;
    }>;
    projects: Array<{
      id: string;
      nama_project: string;
      status: string;
      is_start_date: boolean;
      is_end_date: boolean;
    }>;
  }>;
  performance_metrics: {
    task_completion_trend: Array<{
      date: string;
      completed: number;
      pending: number;
    }>;
    project_participation: Array<{
      project_name: string;
      participation_percentage: number;
      tasks_completed: number;
      total_tasks: number;
    }>;
    monthly_productivity: Array<{
      month: string;
      tasks_completed: number;
      earnings: number;
    }>;
  };
}

interface MemberDetailProps {
  memberId: string;
}

export default function MemberDetail({ memberId }: MemberDetailProps) {
  const router = useRouter();
  const [selectedCalendarMonth, setSelectedCalendarMonth] = React.useState(
    new Date(),
  );

  const fetchMemberDetailRequest = async (): Promise<MemberDetailData> => {
    // Use debug endpoint for now
    const response = await fetch(`/api/debug-member-detail/${memberId}`, {
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Failed to fetch member data");
    return result.data as MemberDetailData;
  };

  const {
    data: memberData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<MemberDetailData, Error>({
    queryKey: ["ketua", "team", "member", memberId],
    queryFn: fetchMemberDetailRequest,
    staleTime: 5 * 60 * 1000,
  });

  const refreshing = isFetching;
  const handleRefresh = async () => {
    const res = await refetch();
    if (res.error) toast.error(res.error.message);
    else toast.success("Member data refreshed");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "upcoming":
        return Clock;
      case "active":
        return Activity;
      case "completed":
        return CheckCircle;
      case "pending":
        return Clock;
      case "in_progress":
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const generateCalendarDays = () => {
    const year = selectedCalendarMonth.getFullYear();
    const month = selectedCalendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const calendarEntry = memberData?.calendar_data.find(
        (entry) => entry.date === dateStr,
      );

      days.push({
        date: new Date(currentDate),
        dateStr,
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: dateStr === new Date().toISOString().split("T")[0],
        tasks: calendarEntry?.tasks || [],
        projects: calendarEntry?.projects || [],
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <div className="h-12 bg-gray-200 rounded-xl w-24 animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
  if (error && !memberData) {
    const message = error instanceof Error ? error.message : String(error);
    const isNotFound = /not\s*found/i.test(message);
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle
              className={`w-16 h-16 mx-auto ${isNotFound ? "text-gray-400" : "text-red-500"}`}
            />
            <h2 className="text-2xl font-bold text-gray-900">
              {isNotFound
                ? "Anggota Tidak Ditemukan"
                : "Gagal Memuat Data Anggota"}
            </h2>
            <p className="text-gray-600 max-w-md">
              {isNotFound
                ? "Anggota yang Anda cari tidak ditemukan. Pastikan ID valid atau pilih dari daftar tim."
                : message}
            </p>
            {!isNotFound && (
              <Button
                onClick={handleRefresh}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Coba Lagi
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!memberData) return null;

  const {
    personal_info,
    current_projects,
    task_statistics,
    monthly_earnings,
    performance_metrics,
  } = memberData;

  // Prepare chart data
  const taskTrendData = performance_metrics.task_completion_trend.map(
    (trend) => ({
      date: new Date(trend.date).toLocaleDateString("id-ID", {
        month: "short",
        day: "numeric",
      }),
      Selesai: trend.completed,
      Menunggu: trend.pending,
    }),
  );

  const projectParticipationData =
    performance_metrics.project_participation.map((project) => ({
      name:
        project.project_name.length > 15
          ? project.project_name.substring(0, 15) + "..."
          : project.project_name,
      completion: project.participation_percentage,
      tasks: project.total_tasks,
    }));

  const monthlyProductivityData = performance_metrics.monthly_productivity.map(
    (month) => ({
      month: month.month,
      tasks: month.tasks_completed,
      earnings: month.earnings / 1000000, // Convert to millions for chart readability
    }),
  );

  const taskDistributionData = [
    {
      name: "Selesai",
      value: task_statistics.completed_tasks,
      color: "#10B981",
    },
    {
      name: "Sedang Berjalan",
      value: task_statistics.in_progress_tasks,
      color: "#3B82F6",
    },
    {
      name: "Menunggu",
      value: task_statistics.pending_tasks,
      color: "#F59E0B",
    },
  ];

  const earningsHistoryData = monthly_earnings.historical.map((history) => ({
    month: history.month,
    earnings: history.total, // Keep original values for better chart display
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Tim
          </Button>

          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-2xl">
                {personal_info.nama_lengkap.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {personal_info.nama_lengkap}
              </h1>
              <p className="text-gray-600 text-lg">
                Profil & Analitik Anggota Tim
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-2 border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Muat Ulang
          </Button>

          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            <Download className="w-4 h-4 mr-2" />
            Ekspor Laporan
          </Button>
        </div>
      </div>

      {/* Personal Info Card */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex items-center text-white text-xl font-semibold">
            <User className="w-6 h-6 mr-3" />
            Informasi Pribadi
          </div>
          <div className="text-indigo-100 mt-2 text-sm">
            Detail kontak dan informasi akun
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Email</div>
                <div className="font-semibold text-gray-900">
                  {personal_info.email}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Telepon</div>
                <div className="font-semibold text-gray-900">
                  {personal_info.no_telepon || "Tidak disediakan"}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Alamat</div>
                <div className="font-semibold text-gray-900">
                  {personal_info.alamat || "Tidak disediakan"}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">NIP</div>
                <div className="font-semibold text-gray-900">
                  {personal_info.nip || "Tidak disediakan"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Anggota Sejak
                </div>
                <div className="font-semibold text-gray-900">
                  {new Date(personal_info.created_at).toLocaleDateString(
                    "id-ID",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </div>
              </div>
              <Badge
                className={
                  personal_info.is_active
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {personal_info.is_active ? "Aktif" : "Tidak Aktif"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 opacity-50 absolute inset-0"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Proyek Aktif
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {current_projects.length}
                </p>
                <p className="text-sm text-gray-500">Sedang ditugaskan</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FolderOpen className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-br from-green-50 to-green-100 opacity-50 absolute inset-0"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Tingkat Penyelesaian
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {task_statistics.completion_rate}%
                </p>
                <p className="text-sm text-gray-500">
                  Tingkat keberhasilan tugas
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 opacity-50 absolute inset-0"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Total Tugas
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {task_statistics.total_tasks}
                </p>
                <p className="text-sm text-gray-500">Tugas sepanjang waktu</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ClipboardList className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 opacity-50 absolute inset-0"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Pendapatan Bulanan
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatCurrency(monthly_earnings.current_month.total)}
                </p>
                <p className="text-sm text-gray-500">Bulan ini</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="projects">Proyek</TabsTrigger>
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
          <TabsTrigger value="earnings">Pendapatan</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Task Statistics */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
                <div className="flex items-center text-white text-xl font-semibold">
                  <BarChart3 className="w-6 h-6 mr-3" />
                  Distribusi Tugas
                </div>
                <div className="text-green-100 mt-2 text-sm">
                  Rincian status tugas saat ini
                </div>
              </div>
              <div className="p-6">
                <PieChart
                  data={taskDistributionData}
                  dataKey="value"
                  nameKey="name"
                  colors={["#10B981", "#3B82F6", "#F59E0B"]}
                  height={250}
                />

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {task_statistics.completed_tasks}
                    </div>
                    <div className="text-sm text-green-700">Selesai</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      {task_statistics.in_progress_tasks}
                    </div>
                    <div className="text-sm text-blue-700">Sedang Berjalan</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-xl font-bold text-yellow-600">
                      {task_statistics.pending_tasks}
                    </div>
                    <div className="text-sm text-yellow-700">Menunggu</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                <div className="flex items-center text-white text-xl font-semibold">
                  <Award className="w-6 h-6 mr-3" />
                  Metrik Performa
                </div>
                <div className="text-purple-100 mt-2 text-sm">
                  Indikator kinerja utama
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {task_statistics.completion_rate}%
                    </div>
                    <div className="text-sm text-blue-700">
                      Tingkat Keberhasilan
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border border-green-100">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {task_statistics.average_completion_time}
                    </div>
                    <div className="text-sm text-green-700">Rata-rata Hari</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Performa Keseluruhan
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {task_statistics.completion_rate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${task_statistics.completion_rate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Aktif Sejak</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(personal_info.created_at).toLocaleDateString(
                        "id-ID",
                        {
                          year: "numeric",
                          month: "long",
                        },
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white text-xl font-semibold">
                  <FolderOpen className="w-6 h-6 mr-3" />
                  Proyek Saat Ini
                </div>
                <Badge className="bg-white/20 text-white">
                  {current_projects.length} Aktif
                </Badge>
              </div>
              <div className="text-blue-100 mt-2 text-sm">
                Proyek yang sedang ditugaskan kepada anggota ini
              </div>
            </div>
            <div className="p-6">
              {current_projects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Tidak Ada Proyek Aktif
                  </h3>
                  <p className="text-gray-500">
                    Anggota ini saat ini tidak ditugaskan ke proyek manapun.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {current_projects.map((project) => {
                    const StatusIcon = getStatusIcon(project.status);
                    const daysUntilDeadline = Math.ceil(
                      (new Date(project.deadline).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24),
                    );

                    return (
                      <div
                        key={project.id}
                        className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-900 text-lg">
                            {project.nama_project}
                          </h4>
                          <Badge
                            className={`${getStatusColor(project.status)} border flex items-center space-x-1`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{project.status.toUpperCase()}</span>
                          </Badge>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Tanggal Mulai</div>
                              <div className="font-semibold">
                                {new Date(
                                  project.tanggal_mulai,
                                ).toLocaleDateString("id-ID")}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Jatuh Tempo</div>
                              <div
                                className={`font-semibold ${daysUntilDeadline < 7 ? "text-red-600" : "text-gray-900"}`}
                              >
                                {new Date(project.deadline).toLocaleDateString(
                                  "id-ID",
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Tugas Saya</div>
                              <div className="font-semibold">
                                {project.completed_tasks}/{project.task_count}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Transport</div>
                              <div className="font-semibold text-green-600">
                                {formatCurrency(project.uang_transport)}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600">
                                Progres Saya
                              </span>
                              <span className="font-semibold text-gray-900">
                                {project.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          {daysUntilDeadline < 7 && daysUntilDeadline > 0 && (
                            <div className="flex items-center text-red-600 text-sm">
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              <span>
                                Jatuh tempo dalam {daysUntilDeadline} hari
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white text-xl font-semibold">
                  <Calendar className="w-6 h-6 mr-3" />
                  Jadwal Kerja
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(selectedCalendarMonth);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setSelectedCalendarMonth(newDate);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    ←
                  </Button>
                  <span className="text-white font-semibold min-w-[120px] text-center">
                    {selectedCalendarMonth.toLocaleDateString("id-ID", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(selectedCalendarMonth);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedCalendarMonth(newDate);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    →
                  </Button>
                </div>
              </div>
              <div className="text-teal-100 mt-2 text-sm">
                Tasks, deadlines, and project timeline
              </div>
            </div>
            <div className="p-6">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-semibold text-gray-600 p-2"
                    >
                      {day}
                    </div>
                  ),
                )}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 border rounded-lg transition-all duration-200 ${
                      day.isCurrentMonth
                        ? day.isToday
                          ? "bg-blue-100 border-blue-300 shadow-md"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        : "bg-gray-50 border-gray-100 text-gray-400"
                    }`}
                  >
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        day.isToday
                          ? "text-blue-600"
                          : day.isCurrentMonth
                            ? "text-gray-900"
                            : "text-gray-400"
                      }`}
                    >
                      {day.date.getDate()}
                    </div>

                    {/* Project markers */}
                    {day.projects.map((project) => (
                      <div
                        key={`project-${project.id}`}
                        className={`text-xs p-1 rounded mb-1 ${
                          project.is_start_date
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                        title={`${project.nama_project} - ${project.is_start_date ? "Start" : "Deadline"}`}
                      >
                        {project.is_start_date ? "🚀" : "🏁"}{" "}
                        {project.nama_project.substring(0, 8)}...
                      </div>
                    ))}

                    {/* Task markers */}
                    {day.tasks.map((task) => (
                      <div
                        key={`task-${task.id}`}
                        className={`text-xs p-1 rounded mb-1 ${
                          task.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : task.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                        title={`${task.deskripsi_tugas} - ${task.project_name}`}
                      >
                        📋 {task.deskripsi_tugas.substring(0, 10)}...
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Calendar Legend */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                    <span>Project Start</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                    <span>Project Deadline</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                    <span>Pending Task</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                    <span>Active Task</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Current Month Breakdown */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-white text-xl font-semibold">
                    <DollarSign className="w-6 h-6 mr-3" />
                    This Month
                  </div>
                  <div className="text-white text-2xl font-bold">
                    {formatCurrency(monthly_earnings.current_month.total)}
                  </div>
                </div>
                <div className="text-green-100 mt-2 text-sm">
                  Current month earnings breakdown
                </div>
              </div>
              <div className="p-6">
                {monthly_earnings.current_month.breakdown.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No earnings this month</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {monthly_earnings.current_month.breakdown.map(
                      (earning, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                        >
                          <div>
                            <div className="font-semibold text-gray-900">
                              {earning.project_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(earning.date).toLocaleDateString(
                                "id-ID",
                              )}
                            </div>
                          </div>
                          <div className="font-bold text-green-600">
                            {formatCurrency(earning.amount)}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Historical Earnings */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-violet-600 p-6">
                <div className="flex items-center text-white text-xl font-semibold">
                  <TrendingUp className="w-6 h-6 mr-3" />
                  Riwayat Pendapatan
                </div>
                <div className="text-purple-100 mt-2 text-sm">
                  Tren pendapatan 6 bulan
                </div>
              </div>
              <div className="p-6">
                <LineChart
                  data={earningsHistoryData}
                  xAxisKey="month"
                  height={250}
                  lines={[
                    {
                      dataKey: "earnings",
                      stroke: "#8B5CF6",
                      name: "Pendapatan (Rp)",
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Task Completion Trend */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
                <div className="flex items-center text-white text-xl font-semibold">
                  <TrendingUp className="w-6 h-6 mr-3" />
                  Tren Penyelesaian Tugas
                </div>
                <div className="text-blue-100 mt-2 text-sm">
                  Penyelesaian tugas harian selama 30 hari terakhir
                </div>
              </div>
              <div className="p-6">
                <LineChart
                  data={taskTrendData}
                  xAxisKey="date"
                  height={300}
                  lines={[
                    {
                      dataKey: "Completed",
                      stroke: "#10B981",
                      name: "Tugas Selesai",
                    },
                    {
                      dataKey: "Pending",
                      stroke: "#F59E0B",
                      name: "Tugas Menunggu",
                    },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Project Participation */}
              <div className="border-0 shadow-xl rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
                  <div className="flex items-center text-white text-xl font-semibold">
                    <BarChart3 className="w-6 h-6 mr-3" />
                    Partisipasi Proyek
                  </div>
                  <div className="text-indigo-100 mt-2 text-sm">
                    Tingkat penyelesaian per proyek
                  </div>
                </div>
                <div className="p-6">
                  <BarChart
                    data={projectParticipationData}
                    xAxisKey="name"
                    height={250}
                    bars={[
                      {
                        dataKey: "completion",
                        fill: "#8B5CF6",
                        name: "Penyelesaian %",
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Monthly Productivity */}
              <div className="border-0 shadow-xl rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
                  <div className="flex items-center text-white text-xl font-semibold">
                    <Activity className="w-6 h-6 mr-3" />
                    Monthly Productivity
                  </div>
                  <div className="text-emerald-100 mt-2 text-sm">
                    Tasks completed and earnings over time
                  </div>
                </div>
                <div className="p-6">
                  <BarChart
                    data={monthlyProductivityData}
                    xAxisKey="month"
                    height={250}
                    bars={[
                      {
                        dataKey: "tasks",
                        fill: "#10B981",
                        name: "Tasks Completed",
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

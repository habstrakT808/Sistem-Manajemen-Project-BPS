// File: src/components/ketua-tim/KetuaTimDashboard.tsx (Updated)

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
  FolderOpen,
  Users,
  ClipboardList,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  Target,
  Zap,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface DashboardStats {
  my_projects: number;
  active_projects: number;
  team_members: number;
  pending_tasks: number;
  monthly_budget: number;
}

interface ProjectSummary {
  id: string;
  nama_project: string;
  status: "upcoming" | "active" | "completed";
  deadline: string;
  progress: number;
  team_size: number;
  created_at: string;
}

interface TaskSummary {
  id: string;
  deskripsi_tugas: string;
  pegawai_name: string;
  tanggal_tugas: string;
  status: "pending" | "in_progress" | "completed";
  project_name: string;
}

interface DashboardData {
  stats: DashboardStats;
  recent_projects: ProjectSummary[];
  pending_tasks: TaskSummary[];
  period_days: number;
}

async function fetchKetuaDashboard(period: string): Promise<DashboardData> {
  const response = await fetch(`/api/ketua-tim/dashboard?period=${period}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch dashboard data");
  }
  return result as DashboardData;
}

export default function KetuaTimDashboard() {
  const router = useRouter();
  const [period, setPeriod] = useState("30");

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<DashboardData, Error>({
    queryKey: ["ketua", "dashboard", { period }],
    queryFn: () => fetchKetuaDashboard(period),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    const res = await refetch();
    if (res.error) toast.error(res.error.message);
    else toast.success("Dashboard data refreshed");
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  useEffect(() => {
    router.prefetch("/ketua-tim/projects");
    router.prefetch("/ketua-tim/team");
    router.prefetch("/ketua-tim/tasks");
    router.prefetch("/ketua-tim/financial");
  }, [router]);

  if (isLoading && !dashboardData) {
    return (
      <div className="space-y-8">
        {/* keep existing skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="flex space-x-4">
            <div className="h-12 bg-gray-200 rounded-xl w-32 animate-pulse"></div>
            <div className="h-12 bg-gray-200 rounded-xl w-32 animate-pulse"></div>
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

  if (error && !dashboardData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Failed to Load Dashboard
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

  if (!dashboardData) return null;

  const { stats, recent_projects, pending_tasks } = dashboardData;

  const statsCards = [
    {
      title: "My Projects",
      value: stats.my_projects,
      description: `${stats.active_projects} currently active`,
      icon: FolderOpen,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      href: "/ketua-tim/projects",
      change: `${stats.active_projects}/${stats.my_projects}`,
      changeType: "neutral" as const,
    },
    {
      title: "Team Members",
      value: stats.team_members,
      description: "Active team members",
      icon: Users,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      href: "/ketua-tim/team",
      change: `${stats.team_members}`,
      changeType: "positive" as const,
    },
    {
      title: "Pending Tasks",
      value: stats.pending_tasks,
      description: "Tasks awaiting completion",
      icon: ClipboardList,
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
      href: "/ketua-tim/tasks",
      change: `${pending_tasks.length} urgent`,
      changeType: stats.pending_tasks > 10 ? "negative" : ("neutral" as const),
    },
    {
      title: "Monthly Budget",
      value: formatCurrency(stats.monthly_budget),
      description: "Current month allocation",
      icon: DollarSign,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      href: "/ketua-tim/financial",
      change: "This month",
      changeType: "positive" as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Ketua Tim Dashboard
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Welcome back! Here&apos;s your project overview and team status.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
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

          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Link
              href="/ketua-tim/projects/new"
              prefetch
              onMouseEnter={() => router.prefetch("/ketua-tim/projects/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Link>
          </Button>

          <Button
            variant="outline"
            asChild
            className="border-2 border-green-200 text-green-600 hover:bg-green-50 font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:border-green-300"
          >
            <Link
              href="/ketua-tim/team"
              prefetch
              onMouseEnter={() => router.prefetch("/ketua-tim/team")}
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Team
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon as any;
          return (
            <Link
              key={index}
              href={stat.href}
              prefetch
              onMouseEnter={() => router.prefetch(stat.href)}
            >
              <div className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden rounded-xl">
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
                      <p className="text-sm text-gray-500">
                        {stat.description}
                      </p>
                    </div>
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                    >
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span
                        className={`text-sm font-semibold ${stat.changeType === "positive" ? "text-green-600" : stat.changeType === "negative" ? "text-red-600" : "text-blue-600"}`}
                      >
                        {stat.change}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Projects & Pending Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white text-xl font-semibold">
                <FolderOpen className="w-6 h-6 mr-3" />
                Recent Projects
              </div>
              <Badge className="bg-white/20 text-white">
                {recent_projects.length}
              </Badge>
            </div>
            <div className="text-blue-100 mt-2 text-sm">
              Your latest project activities
            </div>
          </div>
          <div className="p-6 space-y-4">
            {recent_projects.length > 0 ? (
              <>
                {recent_projects.map((project, index) => (
                  <Link
                    key={index}
                    href={`/ketua-tim/projects/${project.id}`}
                    prefetch
                    onMouseEnter={() =>
                      router.prefetch(`/ketua-tim/projects/${project.id}`)
                    }
                  >
                    <div className="group flex items-center p-4 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-gray-100 hover:border-blue-200 hover:shadow-lg">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {project.nama_project}
                        </div>
                        <div className="text-sm text-gray-500 group-hover:text-blue-500 mt-1">
                          Deadline:{" "}
                          {new Date(project.deadline).toLocaleDateString(
                            "id-ID",
                          )}{" "}
                          • {project.team_size} members
                        </div>
                        <div className="mt-2 flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-600">
                            {project.progress}%
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Badge
                          className={`${project.status === "active" ? "bg-green-100 text-green-800" : project.status === "upcoming" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {project.status.toUpperCase()}
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
                      href="/ketua-tim/projects"
                      prefetch
                      onMouseEnter={() =>
                        router.prefetch("/ketua-tim/projects")
                      }
                    >
                      View All Projects
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No recent projects</p>
                <Button asChild size="sm">
                  <Link
                    href="/ketua-tim/projects/new"
                    prefetch
                    onMouseEnter={() =>
                      router.prefetch("/ketua-tim/projects/new")
                    }
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Project
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white text-xl font-semibold">
                <ClipboardList className="w-6 h-6 mr-3" />
                Urgent Tasks
              </div>
              <Badge className="bg-white/20 text-white">
                {pending_tasks.length}
              </Badge>
            </div>
            <div className="text-orange-100 mt-2 text-sm">
              Tasks due within 7 days
            </div>
          </div>
          <div className="p-6 space-y-4">
            {pending_tasks.length > 0 ? (
              <>
                {pending_tasks.map((task, index) => {
                  const isOverdue = new Date(task.tanggal_tugas) < new Date();
                  return (
                    <div
                      key={index}
                      className={`group flex items-center p-4 rounded-2xl hover:bg-gradient-to-r transition-all duration-300 transform hover:scale-105 cursor-pointer border hover:shadow-lg ${isOverdue ? "border-red-200 hover:from-red-50 hover:to-red-100 hover:border-red-300" : "border-gray-100 hover:from-gray-50 hover:to-orange-50 hover:border-orange-200"}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 ${isOverdue ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-orange-500 to-red-500"}`}
                      >
                        {isOverdue ? (
                          <AlertCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Clock className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`font-semibold transition-colors ${isOverdue ? "text-red-900 group-hover:text-red-700" : "text-gray-900 group-hover:text-orange-600"}`}
                        >
                          {task.deskripsi_tugas}
                        </div>
                        <div
                          className={`text-sm mt-1 transition-colors ${isOverdue ? "text-red-600 group-hover:text-red-500" : "text-gray-500 group-hover:text-orange-500"}`}
                        >
                          {task.pegawai_name} • {task.project_name}
                        </div>
                        <div
                          className={`text-sm mt-1 font-medium ${isOverdue ? "text-red-700" : "text-gray-400"}`}
                        >
                          {isOverdue ? "OVERDUE: " : "Due: "}
                          {new Date(task.tanggal_tugas).toLocaleDateString(
                            "id-ID",
                          )}
                        </div>
                      </div>
                      <Badge
                        className={
                          isOverdue
                            ? "bg-red-100 text-red-800"
                            : "bg-orange-100 text-orange-800"
                        }
                      >
                        {isOverdue ? "OVERDUE" : task.status.toUpperCase()}
                      </Badge>
                    </div>
                  );
                })}
                <div className="pt-4">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    <Link
                      href="/ketua-tim/tasks"
                      prefetch
                      onMouseEnter={() => router.prefetch("/ketua-tim/tasks")}
                    >
                      View All Tasks
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No urgent tasks!</p>
                <p className="text-sm text-gray-400">All tasks are on track</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Overview (unchanged) */}
      <div className="border-0 shadow-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white overflow-hidden rounded-xl">
        <div className="p-8">
          <div className="grid md:grid-cols-4 gap-8 text-center relative">
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Target className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">
                {recent_projects.length > 0
                  ? Math.round(
                      recent_projects.reduce((acc, p) => acc + p.progress, 0) /
                        recent_projects.length,
                    )
                  : 0}
                %
              </div>
              <div className="text-purple-100 text-sm">
                Average project progress
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">
                {stats.team_members > 0
                  ? Math.round(
                      (stats.team_members / Math.max(stats.my_projects, 1)) *
                        100,
                    )
                  : 0}
                %
              </div>
              <div className="text-purple-100 text-sm">
                Team utilization rate
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">{stats.active_projects}</div>
              <div className="text-purple-100 text-sm">
                Active projects this month
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Zap className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">
                {pending_tasks.length === 0
                  ? "5.0"
                  : pending_tasks.length <= 3
                    ? "4.8"
                    : pending_tasks.length <= 7
                      ? "4.5"
                      : "4.0"}
              </div>
              <div className="text-purple-100 text-sm">
                Project management score
              </div>
            </div>

            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full translate-y-12 -translate-x-12"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

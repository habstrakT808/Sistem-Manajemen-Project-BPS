// File: src/components/pegawai/PegawaiDashboard.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface PegawaiDashboardStats {
  assigned_projects: number;
  active_tasks: number;
  completed_tasks: number;
  monthly_earnings: number;
  pending_reviews: number;
}

interface TodayTask {
  id: string;
  deskripsi_tugas: string;
  tanggal_tugas: string;
  status: "pending" | "in_progress" | "completed";
  project_name: string;
  response_pegawai?: string;
}

interface AssignedProject {
  id: string;
  nama_project: string;
  status: "upcoming" | "active" | "completed";
  deadline: string;
  ketua_tim_name: string;
  progress: number;
}

interface DashboardData {
  stats: PegawaiDashboardStats;
  today_tasks: TodayTask[];
  assigned_projects: AssignedProject[];
}

export default function PegawaiDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/pegawai/dashboard");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch dashboard data");
      }

      setDashboardData(result);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load dashboard data";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success("Dashboard data refreshed");
  };

  const handleTaskStatusUpdate = async (
    taskId: string,
    newStatus: "in_progress" | "completed",
    response?: string
  ) => {
    setUpdatingTask(taskId);
    try {
      const updateData: { status: string; response_pegawai?: string } = {
        status: newStatus,
      };
      if (response) {
        updateData.response_pegawai = response;
      }

      const response_api = await fetch(`/api/pegawai/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response_api.ok) {
        const error = await response_api.json();
        throw new Error(error.error || "Failed to update task");
      }

      toast.success(
        `Task ${newStatus === "completed" ? "completed" : "started"}!`
      );
      await fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task"
      );
    } finally {
      setUpdatingTask(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    };

    loadData();
  }, [fetchDashboardData]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="h-12 bg-gray-200 rounded-xl w-32 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
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
  if (error && !dashboardData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Failed to Load Dashboard
            </h2>
            <p className="text-gray-600 max-w-md">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchDashboardData().finally(() => setLoading(false));
              }}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { stats, today_tasks, assigned_projects } = dashboardData;

  const statsCards = [
    {
      title: "My Projects",
      value: stats.assigned_projects,
      description: "Projects assigned to me",
      icon: FolderOpen,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      href: "/pegawai/projects",
    },
    {
      title: "Active Tasks",
      value: stats.active_tasks,
      description: "Tasks in progress",
      icon: ClipboardList,
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
      href: "/pegawai/tasks?status=pending",
    },
    {
      title: "Completed",
      value: stats.completed_tasks,
      description: "Tasks completed",
      icon: CheckCircle,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      href: "/pegawai/tasks?status=completed",
    },
    {
      title: "Monthly Earnings",
      value: formatCurrency(stats.monthly_earnings),
      description: "This month's earnings",
      icon: DollarSign,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      href: "/pegawai/earnings",
    },
    {
      title: "Pending Reviews",
      value: stats.pending_reviews,
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
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              My Workspace
            </h1>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className="bg-gradient-to-r from-green-500 to-teal-600 text-white border-0">
                <Leaf className="w-3 h-3 mr-1" />
                Pegawai Access
              </Badge>
              <Badge className="bg-white text-green-600 border border-green-200">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-600">
                Productive Day!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            My Dashboard
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            {todayDate} - Have a productive day!
          </p>
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
            Refresh
          </Button>

          <Button
            asChild
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Link href="/pegawai/tasks">
              <ClipboardList className="w-4 h-4 mr-2" />
              View All Tasks
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Link key={index} href={stat.href}>
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
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500">
                        {stat.description}
                      </p>
                    </div>
                    <div
                      className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Today's Tasks & My Projects */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Today's Tasks */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white text-xl font-semibold">
                <ClipboardList className="w-6 h-6 mr-3" />
                Today&apos;s Tasks
              </div>
              <Badge className="bg-white/20 text-white">
                {today_tasks.length}
              </Badge>
            </div>
            <div className="text-green-100 mt-2 text-sm">
              Tasks scheduled for today
            </div>
          </div>
          <div className="p-6 space-y-4">
            {today_tasks.length > 0 ? (
              <>
                {today_tasks.map((task, index) => (
                  <div
                    key={index}
                    className={`group p-4 rounded-2xl border transition-all duration-300 ${
                      task.status === "completed"
                        ? "bg-green-50 border-green-200"
                        : task.status === "in_progress"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200 hover:border-green-300 hover:bg-green-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div
                          className={`font-semibold mb-2 ${
                            task.status === "completed"
                              ? "text-green-800 line-through"
                              : task.status === "in_progress"
                                ? "text-blue-800"
                                : "text-gray-900"
                          }`}
                        >
                          {task.deskripsi_tugas}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          Project: {task.project_name}
                        </div>
                        {task.response_pegawai && (
                          <div className="text-sm text-gray-500 bg-white p-2 rounded border">
                            <strong>Response:</strong> {task.response_pegawai}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex flex-col space-y-2">
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
                        {task.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleTaskStatusUpdate(task.id, "in_progress")
                            }
                            disabled={updatingTask === task.id}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {task.status === "in_progress" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const response = prompt(
                                "Add your response (optional):"
                              );
                              handleTaskStatusUpdate(
                                task.id,
                                "completed",
                                response || undefined
                              );
                            }}
                            disabled={updatingTask === task.id}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                          >
                            <CheckSquare className="w-3 h-3 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-4">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-2 border-green-200 text-green-600 hover:bg-green-50"
                  >
                    <Link href="/pegawai/tasks">
                      View All My Tasks
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No tasks for today!</p>
                <p className="text-sm text-gray-400">Enjoy your free time</p>
              </div>
            )}
          </div>
        </div>

        {/* My Projects */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white text-xl font-semibold">
                <FolderOpen className="w-6 h-6 mr-3" />
                My Projects
              </div>
              <Badge className="bg-white/20 text-white">
                {assigned_projects.length}
              </Badge>
            </div>
            <div className="text-blue-100 mt-2 text-sm">
              Projects I&apos;m working on
            </div>
          </div>
          <div className="p-6 space-y-4">
            {assigned_projects.length > 0 ? (
              <>
                {assigned_projects.map((project, index) => (
                  <Link key={index} href={`/pegawai/projects/${project.id}`}>
                    <div className="group flex items-center p-4 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-gray-100 hover:border-blue-200 hover:shadow-lg">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {project.nama_project}
                        </div>
                        <div className="text-sm text-gray-500 group-hover:text-blue-500 mt-1">
                          Ketua Tim: {project.ketua_tim_name}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          Deadline:{" "}
                          {new Date(project.deadline).toLocaleDateString(
                            "id-ID"
                          )}
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
                <div className="pt-4">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Link href="/pegawai/projects">
                      View All My Projects
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No projects assigned</p>
                <p className="text-sm text-gray-400">
                  Wait for project assignments
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="border-0 shadow-xl bg-gradient-to-r from-green-600 to-teal-600 text-white overflow-hidden rounded-xl">
        <div className="p-8">
          <div className="grid md:grid-cols-4 gap-8 text-center relative">
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Target className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">
                {stats.completed_tasks > 0 && stats.active_tasks > 0
                  ? Math.round(
                      (stats.completed_tasks /
                        (stats.completed_tasks + stats.active_tasks)) *
                        100
                    )
                  : stats.completed_tasks > 0
                    ? 100
                    : 0}
                %
              </div>
              <div className="text-green-100 text-sm">Task completion rate</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">
                {assigned_projects.length > 0
                  ? Math.round(
                      assigned_projects.reduce(
                        (acc, p) => acc + p.progress,
                        0
                      ) / assigned_projects.length
                    )
                  : 0}
                %
              </div>
              <div className="text-green-100 text-sm">
                Average project progress
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Award className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">
                {stats.assigned_projects}
              </div>
              <div className="text-green-100 text-sm">Active projects</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">{today_tasks.length}</div>
              <div className="text-green-100 text-sm">Today&apos;s tasks</div>
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

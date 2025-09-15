// File: src/app/pegawai/projects/[id]/page.tsx

"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  ClipboardList,
  User,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface ProjectDetail {
  id: string;
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  status: "upcoming" | "active" | "completed";
  ketua_tim: {
    nama_lengkap: string;
    email: string;
  };
  uang_transport: number;
  my_task_stats: {
    pending: number;
    in_progress: number;
    completed: number;
    total: number;
  };
  my_progress: number;
  team_size: number;
  my_tasks: Array<{
    id: string;
    deskripsi_tugas: string;
    tanggal_tugas: string;
    status: "pending" | "in_progress" | "completed";
    response_pegawai?: string;
  }>;
  team_members: Array<{
    id: string;
    nama_lengkap: string;
    email: string;
    uang_transport: number;
  }>;
  mitra_partners: Array<{
    id: string;
    nama_mitra: string;
    jenis: string;
    honor: number;
    rating_average: number;
  }>;
}

async function fetchProjectDetailRequest(
  projectId: string
): Promise<ProjectDetail> {
  const response = await fetch(`/api/pegawai/projects/${projectId}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch project details");
  }
  return result.data;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { id } = useMemo(() => ({ id: undefined as unknown as string }), []);

  // Resolve params with a small wrapper so component stays client-only
  const [projectId, setProjectId] = useState<string | null>(null);
  React.useEffect(() => {
    let mounted = true;
    params.then((p) => {
      if (mounted) setProjectId(p.id);
    });
    return () => {
      mounted = false;
    };
  }, [params]);

  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useQuery<ProjectDetail, Error>({
    queryKey: ["pegawai", "projects", "detail", projectId],
    queryFn: () => fetchProjectDetailRequest(projectId as string),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    const res = await refetch();
    setRefreshing(false);
    if (res.error) toast.error(res.error.message);
    else toast.success("Project data refreshed");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return AlertTriangle;
      case "upcoming":
        return Clock;
      case "completed":
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Loading state
  if (isLoading || !projectId) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="animate-pulse border-0 shadow-xl rounded-xl p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="animate-pulse border-0 shadow-xl rounded-xl p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-2 border-gray-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Failed to Load Project
            </h2>
            <p className="text-gray-600 max-w-md">{error.message}</p>
            <Button
              onClick={handleRefresh}
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

  if (!project) return null;

  const StatusIcon = getStatusIcon(project.status);
  const daysUntilDeadline = Math.ceil(
    (new Date(project.deadline).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-2 border-gray-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {project.nama_project}
            </h1>
            <div className="flex items-center space-x-3 mt-2">
              <Badge
                className={`${getStatusColor(project.status)} border flex items-center space-x-1`}
              >
                <StatusIcon className="w-3 h-3" />
                <span>{project.status.toUpperCase()}</span>
              </Badge>
              <span className="text-gray-500">
                Managed by {project.ketua_tim.nama_lengkap}
              </span>
            </div>
          </div>
        </div>

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
      </div>

      {/* Project Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Info */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Target className="w-6 h-6 mr-3" />
                Project Overview
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                {project.deskripsi}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-semibold text-gray-900">
                        Start Date
                      </div>
                      <div className="text-gray-600">
                        {new Date(project.tanggal_mulai).toLocaleDateString(
                          "id-ID"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="font-semibold text-gray-900">
                        Deadline
                      </div>
                      <div
                        className={`${daysUntilDeadline < 0 ? "text-red-600 font-semibold" : "text-gray-600"}`}
                      >
                        {new Date(project.deadline).toLocaleDateString("id-ID")}
                        {daysUntilDeadline < 0
                          ? ` (${Math.abs(daysUntilDeadline)} days overdue)`
                          : daysUntilDeadline === 0
                            ? " (Due today)"
                            : ` (${daysUntilDeadline} days remaining)`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <div>
                      <div className="font-semibold text-gray-900">
                        Team Size
                      </div>
                      <div className="text-gray-600">
                        {project.team_size} members
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="font-semibold text-gray-900">
                        My Transport
                      </div>
                      <div className="text-gray-600">
                        {formatCurrency(project.uang_transport)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* My Progress */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Target className="w-6 h-6 mr-3" />
                My Contribution
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold text-gray-900">
                  Overall Progress
                </span>
                <span className="text-3xl font-bold text-green-600">
                  {project.my_progress}%
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
                <div
                  className="bg-gradient-to-r from-green-500 to-teal-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${project.my_progress}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-xl">
                  <div className="text-2xl font-bold text-yellow-600">
                    {project.my_task_stats.pending}
                  </div>
                  <div className="text-sm text-gray-600">Pending Tasks</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">
                    {project.my_task_stats.in_progress}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">
                    {project.my_task_stats.completed}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-600">
                    {project.my_task_stats.total}
                  </div>
                  <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
              <h3 className="font-bold text-white">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-3">
              <Button
                asChild
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl"
              >
                <Link href={`/pegawai/tasks?project_id=${project.id}`}>
                  <ClipboardList className="w-4 h-4 mr-2" />
                  View My Tasks
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full border-2 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl"
              >
                <Link href="/pegawai/schedule">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Schedule
                </Link>
              </Button>
            </div>
          </div>

          {/* Project Manager */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
              <h3 className="font-bold text-white">Project Manager</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {project.ketua_tim.nama_lengkap}
                  </div>
                  <div className="text-sm text-gray-500">
                    {project.ketua_tim.email}
                  </div>
                  <Badge className="mt-1 bg-blue-100 text-blue-700 text-xs">
                    Ketua Tim
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Project Stats */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4">
              <h3 className="font-bold text-white">Project Stats</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Team Size:</span>
                <span className="font-semibold">
                  {project.team_size} members
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">My Transport:</span>
                <span className="font-semibold">
                  {formatCurrency(project.uang_transport)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">My Tasks:</span>
                <span className="font-semibold">
                  {project.my_task_stats.total} tasks
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completion:</span>
                <span className="font-semibold text-green-600">
                  {project.my_progress}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white shadow-lg rounded-xl p-1 h-auto">
          <TabsTrigger
            value="tasks"
            className="flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
          >
            My Tasks ({project.my_task_stats.total})
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
          >
            Team Members ({project.team_members.length})
          </TabsTrigger>
          <TabsTrigger
            value="partners"
            className="flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
          >
            Partners ({project.mitra_partners.length})
          </TabsTrigger>
        </TabsList>

        {/* My Tasks Tab */}
        <TabsContent value="tasks">
          <div className="space-y-4">
            {project.my_tasks.map((task) => (
              <div
                key={task.id}
                className="border-0 shadow-lg rounded-xl p-6 bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge
                        className={`${getTaskStatusColor(task.status)} border`}
                      >
                        {task.status.replace("_", " ").toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(task.tanggal_tugas).toLocaleDateString(
                          "id-ID"
                        )}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {task.deskripsi_tugas}
                    </h4>
                    {task.response_pegawai && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <div className="text-sm font-medium text-green-900 mb-1">
                          My Response:
                        </div>
                        <div className="text-sm text-green-800">
                          {task.response_pegawai}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-green-200 text-green-600 hover:bg-green-50"
                  >
                    <Link href={`/pegawai/tasks/${task.id}`}>View Details</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Team Members Tab */}
        <TabsContent value="team">
          <div className="space-y-4">
            {project.team_members.map((member) => (
              <div
                key={member.id}
                className="border-0 shadow-lg rounded-xl p-6 bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {member.nama_lengkap}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(member.uang_transport)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Transport Allowance
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Partners Tab */}
        <TabsContent value="partners">
          <div className="space-y-4">
            {project.mitra_partners.map((partner) => (
              <div
                key={partner.id}
                className="border-0 shadow-lg rounded-xl p-6 bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {partner.nama_mitra}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {partner.jenis}
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div
                            key={star}
                            className={`w-3 h-3 rounded-full ${star <= partner.rating_average ? "bg-yellow-400" : "bg-gray-200"}`}
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-2">
                          {partner.rating_average.toFixed(1)}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(partner.honor)}
                    </div>
                    <div className="text-sm text-gray-500">Honor Fee</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

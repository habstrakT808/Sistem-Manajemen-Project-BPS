// File: src/components/ketua-tim/ProjectDetail.tsx

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Users,
  DollarSign,
  Edit,
  Trash2,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface ProjectDetailData {
  id: string;
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  status: "upcoming" | "active" | "completed";
  created_at: string;
  project_assignments?: Array<{
    id: string;
    assignee_type: "pegawai" | "mitra";
    assignee_id: string;
    uang_transport: number | null;
    honor: number | null;
    calculated_transport_total?: number; // computed on server from earnings_ledger
    calculated_honor_total?: number; // computed on server from tasks.honor_amount
    users?: { nama_lengkap: string; email: string };
    mitra?: { nama_mitra: string; jenis: string; rating_average: number };
  }>;
  project_members?: Array<{
    id: string;
    user_id: string;
    role: "leader" | "member";
    user?: { nama_lengkap: string; email: string } | null;
  }>;
  // Progress fields computed on server
  progress_overall_percent?: number;
  tasks_completed?: number;
  tasks_in_progress?: number;
  tasks_pending?: number;
}

interface ProjectDetailProps {
  projectId: string;
}

async function fetchProjectDetailRequest(
  projectId: string,
): Promise<ProjectDetailData> {
  const response = await fetch(`/api/ketua-tim/projects/${projectId}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch project");
  }
  return result.data;
}

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter();

  const {
    data: project,
    isLoading,
    error,
    refetch: _refetch,
  } = useQuery<ProjectDetailData, Error>({
    queryKey: ["ketua", "projects", "detail", projectId],
    queryFn: () => fetchProjectDetailRequest(projectId),
    staleTime: 5 * 60 * 1000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "upcoming":
        return Clock;
      case "active":
        return AlertTriangle;
      case "completed":
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const calculateTotalBudget = () => {
    if (!project) return 0;
    const assignments = project.project_assignments || [];
    return assignments.reduce((total, a) => {
      const transport = a.calculated_transport_total ?? a.uang_transport ?? 0;
      const honor = a.calculated_honor_total ?? a.honor ?? 0;
      return total + transport + honor;
    }, 0);
  };

  const getPegawaiAssignments = () => {
    if (
      project?.project_assignments &&
      project.project_assignments.length > 0
    ) {
      return project.project_assignments.filter(
        (a) => a.assignee_type === "pegawai",
      );
    }
    // Fallback to project_members (new schema)
    if (project?.project_members && project.project_members.length > 0) {
      return project.project_members
        .filter((m) => m.role === "member" || m.role === "leader")
        .map((m) => ({
          id: m.id,
          assignee_type: "pegawai" as const,
          assignee_id: m.user_id,
          uang_transport: 0,
          honor: null,
          users: m.user || undefined,
        }));
    }
    return [] as Array<{
      id: string;
      assignee_type: "pegawai";
      assignee_id: string;
      uang_transport: number | null;
      honor: number | null;
      users?: { nama_lengkap: string; email: string };
    }>;
  };

  const getMitraAssignments = () => {
    if (
      project?.project_assignments &&
      project.project_assignments.length > 0
    ) {
      return project.project_assignments.filter(
        (a) => a.assignee_type === "mitra",
      );
    }
    // No direct mapping in new schema; return empty gracefully
    return [] as Array<{
      id: string;
      assignee_type: "mitra";
      assignee_id: string;
      uang_transport: number | null;
      honor: number | null;
      mitra?: { nama_mitra: string; jenis: string; rating_average: number };
    }>;
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load project
        </h3>
        <p className="text-gray-500 mb-6">{error.message}</p>
        <Button asChild>
          <Link
            href="/ketua-tim/projects"
            prefetch
            onMouseEnter={() => router.prefetch("/ketua-tim/projects")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Project not found
        </h3>
        <p className="text-gray-500 mb-6">
          The project you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild>
          <Link
            href="/ketua-tim/projects"
            prefetch
            onMouseEnter={() => router.prefetch("/ketua-tim/projects")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(project.status);
  const pegawaiAssignments = getPegawaiAssignments();
  const mitraAssignments = getMitraAssignments();
  const totalBudget = calculateTotalBudget();

  const editHref = `/ketua-tim/projects/${project.id}/edit`;

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
            Back
          </Button>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {project.nama_project}
              </h1>
              <Badge
                className={`${getStatusColor(project.status)} border flex items-center space-x-1`}
              >
                <StatusIcon className="w-3 h-3" />
                <span>{project.status.toUpperCase()}</span>
              </Badge>
            </div>
            <p className="text-gray-600 text-lg">
              Project created on{" "}
              {new Date(project.created_at).toLocaleDateString("id-ID")}
            </p>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            asChild={project.status !== "completed"}
            variant="outline"
            className={`border-2 ${
              project.status === "completed"
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-blue-200 text-blue-600 hover:bg-blue-50"
            }`}
            disabled={project.status === "completed"}
          >
            {project.status === "completed" ? (
              <span className="flex items-center">
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </span>
            ) : (
              <Link
                href={editHref}
                prefetch
                onMouseEnter={() => router.prefetch(editHref)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </Link>
            )}
          </Button>
          <Button
            variant="outline"
            className="border-2 border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Project Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <div className="flex items-center text-white text-xl font-semibold">
              <Calendar className="w-6 h-6 mr-3" />
              Timeline
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Start Date
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date(project.tanggal_mulai).toLocaleDateString("id-ID")}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Deadline
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date(project.deadline).toLocaleDateString("id-ID")}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Duration
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {Math.ceil(
                    (new Date(project.deadline).getTime() -
                      new Date(project.tanggal_mulai).getTime()) /
                      (1000 * 60 * 60 * 24),
                  )}{" "}
                  days
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
            <div className="flex items-center text-white text-xl font-semibold">
              <Users className="w-6 h-6 mr-3" />
              Team
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Team Members
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {pegawaiAssignments.length} Pegawai
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Partners
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {mitraAssignments.length} Mitra
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Total Team Size
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {pegawaiAssignments.length + mitraAssignments.length} Members
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6">
            <div className="flex items-center text-white text-xl font-semibold">
              <DollarSign className="w-6 h-6 mr-3" />
              Budget
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Transport
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(
                    pegawaiAssignments.reduce((sum, a) => {
                      const val =
                        (a as any).calculated_transport_total ??
                        (a.uang_transport || 0);
                      return sum + val;
                    }, 0),
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Honor</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(
                    mitraAssignments.reduce((sum, a) => {
                      const val =
                        (a as any).calculated_honor_total ?? (a.honor || 0);
                      return sum + val;
                    }, 0),
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Total Budget
                </div>
                <div className="text-xl font-bold text-orange-600">
                  {formatCurrency(totalBudget)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Description */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <div className="flex items-center text-white text-xl font-semibold">
            <FileText className="w-6 h-6 mr-3" />
            Project Description
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-700 text-lg leading-relaxed">
            {project.deskripsi}
          </p>
        </div>
      </div>

      {/* Team Details */}
      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team">Team Members</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="flex items-center text-white text-xl font-semibold">
                <Users className="w-6 h-6 mr-3" />
                Team Members ({pegawaiAssignments.length})
              </div>
            </div>
            <div className="p-6">
              {pegawaiAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No team members assigned to this project.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pegawaiAssignments.map((assignment) => {
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {assignment.users?.nama_lengkap
                                ?.charAt(0)
                                .toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {assignment.users?.nama_lengkap ||
                                "Nama tidak tersedia"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assignment.users?.email ||
                                "Email tidak tersedia"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(
                              (assignment as any).calculated_transport_total ??
                                (assignment.uang_transport || 0),
                            )}
                          </div>
                          <div className="text-sm text-gray-500">Transport</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="partners" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <div className="flex items-center text-white text-xl font-semibold">
                <Users className="w-6 h-6 mr-3" />
                Partners ({mitraAssignments.length})
              </div>
            </div>
            <div className="p-6">
              {mitraAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No partners assigned to this project.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {mitraAssignments.map((assignment) => {
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {assignment.mitra?.nama_mitra
                                ?.charAt(0)
                                .toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {assignment.mitra?.nama_mitra ||
                                "Nama mitra tidak tersedia"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assignment.mitra?.jenis ||
                                "Jenis tidak tersedia"}{" "}
                              • Rating:{" "}
                              {assignment.mitra?.rating_average?.toFixed(1) ||
                                "0.0"}
                              /5
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(
                              (assignment as any).calculated_honor_total ??
                                (assignment.honor || 0),
                            )}
                          </div>
                          <div className="text-sm text-gray-500">Honor</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <div className="flex items-center text-white text-xl font-semibold">
                <TrendingUp className="w-6 h-6 mr-3" />
                Project Progress
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {`${project.progress_overall_percent ?? 0}%`}
                  </div>
                  <div className="text-gray-500">Overall Progress</div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                    <div
                      className="bg-gradient-to-r from-green-500 to-teal-500 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${project.progress_overall_percent ?? 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {project.tasks_completed ?? 0}
                    </div>
                    <div className="text-sm text-blue-700">Tasks Completed</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-xl">
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {project.tasks_in_progress ?? 0}
                    </div>
                    <div className="text-sm text-orange-700">
                      Tasks In Progress
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-600 mb-1">
                      {project.tasks_pending ?? 0}
                    </div>
                    <div className="text-sm text-gray-700">Tasks Pending</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

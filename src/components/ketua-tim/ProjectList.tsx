// File: src/components/ketua-tim/ProjectList.tsx

"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  MoreVertical,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface ProjectData {
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
    users?: { nama_lengkap: string };
    mitra?: { nama_mitra: string };
  }>;
}

interface ProjectsResponse {
  data: ProjectData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts?: {
    upcoming: number;
    active: number;
    completed: number;
  };
}

async function fetchProjectsRequest(
  page: number,
  status?: string,
): Promise<ProjectsResponse> {
  const params = new URLSearchParams({ page: page.toString(), limit: "10" });
  if (status && status !== "all") params.append("status", status);
  const response = await fetch(`/api/ketua-tim/projects?${params.toString()}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      (result.data as unknown as string) || "Failed to fetch projects",
    );
  }
  return result as ProjectsResponse;
}

export default function ProjectList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery<
    ProjectsResponse,
    Error
  >({
    queryKey: [
      "ketua",
      "projects",
      { page: currentPage, status: selectedStatus },
    ],
    queryFn: () => fetchProjectsRequest(currentPage, selectedStatus),
    placeholderData: (prev) => prev as ProjectsResponse | undefined,
    staleTime: 5 * 60 * 1000,
  });

  const _projects = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  };
  const statusCounts = data?.statusCounts || {
    upcoming: 0,
    active: 0,
    completed: 0,
  };

  useEffect(() => {
    // Prefetch next page
    if (pagination.page < (pagination.totalPages || 0)) {
      const nextPage = pagination.page + 1;
      queryClient.prefetchQuery({
        queryKey: [
          "ketua",
          "projects",
          { page: nextPage, status: selectedStatus },
        ],
        queryFn: () => fetchProjectsRequest(nextPage, selectedStatus),
      });
    }
  }, [pagination.page, pagination.totalPages, selectedStatus, queryClient]);

  const calculateProjectBudget = (
    assignments: ProjectData["project_assignments"] | undefined,
  ) => {
    const list = Array.isArray(assignments) ? assignments : [];
    const budget = list.reduce((total, assignment) => {
      const transport = assignment.uang_transport || 0;
      const honor = assignment.honor || 0;
      return total + transport + honor;
    }, 0);
    return budget;
  };

  const getTeamSummary = (
    assignments: ProjectData["project_assignments"] | undefined,
  ) => {
    const list = Array.isArray(assignments) ? assignments : [];
    const pegawaiCount = list.filter(
      (a) => a.assignee_type === "pegawai",
    ).length;
    const mitraCount = list.filter((a) => a.assignee_type === "mitra").length;
    return `${pegawaiCount} Pegawai, ${mitraCount} Mitra`;
  };

  const prefetchProjectDetail = (projectId: string) => {
    const key = ["ketua", "projects", "detail", projectId];
    queryClient.prefetchQuery({
      queryKey: key,
      queryFn: () =>
        fetch(`/api/ketua-tim/projects/${projectId}`, { cache: "no-store" })
          .then((res) => res.json())
          .then((result) => result.data),
      staleTime: 5 * 60 * 1000,
    });
  };

  const filteredProjects = useMemo(() => {
    const projects = data?.data || [];
    if (!searchTerm) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(
      (project) =>
        project.nama_project.toLowerCase().includes(term) ||
        project.deskripsi.toLowerCase().includes(term),
    );
  }, [data?.data, searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const statusTabs = [
    { value: "all", label: "Semua Proyek", count: pagination.total },
    { value: "upcoming", label: "Mendatang", count: statusCounts.upcoming },
    { value: "active", label: "Aktif", count: statusCounts.active },
    { value: "completed", label: "Selesai", count: statusCounts.completed },
  ];

  const handleFinishProject = async (projectId: string) => {
    const confirmed = window.confirm(
      "Tandai project sebagai selesai sekarang? Semua tugas tersisa akan ditandai selesai dan deadline di-set ke hari ini.",
    );
    if (!confirmed) return;

    setFinishingId(projectId);
    try {
      const response = await fetch(
        `/api/ketua-tim/projects/${projectId}/finish`,
        { method: "POST" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menyelesaikan project");
      toast.success("Project selesai lebih awal");
      await refetch();
      // Invalidate related views instantly
      queryClient.invalidateQueries({ queryKey: ["ketua", "projects"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "financial"] });
    } catch (err) {
      console.error("Finish project error:", err);
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setFinishingId(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const confirmed = window.confirm(
      "Hapus project ini? Tindakan ini tidak dapat dibatalkan. Semua tugas dan assignment terkait akan dihapus.",
    );
    if (!confirmed) return;

    setDeletingId(projectId);
    try {
      const response = await fetch(`/api/ketua-tim/projects/${projectId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menghapus project");
      toast.success("Project berhasil dihapus");
      await refetch();
      // Invalidate related views instantly
      queryClient.invalidateQueries({ queryKey: ["ketua", "projects"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "financial"] });
    } catch (err) {
      console.error("Delete project error:", err);
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Manajemen Proyek
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Kelola proyek Anda, pantau progres, dan monitor kinerja tim.
          </p>
        </div>

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
            Buat Proyek
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Cari proyek..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          className="border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Removed summary stats to simplify header */}

      {/* Status Tabs */}
      <Tabs
        value={selectedStatus}
        onValueChange={(v) => {
          setSelectedStatus(v);
          setCurrentPage(1);
        }}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          {statusTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center space-x-2"
            >
              <span>{tab.label}</span>
              <Badge className="bg-gray-100 text-gray-800 text-xs">
                {tab.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedStatus} className="space-y-6">
          {/* Grid Proyek - 2 kolom seperti Team */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Tidak ada proyek ditemukan
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm
                    ? "Coba ubah kata pencarian Anda"
                    : "Buat proyek pertama Anda untuk memulai"}
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  <Link
                    href="/ketua-tim/projects/new"
                    prefetch
                    onMouseEnter={() =>
                      router.prefetch("/ketua-tim/projects/new")
                    }
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Proyek
                  </Link>
                </Button>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const StatusIcon = ((): any => {
                  switch (project.status) {
                    case "upcoming":
                      return Clock;
                    case "active":
                      return AlertTriangle;
                    case "completed":
                      return CheckCircle;
                    default:
                      return Clock;
                  }
                })();

                const getStatusGradient = (status: string) => {
                  switch (status) {
                    case "upcoming":
                      return "from-blue-500 to-cyan-500";
                    case "active":
                      return "from-emerald-500 to-teal-500";
                    case "completed":
                      return "from-gray-500 to-slate-500";
                    default:
                      return "from-blue-500 to-indigo-500";
                  }
                };

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

                const budget = calculateProjectBudget(
                  project.project_assignments,
                );
                const teamSummary = getTeamSummary(project.project_assignments);
                const viewHref = `/ketua-tim/projects/${project.id}`;
                const editHref = `/ketua-tim/projects/${project.id}/edit`;

                const progress =
                  typeof (project as any).progress === "number"
                    ? (project as any).progress
                    : project.status === "completed"
                      ? 100
                      : 0;

                return (
                  <div
                    key={project.id}
                    className="border-0 shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white"
                    onMouseEnter={() => {
                      router.prefetch(viewHref);
                      prefetchProjectDetail(project.id);
                    }}
                  >
                    {/* Colorful accent matching status */}
                    <div
                      className={`h-1 bg-gradient-to-r ${getStatusGradient(project.status)}`}
                    />
                    <div className="p-6">
                      {/* Project Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-16 h-16 bg-gradient-to-r ${getStatusGradient(project.status)} rounded-full flex items-center justify-center shadow-md`}
                          >
                            <StatusIcon className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {project.nama_project}
                            </h3>
                            <p className="text-gray-500 line-clamp-1 mt-1">
                              {project.deskripsi}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge
                                className={`${getStatusColor(project.status)} border flex items-center space-x-1 shadow-sm`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                <span>
                                  {project.status === "upcoming" && "Mendatang"}
                                  {project.status === "active" && "Aktif"}
                                  {project.status === "completed" && "Selesai"}
                                </span>
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Aksi Project</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => router.push(viewHref)}
                              onMouseEnter={() => {
                                router.prefetch(viewHref);
                                prefetchProjectDetail(project.id);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              <span>Lihat</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => router.push(editHref)}
                              onMouseEnter={() => router.prefetch(editHref)}
                            >
                              <Edit className="w-4 h-4" />
                              <span>Ubah</span>
                            </DropdownMenuItem>
                            {project.status !== "completed" && (
                              <DropdownMenuItem
                                onSelect={() => handleFinishProject(project.id)}
                                disabled={finishingId === project.id}
                              >
                                {finishingId === project.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Menyelesaikan...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Selesaikan Proyek</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => handleDeleteProject(project.id)}
                              disabled={deletingId === project.id}
                            >
                              {deletingId === project.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Menghapus...</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>Hapus Proyek</span>
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-emerald-50 rounded-lg">
                          <div className="text-2xl font-bold text-emerald-600">
                            {progress}%
                          </div>
                          <div className="text-sm text-emerald-700">
                            Progress
                          </div>
                        </div>
                        <div className="text-center p-3 bg-indigo-50 rounded-lg">
                          <div className="text-2xl font-bold text-indigo-600">
                            {formatCurrency(budget)}
                          </div>
                          <div className="text-sm text-indigo-700">Budget</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Project Progress
                          </span>
                          <span className="font-semibold text-gray-900">
                            {progress}%
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline & Team Info */}
                      <div className="space-y-2 mb-4">
                        <h4 className="font-semibold text-gray-900">
                          Timeline & Team
                        </h4>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="font-medium text-gray-900">
                              {new Date(
                                project.tanggal_mulai,
                              ).toLocaleDateString("id-ID")}
                            </span>
                            <span className="text-gray-500 mx-2">•</span>
                            <span className="text-gray-500">
                              Deadline:{" "}
                              {new Date(project.deadline).toLocaleDateString(
                                "id-ID",
                              )}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Users className="w-4 h-4 text-emerald-600 mr-2" />
                            <span className="text-gray-500">{teamSummary}</span>
                          </div>
                        </div>
                      </div>

                      {/* View Details Button */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 w-full"
                        >
                          <Link
                            href={viewHref}
                            prefetch
                            onMouseEnter={() => {
                              router.prefetch(viewHref);
                              prefetchProjectDetail(project.id);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pagination.limit + 1} to{" "}
                {Math.min(currentPage * pagination.limit, pagination.total)} of{" "}
                {pagination.total} projects
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isFetching}
                >
                  Previous
                </Button>
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    onMouseEnter={() =>
                      queryClient.prefetchQuery({
                        queryKey: [
                          "ketua",
                          "projects",
                          { page: i + 1, status: selectedStatus },
                        ],
                        queryFn: () =>
                          fetchProjectsRequest(i + 1, selectedStatus),
                      })
                    }
                    onClick={() => handlePageChange(i + 1)}
                    className={
                      currentPage === i + 1 ? "bg-blue-600 text-white" : ""
                    }
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages || isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

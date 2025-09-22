// File: src/components/pegawai/ProjectListView.tsx
// NEW: Landing page for pegawai - project list with search and filters

"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  Filter,
  Calendar,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  User,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
// import Link from "next/link";
import { useActiveProject } from "@/components/providers";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Progress } from "@/components/ui/progress";

interface ProjectData {
  id: string;
  nama_project: string;
  deskripsi: string;
  status: "upcoming" | "active" | "completed";
  tanggal_mulai: string;
  deadline: string;
  user_role: "leader" | "member";
  ketua_tim: {
    nama_lengkap: string;
  };
  team_size: number;
  my_tasks: {
    total: number;
    pending: number;
    completed: number;
  };
  my_transport_earnings: number;
}

async function fetchProjectsRequest(): Promise<ProjectData[]> {
  const response = await fetch("/api/pegawai/projects", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch projects");
  }
  return result.data || [];
}

export default function ProjectListView() {
  const router = useRouter();
  const { setActiveProject } = useActiveProject();
  const { userProfile } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const {
    data: projects = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<ProjectData[], Error>({
    queryKey: ["pegawai", "projects"],
    queryFn: fetchProjectsRequest,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.nama_project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.ketua_tim.nama_lengkap
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;
      const matchesRole =
        roleFilter === "all" || project.user_role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [projects, searchTerm, statusFilter, roleFilter]);

  const projectCounts = useMemo(
    () => ({
      all: projects.length,
      upcoming: projects.filter((p) => p.status === "upcoming").length,
      active: projects.filter((p) => p.status === "active").length,
      completed: projects.filter((p) => p.status === "completed").length,
      leader: projects.filter((p) => p.user_role === "leader").length,
      member: projects.filter((p) => p.user_role === "member").length,
    }),
    [projects]
  );

  const handleRefresh = async () => {
    const res = await refetch();
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success("Projects refreshed");
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

  // Note: status icon helper reserved for future UI; unused intentionally

  const getRoleColor = (role: string) => {
    return role === "leader"
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
  };

  if (error && projects.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-medium text-gray-900">
              Failed to Load Projects
            </h2>
            <p className="text-gray-600 max-w-md">{error.message}</p>
            <Button
              onClick={handleRefresh}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
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

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-green-200/40 blur-2xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-teal-200/40 blur-2xl" />
        <div className="relative p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-gray-900">
                Selamat datang, ini proyek Anda
              </h1>
              <p className="text-gray-700 mt-1">
                Lihat daftar project sebagai ketua tim maupun anggota.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={handleRefresh}
                disabled={isFetching}
                variant="outline"
                className="border border-gray-300 bg-white/80 backdrop-blur hover:bg-white"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="border border-green-300 text-green-700 bg-white/80 backdrop-blur hover:bg-green-50"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Timeline
              </Button>
            </div>
          </div>

          {/* Compact Stats removed as requested */}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                  Total Projects
                </p>
                <p className="text-3xl font-medium text-gray-900">
                  {projectCounts.all}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                  Active Projects
                </p>
                <p className="text-3xl font-medium text-gray-900">
                  {projectCounts.active}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                  As Leader
                </p>
                <p className="text-3xl font-medium text-gray-900">
                  {projectCounts.leader}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                  Total Earnings
                </p>
                <p className="text-2xl font-medium text-gray-900">
                  {formatCurrency(
                    projects.reduce(
                      (sum, p) => sum + p.my_transport_earnings,
                      0
                    )
                  )}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-300 shadow-sm"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="leader">As Leader</SelectItem>
            <SelectItem value="member">As Member</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="border border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          <Filter className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Project List */}
      <div className="grid grid-cols-1 gap-6">
        {isLoading && projects.length === 0 ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse border-0 shadow-xl rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
              <div className="flex space-x-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          ))
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-gray-300 bg-white">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Belum ada project
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? "Coba ubah kata kunci pencarian Anda"
                : "Anda belum ditugaskan ke project apa pun"}
            </p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="border-gray-300"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
              />
              Muat ulang
            </Button>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isOverdue =
              new Date(project.deadline) < new Date() &&
              project.status !== "completed";
            return (
              <div
                key={project.id}
                onClick={() => {
                  setActiveProject({ id: project.id, role: project.user_role });
                  // Only allow ketua_tim users to access ketua-tim pages
                  console.log("Project click:", {
                    projectRole: project.user_role,
                    userRole: userProfile?.role,
                  });
                  if (project.user_role === "leader") {
                    // Allow access to ketua-tim pages if user is leader in this project
                    router.push(`/ketua-tim/projects/${project.id}`);
                  } else {
                    router.push(`/pegawai/projects/${project.id}`);
                  }
                }}
                className={`group rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition hover:-translate-y-0.5 ${
                  isOverdue ? "ring-2 ring-red-200" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    className={`${getStatusColor(project.status)} border font-medium`}
                  >
                    {project.status.toUpperCase()}
                  </Badge>
                  <Badge
                    className={`${getRoleColor(project.user_role)} border font-medium`}
                  >
                    {project.user_role.toUpperCase()}
                  </Badge>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-1">
                  {project.nama_project}
                </h3>
                <p className="text-gray-600 mb-2 line-clamp-2">
                  {project.deskripsi}
                </p>
                <div className="text-sm text-gray-500">
                  Leader: {project.ketua_tim.nama_lengkap} • Team:{" "}
                  {project.team_size} • Deadline:{" "}
                  {new Date(project.deadline).toLocaleDateString("id-ID")}
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>
                      {project.my_tasks.completed}/{project.my_tasks.total}{" "}
                      selesai
                    </span>
                  </div>
                  <Progress
                    value={
                      project.my_tasks.total > 0
                        ? Math.round(
                            (project.my_tasks.completed /
                              project.my_tasks.total) *
                              100
                          )
                        : 0
                    }
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      {/* Removed secondary stats for cleaner, lighter layout */}
    </div>
  );
}

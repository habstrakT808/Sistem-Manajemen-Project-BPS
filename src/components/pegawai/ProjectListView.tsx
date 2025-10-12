// File: src/components/pegawai/ProjectListView.tsx
// NEW: Landing page for pegawai - project list with search and filters

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Calendar,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  User,
  X,
  Users,
  LogOut,
  Settings,
  ArrowLeft,
  Crown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useActiveProject } from "@/components/providers";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Progress } from "@/components/ui/progress";
import { useActiveTeam } from "@/components/providers";

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

async function fetchProjectsRequest(
  teamId?: string | null,
): Promise<ProjectData[]> {
  const qs = teamId ? `?team_id=${encodeURIComponent(teamId)}` : "";
  const response = await fetch(`/api/pegawai/projects${qs}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch projects");
  }
  return result.data || [];
}

export default function ProjectListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const teamId = searchParams?.get("team_id") || null;
  const { setActiveProject } = useActiveProject();
  const { signOut } = useAuthContext();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };
  const { setActiveTeam } = useActiveTeam();
  const { userProfile } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(
    null,
  );
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  // Invalidate and refetch data when teamId changes
  useEffect(() => {
    if (teamId) {
      console.log("[ProjectListView] TeamId changed to:", teamId);
      // Invalidate all pegawai queries to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ["pegawai", "projects"],
      });
      queryClient.invalidateQueries({
        queryKey: ["pegawai", "teams"],
      });
      // Also clear any cached data
      queryClient.removeQueries({
        queryKey: ["pegawai", "projects"],
      });
    }
  }, [teamId, queryClient]);

  const {
    data: projects = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<ProjectData[], Error>({
    queryKey: ["pegawai", "projects", { teamId }],
    queryFn: () => fetchProjectsRequest(teamId),
    staleTime: 0, // Always fresh data to prevent caching issues
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Debug logging for projects data
  useEffect(() => {
    if (projects && projects.length > 0) {
      console.log(
        "[ProjectListView] Projects loaded:",
        projects.length,
        "projects for teamId:",
        teamId,
      );
      console.log(
        "[ProjectListView] Project details:",
        projects.map((p) => ({
          id: p.id,
          name: p.nama_project,
          status: p.status,
          user_role: p.user_role,
        })),
      );
    }
  }, [projects, teamId]);

  // Fetch team info to render the same team card as on /pegawai
  const { data: teams = [] } = useQuery<any[], Error>({
    queryKey: ["pegawai", "teams"],
    queryFn: async () => {
      const res = await fetch("/api/pegawai/teams", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch teams");
      return json.data || [];
    },
    staleTime: 0, // Always fresh data to prevent caching issues
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const selectedTeam = teams.find((t) => t.id === teamId);

  // Count how many teams where user is leader
  const leaderTeamCount = teams.filter((t) => t.role === "leader").length;

  // Debug: log projects data
  React.useEffect(() => {
    if (projects.length > 0) {
      console.log("Projects data:", projects);
      console.log(
        "Leader projects:",
        projects.filter((p) => p.user_role === "leader"),
      );
    }
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.nama_project.toLowerCase().includes(searchLower) ||
          project.deskripsi.toLowerCase().includes(searchLower) ||
          project.ketua_tim.nama_lengkap.toLowerCase().includes(searchLower),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((p) => p.user_role === roleFilter);
    }

    return filtered;
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
    [projects],
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden">
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700"></div>

        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-2 h-2 bg-white rounded-full animate-pulse delay-300"></div>
          <div className="absolute bottom-10 left-20 w-2.5 h-2.5 bg-white rounded-full animate-pulse delay-700"></div>
          <div className="absolute bottom-20 right-10 w-3 h-3 bg-white rounded-full animate-pulse delay-500"></div>
        </div>

        {/* Floating shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-20 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-20 right-1/4 w-40 h-40 bg-purple-300/20 rounded-full blur-xl animate-float-delayed"></div>
        </div>

        <div className="relative px-4 sm:px-6 lg:px-8 py-12">
          {/* Action Buttons - Top Right */}
          <div className="absolute top-6 right-6 flex space-x-3 z-20">
            <Button
              onClick={handleRefresh}
              disabled={isFetching}
              variant="outline"
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="outline"
              asChild
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
            >
              <Link href="/pegawai/settings">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Back Button - Top Left */}
          <div className="absolute top-6 left-6 z-20">
            <Button
              variant="outline"
              asChild
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
            >
              <Link href="/pegawai">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Tim
              </Link>
            </Button>
          </div>

          <div className="max-w-7xl mx-auto text-center pt-12">
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-xl">
                    <FolderOpen className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                    Proyek Saya
                  </h1>
                  <p className="text-blue-100 text-lg md:text-xl">
                    Lihat daftar project sebagai ketua tim maupun anggota
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-12 space-y-8">
        {/* Summary Cards - Modern Gradient Design */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Projects */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-white/20 backdrop-blur p-2.5">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs font-medium text-blue-100 px-2 py-1 bg-white/20 rounded-full">
                  Total
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {projectCounts.all}
              </p>
              <p className="text-sm text-blue-100">Total Proyek</p>
            </div>
          </div>

          {/* Active Projects */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-white/20 backdrop-blur p-2.5">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs font-medium text-emerald-100 px-2 py-1 bg-white/20 rounded-full">
                  Aktif
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {projectCounts.active}
              </p>
              <p className="text-sm text-emerald-100">Proyek Aktif</p>
            </div>
          </div>

          {/* As Leader */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-white/20 backdrop-blur p-2.5">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs font-medium text-purple-100 px-2 py-1 bg-white/20 rounded-full">
                  Ketua
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {leaderTeamCount}
              </p>
              <p className="text-sm text-purple-100">Sebagai Ketua Tim</p>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-white/20 backdrop-blur p-2.5">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs font-medium text-amber-100 px-2 py-1 bg-white/20 rounded-full">
                  Pendapatan
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {formatCurrency(
                  projects.reduce(
                    (sum, p) => sum + (p.my_transport_earnings || 0),
                    0,
                  ),
                )}
              </p>
              <p className="text-sm text-amber-100">Total Pendapatan</p>
            </div>
          </div>
        </div>

        {/* Search & Filters - Modern Design */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white/50 shadow-xl p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Cari proyek berdasarkan nama, deskripsi, atau ketua..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-14 h-14 bg-white/50 border-gray-200 focus:bg-white hover:bg-white rounded-2xl text-base"
              />
            </div>

            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-48 h-14 rounded-2xl border-gray-200 bg-white/50 hover:bg-white transition">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                      Semua Status
                    </div>
                  </SelectItem>
                  <SelectItem value="upcoming">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                      Akan Datang
                    </div>
                  </SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                      Aktif
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-gray-500 mr-2" />
                      Selesai
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="sm:w-48 h-14 rounded-2xl border-gray-200 bg-white/50 hover:bg-white transition">
                  <SelectValue placeholder="Peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                      Semua Peran
                    </div>
                  </SelectItem>
                  <SelectItem value="leader">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-purple-500 mr-2" />
                      Sebagai Ketua
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-blue-500 mr-2" />
                      Sebagai Anggota
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm ||
                statusFilter !== "all" ||
                roleFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setRoleFilter("all");
                  }}
                  className="h-14 px-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-2xl"
                >
                  <X className="w-4 h-4 mr-2" />
                  Hapus
                </Button>
              )}
            </div>
          </div>

          {/* Filter Summary */}
          {filteredProjects.length !== projects.length && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Menampilkan{" "}
                <span className="font-semibold text-gray-900">
                  {filteredProjects.length}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-gray-900">
                  {projects.length}
                </span>{" "}
                proyek
              </p>
            </div>
          )}
        </div>

        {/* Project List as Pegawai */}
        <div className="grid grid-cols-1 gap-6">
          {/* Show leader card when filter is "leader" */}
          {roleFilter === "leader" && (
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-3xl border-2 border-white/30 p-12 shadow-2xl">
              {/* Decorative background elements */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full blur-2xl"></div>
                <div className="absolute bottom-10 right-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
              </div>

              <div className="relative max-w-3xl mx-auto text-center">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 shadow-2xl ring-4 ring-white/30">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  {leaderTeamCount > 0
                    ? `Anda adalah Ketua di ${leaderTeamCount} Tim`
                    : "Akses Dashboard Ketua Tim"}
                </h3>
                <p className="text-white/90 text-lg mb-8 leading-relaxed max-w-xl mx-auto drop-shadow">
                  {leaderTeamCount > 0
                    ? "Sebagai ketua tim, Anda memiliki akses penuh untuk mengelola proyek, mengatur anggota tim, dan memonitor progress. Klik tombol di bawah untuk masuk ke dashboard ketua tim."
                    : "Halaman ini menampilkan proyek di mana Anda ditugaskan sebagai anggota. Jika Anda adalah ketua tim, silakan klik tombol di bawah untuk mengakses dashboard ketua tim."}
                </p>
                <Button
                  onClick={() => router.push("/ketua-tim")}
                  className="bg-white text-purple-600 hover:bg-white/90 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 font-semibold px-8 py-6 text-lg rounded-2xl"
                >
                  <Users className="w-5 h-5 mr-3" />
                  Masuk sebagai Ketua Tim
                </Button>
                <p className="text-sm text-white/80 mt-6">
                  Atau ubah filter ke &quot;As Member&quot; untuk melihat proyek
                  sebagai anggota
                </p>
              </div>
            </div>
          )}

          {selectedTeam &&
            selectedTeam.role === "leader" &&
            roleFilter === "all" && (
              <div
                className={`group rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition hover:-translate-y-0.5 cursor-pointer`}
                onClick={() => router.push("/ketua-tim")}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-purple-100 text-purple-800 border font-medium">
                    KETUA
                  </Badge>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-1">
                  {selectedTeam.name}
                </h3>
                <p className="text-gray-600 mb-2 line-clamp-2">
                  {selectedTeam.description ||
                    "Masuk sebagai Ketua Tim untuk mengelola proyek."}
                </p>
                <div className="text-sm text-gray-500">Peran: Ketua Tim</div>
              </div>
            )}
          {isLoading && projects.length === 0 ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse border-0 shadow-xl rounded-3xl p-8 bg-white/80 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-3 flex-1">
                    <div className="h-6 bg-gray-200 rounded-xl w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-1/2"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded-xl w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded-lg w-full mb-6"></div>
                <div className="flex space-x-4">
                  <div className="h-4 bg-gray-200 rounded-lg w-28"></div>
                  <div className="h-4 bg-gray-200 rounded-lg w-28"></div>
                  <div className="h-4 bg-gray-200 rounded-lg w-28"></div>
                </div>
              </div>
            ))
          ) : filteredProjects.length === 0 && roleFilter !== "leader" ? (
            <div className="text-center py-24 rounded-3xl border-2 border-dashed border-gray-300 bg-white/80 backdrop-blur-sm shadow-xl">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <FolderOpen className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  {searchTerm || statusFilter !== "all"
                    ? "Tidak ada proyek yang cocok"
                    : "Belum ada proyek"}
                </h3>
                <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                  {searchTerm || statusFilter !== "all"
                    ? "Coba ubah filter atau kata kunci pencarian Anda"
                    : "Anda belum ditugaskan ke proyek di tim ini. Hubungi ketua tim untuk informasi lebih lanjut."}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {(searchTerm || statusFilter !== "all") && (
                    <Button
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setRoleFilter("all");
                      }}
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50 h-12 px-6 rounded-xl"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50 h-12 px-6 rounded-xl"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          ) : roleFilter === "leader" ? null : (
            filteredProjects.map((project) => {
              const isOverdue =
                new Date(project.deadline) < new Date() &&
                project.status !== "completed";
              return (
                <div
                  key={project.id}
                  onClick={() => {
                    console.log(
                      "Project selected:",
                      project.nama_project,
                      "User role:",
                      project.user_role,
                    );

                    if (project.user_role === "member") {
                      // If user is member, go directly to pegawai dashboard
                      setActiveProject({
                        id: project.id,
                        role: "member",
                      });
                      setActiveTeam({
                        id: teamId || "",
                        role: "member",
                      });
                      router.push(
                        `/pegawai/dashboard?project_id=${project.id}`,
                      );
                    } else if (project.user_role === "leader") {
                      // If user is leader, show role selection dialog
                      setSelectedProject(project);
                      setShowRoleDialog(true);
                    }
                  }}
                  className={`group relative overflow-hidden rounded-3xl border bg-white/90 backdrop-blur-sm p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer ${
                    isOverdue
                      ? "border-red-300 ring-2 ring-red-100"
                      : "border-white/50"
                  }`}
                >
                  {/* Gradient accent bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      project.status === "active"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                        : project.status === "upcoming"
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                          : "bg-gradient-to-r from-gray-400 to-gray-500"
                    }`}
                  />

                  {/* Header with badges */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${getStatusColor(project.status)} border-0 font-medium px-3 py-1 shadow-sm`}
                      >
                        {project.status === "active" && "🟢 "}
                        {project.status === "upcoming" && "🔵 "}
                        {project.status === "completed" && "⚪ "}
                        {project.status === "active" && "AKTIF"}
                        {project.status === "upcoming" && "AKAN DATANG"}
                        {project.status === "completed" && "SELESAI"}
                      </Badge>
                      <Badge
                        className={`${getRoleColor(project.user_role)} border-0 font-medium px-3 py-1 shadow-sm`}
                      >
                        {project.user_role === "leader" && "👑 KETUA"}
                        {project.user_role === "member" && "👤 ANGGOTA"}
                      </Badge>
                    </div>
                    {isOverdue && (
                      <Badge className="bg-red-100 text-red-700 border-0 font-medium animate-pulse">
                        ⚠️ TERLAMBAT
                      </Badge>
                    )}
                  </div>

                  {/* Project info */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                    {project.nama_project}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                    {project.deskripsi}
                  </p>

                  {/* Project meta */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-5 pb-5 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">
                        {project.ketua_tim.nama_lengkap}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>{project.team_size} members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span>
                        {new Date(project.deadline).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Progress section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        My Tasks Progress
                      </span>
                      <span className="text-sm font-semibold text-emerald-600">
                        {project.my_tasks.completed}/{project.my_tasks.total}{" "}
                        completed
                      </span>
                    </div>
                    <div className="relative">
                      <Progress
                        value={
                          project.my_tasks.total > 0
                            ? Math.round(
                                (project.my_tasks.completed /
                                  project.my_tasks.total) *
                                  100,
                              )
                            : 0
                        }
                        className="h-2.5"
                      />
                    </div>
                    {project.my_transport_earnings > 0 && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-gray-600">
                          My Earnings
                        </span>
                        <span className="text-sm font-semibold text-amber-600">
                          {formatCurrency(project.my_transport_earnings)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary Stats */}
        {/* Removed secondary stats for cleaner, lighter layout */}
      </div>

      {/* Role Selection Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Role</DialogTitle>
            <DialogDescription>
              Pilih bagaimana Anda ingin mengakses proyek &quot;
              {selectedProject?.nama_project}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProject?.user_role === "leader" && (
              <Button
                onClick={() => {
                  // Set both activeProject and activeTeam with leader role
                  setActiveProject({
                    id: selectedProject.id,
                    role: "leader",
                  });
                  setActiveTeam({
                    id: teamId || "",
                    role: "leader",
                  });
                  router.push(`/ketua-tim/projects/${selectedProject.id}`);
                  setShowRoleDialog(false);
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <Crown className="w-4 h-4 mr-2" />
                Sebagai Ketua Tim
              </Button>
            )}
            <Button
              onClick={() => {
                // Set both activeProject and activeTeam with member role
                setActiveProject({
                  id: selectedProject?.id || "",
                  role: "member",
                });
                setActiveTeam({
                  id: teamId || "",
                  role: "member",
                });
                router.push(
                  `/pegawai/dashboard?project_id=${selectedProject?.id}`,
                );
                setShowRoleDialog(false);
              }}
              className="w-full justify-start"
              variant="outline"
            >
              <User className="w-4 h-4 mr-2" />
              Sebagai Anggota Tim
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

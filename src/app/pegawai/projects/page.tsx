// File: src/app/pegawai/projects/page.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  TrendingUp,
  Calendar,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import ProjectView from "@/components/pegawai/ProjectView";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface ProjectData {
  id: string;
  nama_project: string;
  deskripsi: string;
  tanggal_mulai: string;
  deadline: string;
  status: "upcoming" | "active" | "completed";
  created_at: string;
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
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/pegawai/projects");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch projects");
      }

      setProjects(result.data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load projects";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
    toast.success("Projects refreshed");
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProjects();
      setLoading(false);
    };

    loadData();
  }, [fetchProjects]);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.nama_project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.ketua_tim.nama_lengkap
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const projectCounts = {
    all: projects.length,
    upcoming: projects.filter((p) => p.status === "upcoming").length,
    active: projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  const totalEarnings = projects.reduce(
    (sum, project) => sum + project.uang_transport,
    0
  );
  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, project) => sum + project.my_progress, 0) /
            projects.length
        )
      : 0;

  // Error state
  if (error && !projects.length) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Failed to Load Projects
            </h2>
            <p className="text-gray-600 max-w-md">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchProjects().finally(() => setLoading(false));
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            My Projects
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Projects you&apos;re participating in and your contributions.
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
            variant="outline"
            className="border-2 border-green-200 text-green-600 hover:bg-green-50"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Timeline View
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Total Projects
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Avg Progress
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {averageProgress}%
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Active Projects
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {projectCounts.active}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-yellow-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Total Earnings
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(totalEarnings)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search projects or ketua tim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-gray-200"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              All Projects ({projectCounts.all})
            </SelectItem>
            <SelectItem value="upcoming">
              Upcoming ({projectCounts.upcoming})
            </SelectItem>
            <SelectItem value="active">
              Active ({projectCounts.active})
            </SelectItem>
            <SelectItem value="completed">
              Completed ({projectCounts.completed})
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <Filter className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Projects List */}
      <ProjectView projects={filteredProjects} loading={loading} />
    </div>
  );
}

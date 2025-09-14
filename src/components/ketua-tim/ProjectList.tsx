// File: src/components/ketua-tim/ProjectList.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  DollarSign,
  MoreVertical,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
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
  project_assignments: Array<{
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
}

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchProjects = useCallback(async (page = 1, status?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (status && status !== "all") {
        params.append("status", status);
      }

      const response = await fetch(`/api/ketua-tim/projects?${params}`);
      const result: ProjectsResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          (result.data as unknown as string) || "Failed to fetch projects"
        );
      }

      setProjects(result.data);
      setPagination(result.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects(1, selectedStatus);
  }, [fetchProjects, selectedStatus]);

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

  const calculateProjectBudget = (
    assignments: ProjectData["project_assignments"]
  ) => {
    return assignments.reduce((total, assignment) => {
      return total + (assignment.uang_transport || 0) + (assignment.honor || 0);
    }, 0);
  };

  const getTeamSummary = (assignments: ProjectData["project_assignments"]) => {
    const pegawaiCount = assignments.filter(
      (a) => a.assignee_type === "pegawai"
    ).length;
    const mitraCount = assignments.filter(
      (a) => a.assignee_type === "mitra"
    ).length;
    return `${pegawaiCount} Pegawai, ${mitraCount} Mitra`;
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.nama_project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.deskripsi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePageChange = (page: number) => {
    fetchProjects(page, selectedStatus);
  };

  const statusTabs = [
    { value: "all", label: "All Projects", count: pagination.total },
    { value: "upcoming", label: "Upcoming", count: 0 },
    { value: "active", label: "Active", count: 0 },
    { value: "completed", label: "Completed", count: 0 },
  ];

  if (loading) {
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
            Project Management
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Manage your projects, track progress, and monitor team performance.
          </p>
        </div>

        <Button
          asChild
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          <Link href="/ketua-tim/projects/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search projects..."
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
          Filters
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={selectedStatus}
        onValueChange={setSelectedStatus}
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
          {/* Project Grid */}
          <div className="grid grid-cols-1 gap-6">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No projects found
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Create your first project to get started"}
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  <Link href="/ketua-tim/projects/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Link>
                </Button>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const StatusIcon = getStatusIcon(project.status);
                const budget = calculateProjectBudget(
                  project.project_assignments
                );
                const teamSummary = getTeamSummary(project.project_assignments);

                return (
                  <div
                    key={project.id}
                    className="border-0 shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {project.nama_project}
                            </h3>
                            <Badge
                              className={`${getStatusColor(project.status)} border flex items-center space-x-1`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              <span>{project.status.toUpperCase()}</span>
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {project.deskripsi}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  Timeline
                                </div>
                                <div className="text-gray-500">
                                  {new Date(
                                    project.tanggal_mulai
                                  ).toLocaleDateString("id-ID")}{" "}
                                  -{" "}
                                  {new Date(
                                    project.deadline
                                  ).toLocaleDateString("id-ID")}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-green-500" />
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  Team
                                </div>
                                <div className="text-gray-500">
                                  {teamSummary}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4 text-orange-500" />
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  Budget
                                </div>
                                <div className="text-gray-500">
                                  {formatCurrency(budget)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Link href={`/ketua-tim/projects/${project.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="border-green-200 text-green-600 hover:bg-green-50"
                          >
                            <Link
                              href={`/ketua-tim/projects/${project.id}/edit`}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold text-gray-900">
                            0%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: "0%" }}
                          ></div>
                        </div>
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
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
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
                  disabled={currentPage === pagination.totalPages}
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

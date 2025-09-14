// File: src/components/ketua-tim/TaskManagement.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface TaskData {
  id: string;
  project_id: string;
  pegawai_id: string;
  tanggal_tugas: string;
  deskripsi_tugas: string;
  status: "pending" | "in_progress" | "completed";
  response_pegawai: string | null;
  created_at: string;
  updated_at: string;
  projects: {
    id: string;
    nama_project: string;
  };
  users: {
    id: string;
    nama_lengkap: string;
    email: string;
  };
}

interface ProjectOption {
  id: string;
  nama_project: string;
  pegawai_assignments: Array<{
    assignee_id: string;
    users?: { nama_lengkap: string };
  }>;
}

interface TaskFormData {
  project_id: string;
  pegawai_id: string;
  tanggal_tugas: string;
  deskripsi_tugas: string;
}

const initialFormData: TaskFormData = {
  project_id: "",
  pegawai_id: "",
  tanggal_tugas: "",
  deskripsi_tugas: "",
};

export default function TaskManagement() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }

      if (selectedProject !== "all") {
        params.append("project_id", selectedProject);
      }

      const response = await fetch(`/api/ketua-tim/tasks?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch tasks");
      }

      setTasks(result.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    }
  }, [selectedStatus, selectedProject]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/ketua-tim/projects?limit=100");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch projects");
      }

      // Enrich projects with pegawai assignments
      const enrichedProjects = await Promise.all(
        result.data.map(async (project: ProjectOption) => {
          try {
            const assignmentResponse = await fetch(
              `/api/ketua-tim/projects/${project.id}`
            );
            const assignmentResult = await assignmentResponse.json();

            if (assignmentResponse.ok && assignmentResult.data) {
              const pegawaiAssignments =
                assignmentResult.data.project_assignments
                  ?.filter(
                    (a: { assignee_type: string }) =>
                      a.assignee_type === "pegawai"
                  )
                  ?.map(
                    (a: {
                      assignee_id: string;
                      assignee_details?: { nama_lengkap: string };
                    }) => ({
                      assignee_id: a.assignee_id,
                      users: a.assignee_details
                        ? { nama_lengkap: a.assignee_details.nama_lengkap }
                        : undefined,
                    })
                  ) || [];

              return {
                ...project,
                pegawai_assignments: pegawaiAssignments,
              };
            }

            return {
              ...project,
              pegawai_assignments: [],
            };
          } catch (error) {
            console.error(
              `Error fetching assignments for project ${project.id}:`,
              error
            );
            return {
              ...project,
              pegawai_assignments: [],
            };
          }
        })
      );

      setProjects(enrichedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchProjects()]);
      setLoading(false);
    };

    loadData();
  }, [fetchTasks, fetchProjects]);

  const handleCreateTask = async () => {
    if (
      !formData.project_id ||
      !formData.pegawai_id ||
      !formData.tanggal_tugas ||
      !formData.deskripsi_tugas
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/ketua-tim/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create task");
      }

      toast.success("Task created successfully!");
      setFormData(initialFormData);
      setIsCreateDialogOpen(false);
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create task"
      );
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return Clock;
      case "in_progress":
        return AlertTriangle;
      case "completed":
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const getSelectedProjectPegawai = () => {
    const project = projects.find((p) => p.id === formData.project_id);
    return project?.pegawai_assignments || [];
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.deskripsi_tugas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.projects.nama_project
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      task.users.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const statusCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading tasks...</p>
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
            Task Management
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Create and manage daily tasks for your team members.
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Assign a new task to a team member for a specific project.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      project_id: value,
                      pegawai_id: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.nama_project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pegawai">Team Member *</Label>
                <Select
                  value={formData.pegawai_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, pegawai_id: value }))
                  }
                  disabled={!formData.project_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSelectedProjectPegawai().map((assignment) => (
                      <SelectItem
                        key={assignment.assignee_id}
                        value={assignment.assignee_id}
                      >
                        {assignment.users?.nama_lengkap || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tanggal_tugas">Task Date *</Label>
                <Input
                  id="tanggal_tugas"
                  type="date"
                  value={formData.tanggal_tugas}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tanggal_tugas: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deskripsi_tugas">Task Description *</Label>
                <Textarea
                  id="deskripsi_tugas"
                  value={formData.deskripsi_tugas}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deskripsi_tugas: e.target.value,
                    }))
                  }
                  placeholder="Describe the task in detail..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={creating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.nama_project}
              </SelectItem>
            ))}
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

      {/* Status Tabs */}
      <Tabs
        value={selectedStatus}
        onValueChange={setSelectedStatus}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <span>All Tasks</span>
            <Badge className="bg-gray-100 text-gray-800 text-xs">
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <span>Pending</span>
            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
              {statusCounts.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="in_progress"
            className="flex items-center space-x-2"
          >
            <span>In Progress</span>
            <Badge className="bg-blue-100 text-blue-800 text-xs">
              {statusCounts.in_progress}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex items-center space-x-2"
          >
            <span>Completed</span>
            <Badge className="bg-green-100 text-green-800 text-xs">
              {statusCounts.completed}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="space-y-6">
          {/* Task List */}
          <div className="grid grid-cols-1 gap-6">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No tasks found
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Create your first task to get started"}
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const StatusIcon = getStatusIcon(task.status);

                return (
                  <div
                    key={task.id}
                    className="border-0 shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge
                              className={`${getStatusColor(task.status)} border flex items-center space-x-1`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              <span>
                                {task.status.replace("_", " ").toUpperCase()}
                              </span>
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(task.tanggal_tugas).toLocaleDateString(
                                "id-ID"
                              )}
                            </span>
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {task.deskripsi_tugas}
                          </h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-blue-500" />
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  Assigned to
                                </div>
                                <div className="text-gray-500">
                                  {task.users.nama_lengkap}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-green-500" />
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  Project
                                </div>
                                <div className="text-gray-500">
                                  {task.projects.nama_project}
                                </div>
                              </div>
                            </div>
                          </div>

                          {task.response_pegawai && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <div className="text-sm font-medium text-blue-900 mb-1">
                                Response:
                              </div>
                              <div className="text-sm text-blue-800">
                                {task.response_pegawai}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-200 text-green-600 hover:bg-green-50"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-400">
                        Created:{" "}
                        {new Date(task.created_at).toLocaleDateString("id-ID")}{" "}
                        • Updated:{" "}
                        {new Date(task.updated_at).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// File: src/components/ketua-tim/TaskManagement.tsx
// COMPLETELY UPDATED: New task structure with transport management

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DollarSign,
  MapPin,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface TaskData {
  id: string;
  project_id: string;
  assignee_user_id: string;
  title: string;
  deskripsi_tugas: string;
  start_date: string;
  end_date: string;
  has_transport: boolean;
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
  task_transport_allocations: Array<{
    id: string;
    allocation_date: string | null;
    allocated_at: string | null;
    canceled_at: string | null;
  }>;
}

interface ProjectOption {
  id: string;
  nama_project: string;
}

interface ProjectMember {
  id: string;
  nama_lengkap: string;
  email: string;
  role: string;
}

interface TaskFormData {
  project_id: string;
  assignee_user_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  has_transport: boolean;
}

const initialFormData: TaskFormData = {
  project_id: "",
  assignee_user_id: "",
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  has_transport: false,
};

async function fetchTasksRequest(
  selectedStatus: string,
  selectedProject: string
): Promise<TaskData[]> {
  const params = new URLSearchParams();
  if (selectedStatus !== "all") params.append("status", selectedStatus);
  if (selectedProject !== "all") params.append("project_id", selectedProject);

  const response = await fetch(`/api/ketua-tim/tasks?${params.toString()}`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to fetch tasks");
  return result.data as TaskData[];
}

async function fetchProjectsRequest(): Promise<ProjectOption[]> {
  const response = await fetch("/api/ketua-tim/projects?limit=100", {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to fetch projects");
  return result.data as ProjectOption[];
}

async function fetchProjectMembers(
  projectId: string
): Promise<ProjectMember[]> {
  const response = await fetch(`/api/ketua-tim/projects/${projectId}/members`, {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to fetch members");
  return result.data as ProjectMember[];
}

export default function TaskManagement() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch data with React Query
  const { data: tasks, isLoading } = useQuery<TaskData[], Error>({
    queryKey: ["ketua", "tasks", { selectedStatus, selectedProject }],
    queryFn: () => fetchTasksRequest(selectedStatus, selectedProject),
    staleTime: 30 * 1000, // 30 seconds for real-time feel
  });

  const { data: projects } = useQuery<ProjectOption[], Error>({
    queryKey: ["ketua", "projects", "list"],
    queryFn: fetchProjectsRequest,
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectMembers, isLoading: loadingMembers } = useQuery<
    ProjectMember[],
    Error
  >({
    queryKey: ["ketua", "projects", "members", formData.project_id],
    queryFn: () => fetchProjectMembers(formData.project_id),
    enabled: !!formData.project_id,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    router.prefetch("/ketua-tim/tasks");
    router.prefetch("/ketua-tim/projects");
  }, [router]);

  const handleCreateTask = async () => {
    if (
      !formData.project_id ||
      !formData.assignee_user_id ||
      !formData.title ||
      !formData.description ||
      !formData.start_date ||
      !formData.end_date
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/ketua-tim/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to create task");

      toast.success("Task created successfully!");
      setFormData(initialFormData);
      setIsCreateDialogOpen(false);

      // Invalidate all related queries instantly
      queryClient.invalidateQueries({ queryKey: ["ketua", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "projects"] });
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create task"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleViewTask = (task: TaskData) => {
    setSelectedTask(task);
    setIsViewDialogOpen(true);
  };

  const handleEditTask = (task: TaskData) => {
    setSelectedTask(task);
    setFormData({
      project_id: task.project_id,
      assignee_user_id:
        task.assignee_user_id ||
        (task as unknown as { pegawai_id?: string }).pegawai_id ||
        "",
      title: (task as { title?: string }).title || "",
      description: task.deskripsi_tugas || "",
      start_date: (task as { start_date?: string }).start_date
        ? String((task as { start_date?: string }).start_date).split("T")[0]
        : "",
      end_date: (task as { end_date?: string }).end_date
        ? String((task as { end_date?: string }).end_date).split("T")[0]
        : "",
      has_transport: task.has_transport,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/ketua-tim/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to update task");

      toast.success("Task updated successfully!");
      setFormData(initialFormData);
      setSelectedTask(null);
      setIsEditDialogOpen(false);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["ketua", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/ketua-tim/tasks/${selectedTask.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete task");
      }

      toast.success("Task deleted successfully!");
      setSelectedTask(null);
      setIsDeleteDialogOpen(false);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["ketua", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["ketua", "dashboard"] });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelTransport = async (taskId: string) => {
    try {
      const response = await fetch(
        `/api/ketua-tim/tasks/${taskId}/transport/cancel`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to cancel transport");
      }

      toast.success("Transport allocation canceled");
      queryClient.invalidateQueries({ queryKey: ["ketua", "tasks"] });
    } catch (error) {
      console.error("Error canceling transport:", error);
      toast.error("Failed to cancel transport");
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

  const filteredTasks = (tasks || []).filter((task) => {
    const q = (searchTerm || "").toLowerCase();
    const title = (task as { title?: string }).title
      ? ((task as { title?: string }).title as string).toLowerCase()
      : "";
    const desc = (task.deskripsi_tugas || "").toLowerCase();
    const projectName = (task.projects?.nama_project || "").toLowerCase();
    const assigneeName = (task.users?.nama_lengkap || "").toLowerCase();
    const matchesSearch =
      !q ||
      title.includes(q) ||
      desc.includes(q) ||
      projectName.includes(q) ||
      assigneeName.includes(q);
    return matchesSearch;
  });

  const statusCounts = {
    all: tasks?.length || 0,
    pending: (tasks || []).filter((t) => t.status === "pending").length,
    in_progress: (tasks || []).filter((t) => t.status === "in_progress").length,
    completed: (tasks || []).filter((t) => t.status === "completed").length,
  };

  if (isLoading) {
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
            Advanced Task Management
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Create and manage tasks with transport allocations for your team
            members.
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Create a task with date range and optional transport allocation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      project_id: value,
                      assignee_user_id: "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {(projects || []).map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.nama_project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee">Team Member *</Label>
                <Select
                  value={formData.assignee_user_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      assignee_user_id: value,
                    }))
                  }
                  disabled={!formData.project_id || loadingMembers}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingMembers
                          ? "Loading team members..."
                          : !formData.project_id
                            ? "Select project first"
                            : (projectMembers?.length || 0) === 0
                              ? "No team members available"
                              : "Select team member"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(projectMembers || []).map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{member.nama_lengkap}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {member.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Task Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe the task in detail..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        start_date: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        end_date: e.target.value,
                      }))
                    }
                    min={formData.start_date}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-semibold text-gray-900">
                      Transport Allowance
                    </div>
                    <div className="text-sm text-gray-500">
                      Provide {formatCurrency(150000)} transport allowance
                    </div>
                  </div>
                </div>
                <Switch
                  checked={formData.has_transport}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, has_transport: checked }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setFormData(initialFormData);
                }}
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
            {(projects || []).map((project) => (
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
                const transportAllocation =
                  task.task_transport_allocations?.[0];
                const hasActiveTransport =
                  task.has_transport && !transportAllocation?.canceled_at;

                return (
                  <div
                    key={task.id}
                    className="border-0 shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white"
                  >
                    {/* Colorful top accent */}
                    <div
                      className={`h-1 bg-gradient-to-r ${
                        task.status === "completed"
                          ? "from-emerald-500 to-green-600"
                          : task.status === "in_progress"
                            ? "from-blue-500 to-indigo-600"
                            : "from-amber-500 to-orange-600"
                      }`}
                    />
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge
                              className={`${getStatusColor(task.status)} border flex items-center space-x-1 shadow-sm`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              <span>
                                {task.status.replace("_", " ").toUpperCase()}
                              </span>
                            </Badge>

                            {hasActiveTransport && (
                              <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center space-x-1">
                                <DollarSign className="w-3 h-3" />
                                <span>Transport: {formatCurrency(150000)}</span>
                              </Badge>
                            )}

                            <span className="text-sm text-gray-600">
                              {new Date(task.start_date).toLocaleDateString(
                                "id-ID"
                              )}{" "}
                              -{" "}
                              {new Date(task.end_date).toLocaleDateString(
                                "id-ID"
                              )}
                            </span>
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {task.title}
                          </h3>
                          <p className="text-gray-600 mb-3">
                            {task.deskripsi_tugas}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-indigo-600" />
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  Assigned to
                                </div>
                                <div className="text-gray-600">
                                  {task.users.nama_lengkap}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-emerald-600" />
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  Project
                                </div>
                                <div className="text-gray-600">
                                  {task.projects.nama_project}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Transport Status */}
                          {hasActiveTransport && (
                            <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-green-900 flex items-center">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    Transport Allocation
                                  </div>
                                  <div className="text-sm text-green-700 mt-1">
                                    {transportAllocation?.allocation_date
                                      ? `Allocated for: ${new Date(transportAllocation.allocation_date).toLocaleDateString("id-ID")}`
                                      : "Waiting for date selection"}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="text-sm font-semibold text-green-600">
                                    {formatCurrency(150000)}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleCancelTransport(task.id)
                                    }
                                    className="border-red-200 text-red-600 hover:bg-red-50"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

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
                            onClick={() => handleViewTask(task)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-200 text-green-600 hover:bg-green-50"
                            onClick={() => handleEditTask(task)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedTask(task);
                              setIsDeleteDialogOpen(true);
                            }}
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

      {/* View Task Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              Complete task information and transport allocation status.
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Status
                    </Label>
                    <div className="mt-1">
                      <Badge
                        className={`${getStatusColor(selectedTask.status)} border flex items-center space-x-1 w-fit`}
                      >
                        {(() => {
                          const StatusIcon = getStatusIcon(selectedTask.status);
                          return (
                            <>
                              <StatusIcon className="w-3 h-3" />
                              <span>
                                {selectedTask.status
                                  .replace("_", " ")
                                  .toUpperCase()}
                              </span>
                            </>
                          );
                        })()}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Task Period
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedTask.start_date).toLocaleDateString(
                        "id-ID"
                      )}{" "}
                      -{" "}
                      {new Date(selectedTask.end_date).toLocaleDateString(
                        "id-ID"
                      )}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Assigned To
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTask.users.nama_lengkap}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedTask.users.email}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Project
                    </Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTask.projects.nama_project}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Task Title
                    </Label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {selectedTask.title}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Description
                    </Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {selectedTask.deskripsi_tugas}
                      </p>
                    </div>
                  </div>

                  {/* Transport Information */}
                  {selectedTask.has_transport && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Transport Allocation
                      </Label>
                      <div className="mt-1 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-green-900">
                              Amount: {formatCurrency(150000)}
                            </div>
                            <div className="text-sm text-green-700">
                              {selectedTask.task_transport_allocations?.[0]
                                ?.allocation_date
                                ? `Date: ${new Date(selectedTask.task_transport_allocations[0].allocation_date).toLocaleDateString("id-ID")}`
                                : "Awaiting date selection"}
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {selectedTask.task_transport_allocations?.[0]
                              ?.canceled_at
                              ? "Canceled"
                              : "Active"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTask.response_pegawai && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Employee Response
                      </Label>
                      <div className="mt-1 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">
                          {selectedTask.response_pegawai}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details and transport allocation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Task Title *</Label>
              <Input
                id="edit-title"
                value={formData.title || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter task title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Task Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe the task in detail..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start_date">Start Date *</Label>
                <Input
                  id="edit-start_date"
                  type="date"
                  value={formData.start_date || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end_date">End Date *</Label>
                <Input
                  id="edit-end_date"
                  type="date"
                  value={formData.end_date || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="font-semibold text-gray-900">
                    Transport Allowance
                  </div>
                  <div className="text-sm text-gray-500">
                    Provide {formatCurrency(150000)} transport allowance
                  </div>
                </div>
              </div>
              <Switch
                checked={formData.has_transport}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, has_transport: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setFormData(initialFormData);
                setSelectedTask(null);
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTask}
              disabled={updating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This will also cancel
              any transport allocations.
              {selectedTask && (
                <div className="mt-2 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-900">
                    Task: {selectedTask.title}
                  </p>
                  <p className="text-sm text-red-800 mt-1">
                    {selectedTask.deskripsi_tugas}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Assigned to: {selectedTask.users.nama_lengkap}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Task
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

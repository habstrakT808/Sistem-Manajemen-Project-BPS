// File: src/components/pegawai/TaskInterface.tsx

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
  Calendar,
  User,
  FolderOpen,
  MessageSquare,
  Save,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  deskripsi_tugas: string;
  tanggal_tugas: string;
  status: "pending" | "in_progress" | "completed";
  response_pegawai?: string;
  created_at: string;
  updated_at: string;
  projects: {
    id: string;
    nama_project: string;
    status: string;
    users: {
      nama_lengkap: string;
    };
  };
}

interface TaskInterfaceProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string) => void;
  loading?: boolean;
}

export default function TaskInterface({
  tasks,
  onTaskUpdate,
  loading,
}: TaskInterfaceProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [response, setResponse] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const handleStartTask = async (task: Task) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/pegawai/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start task");
      }

      toast.success("Task started successfully!");
      onTaskUpdate(task.id);
    } catch (error) {
      console.error("Error starting task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start task"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
    setResponse(task.response_pegawai || "");
    setIsExecuteDialogOpen(true);
  };

  const handleSubmitCompletion = async () => {
    if (!selectedTask) return;

    setUpdating(true);
    try {
      const requestBody: { status: string; response_pegawai?: string } = {
        status: "completed",
      };

      if (response.trim()) {
        requestBody.response_pegawai = response.trim();
      }

      const apiResponse = await fetch(`/api/pegawai/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!apiResponse.ok) {
        const error = await apiResponse.json();
        throw new Error(error.error || "Failed to complete task");
      }

      toast.success("Task completed successfully!");
      setIsExecuteDialogOpen(false);
      setSelectedTask(null);
      setResponse("");
      onTaskUpdate(selectedTask.id);
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to complete task"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleEditResponse = (task: Task) => {
    setSelectedTask(task);
    setResponse(task.response_pegawai || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateResponse = async () => {
    if (!selectedTask) return;

    setUpdating(true);
    try {
      const apiResponse = await fetch(`/api/pegawai/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_pegawai: response.trim() }),
      });

      if (!apiResponse.ok) {
        const error = await apiResponse.json();
        throw new Error(error.error || "Failed to update response");
      }

      toast.success("Response updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setResponse("");
      onTaskUpdate(selectedTask.id);
    } catch (error) {
      console.error("Error updating response:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update response"
      );
    } finally {
      setUpdating(false);
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

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.deskripsi_tugas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.projects.nama_project
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || task.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse border-0 shadow-xl rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-lg">
        <div className="flex-1">
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-gray-200"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks ({taskCounts.all})</SelectItem>
            <SelectItem value="pending">
              Pending ({taskCounts.pending})
            </SelectItem>
            <SelectItem value="in_progress">
              In Progress ({taskCounts.in_progress})
            </SelectItem>
            <SelectItem value="completed">
              Completed ({taskCounts.completed})
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tasks found
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? "Try adjusting your search terms"
                : "No tasks available"}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const StatusIcon = getStatusIcon(task.status);
            const isOverdue =
              new Date(task.tanggal_tugas) < new Date() &&
              task.status !== "completed";

            return (
              <div
                key={task.id}
                className={`border-0 shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
                  isOverdue ? "ring-2 ring-red-200" : ""
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Badge
                          className={`${getStatusColor(task.status)} border flex items-center space-x-1`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>
                            {task.status.replace("_", " ").toUpperCase()}
                          </span>
                        </Badge>
                        <Badge
                          className={getProjectStatusColor(
                            task.projects.status
                          )}
                        >
                          {task.projects.status.toUpperCase()}
                        </Badge>
                        {isOverdue && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            OVERDUE
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {task.deskripsi_tugas}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              Due Date
                            </div>
                            <div
                              className={`${isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}`}
                            >
                              {new Date(task.tanggal_tugas).toLocaleDateString(
                                "id-ID"
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <FolderOpen className="w-4 h-4 text-purple-500" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              Project
                            </div>
                            <div className="text-gray-500">
                              {task.projects.nama_project}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-green-500" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              Ketua Tim
                            </div>
                            <div className="text-gray-500">
                              {task.projects.users.nama_lengkap}
                            </div>
                          </div>
                        </div>
                      </div>

                      {task.response_pegawai && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-green-900 flex items-center">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              My Response:
                            </div>
                            {task.status !== "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditResponse(task)}
                                className="border-green-200 text-green-600 hover:bg-green-50"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            )}
                          </div>
                          <div className="text-sm text-green-800">
                            {task.response_pegawai}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 flex flex-col space-y-3">
                      {task.status === "pending" && (
                        <Button
                          onClick={() => handleStartTask(task)}
                          disabled={updating}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Task
                        </Button>
                      )}

                      {task.status === "in_progress" && (
                        <Button
                          onClick={() => handleCompleteTask(task)}
                          disabled={updating}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Complete
                        </Button>
                      )}

                      {task.status === "completed" && (
                        <div className="text-center">
                          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                          <div className="text-sm font-semibold text-green-600">
                            Completed
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(task.updated_at).toLocaleDateString(
                              "id-ID"
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 border-t pt-4">
                    Created:{" "}
                    {new Date(task.created_at).toLocaleDateString("id-ID")} •
                    Updated:{" "}
                    {new Date(task.updated_at).toLocaleDateString("id-ID")}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Completion Dialog */}
      <Dialog open={isExecuteDialogOpen} onOpenChange={setIsExecuteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckSquare className="w-5 h-5 mr-2 text-green-600" />
              Complete Task
            </DialogTitle>
            <DialogDescription>
              Add your response and mark this task as completed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="task-description">Task Description</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                {selectedTask?.deskripsi_tugas}
              </div>
            </div>

            <div>
              <Label htmlFor="response">Your Response (Optional)</Label>
              <Textarea
                id="response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Describe what you accomplished, any issues encountered, or additional notes..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsExecuteDialogOpen(false);
                setResponse("");
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCompletion}
              disabled={updating}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Complete Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Response Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="w-5 h-5 mr-2 text-blue-600" />
              Edit Response
            </DialogTitle>
            <DialogDescription>
              Update your response for this task.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-response">Your Response</Label>
              <Textarea
                id="edit-response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Update your response..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setResponse("");
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateResponse}
              disabled={updating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Response
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

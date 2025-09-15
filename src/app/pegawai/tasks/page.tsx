// File: src/app/pegawai/tasks/page.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, AlertCircle } from "lucide-react";
import TaskInterface from "@/components/pegawai/TaskInterface";
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("status") || "all"
  );

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/pegawai/tasks");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch tasks");
      }

      setTasks(result.data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load tasks";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
    toast.success("Tasks refreshed");
  };

  const handleTaskUpdate = useCallback(async () => {
    // Refresh tasks after update
    await fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchTasks();
      setLoading(false);
    };

    loadData();
  }, [fetchTasks]);

  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const getFilteredTasks = (status: string) => {
    if (status === "all") return tasks;
    return tasks.filter((task) => task.status === status);
  };

  // Error state
  if (error && !tasks.length) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Failed to Load Tasks
            </h2>
            <p className="text-gray-600 max-w-md">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchTasks().finally(() => setLoading(false));
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
            My Tasks
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Manage your assigned tasks and track progress.
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
            Calendar View
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 bg-white shadow-lg rounded-xl p-1 h-auto">
          <TabsTrigger
            value="all"
            className="flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
          >
            <span className="text-sm font-medium">All Tasks</span>
            <Badge className="bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5">
              {taskCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
          >
            <span className="text-sm font-medium">Pending</span>
            <Badge className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5">
              {taskCounts.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="in_progress"
            className="flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
          >
            <span className="text-sm font-medium">In Progress</span>
            <Badge className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5">
              {taskCounts.in_progress}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
          >
            <span className="text-sm font-medium">Completed</span>
            <Badge className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
              {taskCounts.completed}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {["all", "pending", "in_progress", "completed"].map((status) => (
          <TabsContent key={status} value={status}>
            <TaskInterface
              tasks={getFilteredTasks(status)}
              onTaskUpdate={handleTaskUpdate}
              loading={loading}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

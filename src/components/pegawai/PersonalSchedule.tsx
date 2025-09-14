// File: src/components/pegawai/PersonalSchedule.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface ScheduleTask {
  id: string;
  deskripsi_tugas: string;
  tanggal_tugas: string;
  status: "pending" | "in_progress" | "completed";
  project_name: string;
  project_status: string;
}

interface ScheduleData {
  tasks: ScheduleTask[];
  monthly_summary: {
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
  };
}

export default function PersonalSchedule() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchScheduleData = useCallback(async () => {
    try {
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();

      const response = await fetch(
        `/api/pegawai/schedule?month=${month}&year=${year}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch schedule");
      }

      setScheduleData(result);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  const getTasksForDate = (date: Date) => {
    if (!scheduleData) return [];

    const dateString = date.toISOString().split("T")[0];
    return scheduleData.tasks.filter(
      (task) => task.tanggal_tugas === dateString
    );
  };

  const getTaskStatusColor = (status: string) => {
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

  const getTaskStatusIcon = (status: string) => {
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

  const filteredTasks =
    scheduleData?.tasks.filter((task) => {
      if (filterStatus === "all") return true;
      return task.status === filterStatus;
    }) || [];

  const handleMonthChange = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="animate-pulse border-0 shadow-xl rounded-xl p-6 h-96"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse border-0 shadow-xl rounded-xl p-4 h-24"
              ></div>
            ))}
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
            My Schedule
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            View your task schedule and manage your calendar.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Select
            value={viewMode}
            onValueChange={(value: "calendar" | "list") => setViewMode(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="calendar">Calendar</SelectItem>
              <SelectItem value="list">List View</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={fetchScheduleData}
            variant="outline"
            className="border-2 border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
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
                  Total Tasks
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduleData?.monthly_summary.total_tasks || 0}
                </p>
              </div>
              <CalendarDays className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-yellow-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Pending
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduleData?.monthly_summary.pending_tasks || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  In Progress
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduleData?.monthly_summary.in_progress_tasks || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  Completed
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduleData?.monthly_summary.completed_tasks || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <CalendarDays className="w-6 h-6 mr-3" />
                  {viewMode === "calendar" ? "Calendar View" : "List View"}
                </h2>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMonthChange("prev")}
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-white font-semibold min-w-[120px] text-center">
                    {currentMonth.toLocaleDateString("id-ID", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMonthChange("next")}
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {viewMode === "calendar" ? (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="rounded-md border-0"
                  modifiers={{
                    hasTask: (date) => getTasksForDate(date).length > 0,
                  }}
                  modifiersStyles={{
                    hasTask: {
                      backgroundColor: "#dcfce7",
                      color: "#166534",
                      fontWeight: "bold",
                    },
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map((task) => {
                    const TaskStatusIcon = getTaskStatusIcon(task.status);
                    return (
                      <div
                        key={task.id}
                        className="p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Badge
                                className={`${getTaskStatusColor(task.status)} border flex items-center space-x-1`}
                              >
                                <TaskStatusIcon className="w-3 h-3" />
                                <span>
                                  {task.status.replace("_", " ").toUpperCase()}
                                </span>
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {new Date(
                                  task.tanggal_tugas
                                ).toLocaleDateString("id-ID")}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {task.deskripsi_tugas}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Project: {task.project_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Date Tasks */}
        <div className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
              <h3 className="font-bold text-white">
                {selectedDate.toLocaleDateString("id-ID", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
            </div>
            <div className="p-4">
              {getTasksForDate(selectedDate).length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No tasks for this date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getTasksForDate(selectedDate).map((task) => {
                    const TaskStatusIcon = getTaskStatusIcon(task.status);
                    return (
                      <div
                        key={task.id}
                        className="p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge
                            className={`${getTaskStatusColor(task.status)} text-xs`}
                          >
                            <TaskStatusIcon className="w-3 h-3 mr-1" />
                            {task.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">
                          {task.deskripsi_tugas}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {task.project_name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Filter */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
              <h3 className="font-bold text-white flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter Tasks
              </h3>
            </div>
            <div className="p-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

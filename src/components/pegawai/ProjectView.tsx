// File: src/components/pegawai/ProjectView.tsx

"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  User,
  ClipboardList,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

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

interface ProjectViewProps {
  projects: ProjectData[];
  loading?: boolean;
}

export default function ProjectView({ projects, loading }: ProjectViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return AlertTriangle;
      case "upcoming":
        return Clock;
      case "completed":
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-lg">
        <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Projects Assigned
        </h3>
        <p className="text-gray-500">
          You haven&apos;t been assigned to any projects yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {projects.map((project) => {
        const StatusIcon = getStatusIcon(project.status);
        const daysUntilDeadline = getDaysUntilDeadline(project.deadline);
        const isOverdue = daysUntilDeadline < 0;
        const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline >= 0;

        return (
          <div
            key={project.id}
            className={`border-0 shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
              isOverdue
                ? "ring-2 ring-red-200"
                : isUrgent
                  ? "ring-2 ring-yellow-200"
                  : ""
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Badge
                      className={`${getStatusColor(project.status)} border flex items-center space-x-1`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{project.status.toUpperCase()}</span>
                    </Badge>
                    {isOverdue && (
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        OVERDUE
                      </Badge>
                    )}
                    {isUrgent && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        URGENT
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {project.nama_project}
                  </h3>
                  <p className="text-gray-600 mb-4">{project.deskripsi}</p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          Deadline
                        </div>
                        <div
                          className={`${isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}`}
                        >
                          {new Date(project.deadline).toLocaleDateString(
                            "id-ID"
                          )}
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
                          {project.ketua_tim.nama_lengkap}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          Team Size
                        </div>
                        <div className="text-gray-500">
                          {project.team_size} members
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-yellow-500" />
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          My Transport
                        </div>
                        <div className="text-gray-500">
                          {formatCurrency(project.uang_transport)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* My Progress */}
                  <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Target className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-900">
                          My Progress
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-green-600">
                        {project.my_progress}%
                      </span>
                    </div>

                    <div className="w-full bg-green-200 rounded-full h-3 mb-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-teal-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${project.my_progress}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-yellow-600">
                          {project.my_task_stats.pending}
                        </div>
                        <div className="text-xs text-gray-600">Pending</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {project.my_task_stats.in_progress}
                        </div>
                        <div className="text-xs text-gray-600">In Progress</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {project.my_task_stats.completed}
                        </div>
                        <div className="text-xs text-gray-600">Completed</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-600">
                          {project.my_task_stats.total}
                        </div>
                        <div className="text-xs text-gray-600">Total</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-6 flex flex-col space-y-3">
                  <Button
                    asChild
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    <Link href={`/pegawai/projects/${project.id}`}>
                      <FolderOpen className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl"
                  >
                    <Link href={`/pegawai/tasks?project_id=${project.id}`}>
                      <ClipboardList className="w-4 h-4 mr-2" />
                      My Tasks
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-400 border-t pt-4">
                Started:{" "}
                {new Date(project.tanggal_mulai).toLocaleDateString("id-ID")} •
                {isOverdue
                  ? ` Overdue by ${Math.abs(daysUntilDeadline)} days`
                  : daysUntilDeadline === 0
                    ? " Due today"
                    : ` ${daysUntilDeadline} days remaining`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

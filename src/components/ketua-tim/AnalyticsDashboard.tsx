// File: src/components/ketua-tim/AnalyticsDashboard.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  Award,
  RefreshCw,
  AlertCircle,
  Download,
  Calendar,
  CheckCircle,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

interface AnalyticsStats {
  total_projects: number;
  completion_rate: number;
  average_project_duration: number;
  team_utilization: number;
  on_time_delivery: number;
  budget_efficiency: number;
}

interface ProjectPerformance {
  project_name: string;
  completion_percentage: number;
  days_remaining: number;
  team_size: number;
  budget_used: number;
  status: "on_track" | "at_risk" | "delayed";
}

interface TeamProductivity {
  member_name: string;
  tasks_completed: number;
  tasks_pending: number;
  completion_rate: number;
  projects_assigned: number;
  workload_level: "low" | "medium" | "high";
}

interface AnalyticsData {
  stats: AnalyticsStats;
  project_performance: ProjectPerformance[];
  team_productivity: TeamProductivity[];
  monthly_trends: {
    month: string;
    projects_completed: number;
    tasks_completed: number;
    budget_spent: number;
  }[];
}

async function fetchAnalyticsData(selectedPeriod: string): Promise<AnalyticsData> {
  const response = await fetch(`/api/ketua-tim/analytics?period=${selectedPeriod}`, { cache: "no-store" });
  if (!response.ok) {
    const errorResult = await response.json();
    throw new Error(errorResult.error || "Failed to fetch analytics data");
  }
  const result = await response.json();
  return result as AnalyticsData;
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState("3_months");

  const { data: analyticsData, isLoading, isFetching, error, refetch } = useQuery<AnalyticsData, Error>({
    queryKey: ["ketua","analytics", { selectedPeriod }],
    queryFn: () => fetchAnalyticsData(selectedPeriod),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    router.prefetch("/ketua-tim/projects");
    router.prefetch("/ketua-tim/team");
    router.prefetch("/ketua-tim/tasks");
    router.prefetch("/ketua-tim/financial");
  }, [router]);

  const handleRefresh = async () => {
    const res = await refetch();
    if (res.error) toast.error(res.error.message);
    else toast.success("Analytics data refreshed");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track":
        return "bg-green-100 text-green-800 border-green-200";
      case "at_risk":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "delayed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Loading skeleton
  if (isLoading && !analyticsData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse border-0 shadow-xl rounded-xl">
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !analyticsData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Failed to Load Analytics</h2>
            <p className="text-gray-600 max-w-md">{error.message}</p>
            <Button onClick={handleRefresh} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  const { stats, project_performance, team_productivity } = analyticsData;

  const statsCards = [
    { title: "Total Projects", value: stats.total_projects.toString(), description: "All time projects", icon: BarChart3, color: "from-blue-500 to-blue-600", bgColor: "from-blue-50 to-blue-100" },
    { title: "Completion Rate", value: `${stats.completion_rate}%`, description: "Projects completed", icon: CheckCircle, color: "from-green-500 to-green-600", bgColor: "from-green-50 to-green-100" },
    { title: "Avg Duration", value: `${stats.average_project_duration} days`, description: "Project completion time", icon: Clock, color: "from-purple-500 to-purple-600", bgColor: "from-purple-50 to-purple-100" },
    { title: "Team Utilization", value: `${stats.team_utilization}%`, description: "Team efficiency", icon: Users, color: "from-orange-500 to-orange-600", bgColor: "from-orange-50 to-orange-100" },
    { title: "On-Time Delivery", value: `${stats.on_time_delivery}%`, description: "Projects on schedule", icon: Target, color: "from-teal-500 to-teal-600", bgColor: "from-teal-50 to-teal-100" },
    { title: "Budget Efficiency", value: `${stats.budget_efficiency}%`, description: "Budget utilization", icon: Award, color: "from-pink-500 to-pink-600", bgColor: "from-pink-50 to-pink-100" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Analytics Dashboard</h1>
          <p className="text-gray-600 text-lg mt-2">Track performance, productivity, and project insights.</p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1_month">Last Month</SelectItem>
              <SelectItem value="3_months">Last 3 Months</SelectItem>
              <SelectItem value="6_months">Last 6 Months</SelectItem>
              <SelectItem value="1_year">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleRefresh} disabled={isFetching} variant="outline" className="border-2 border-gray-200 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden rounded-xl">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-50`}></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600 mb-2">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.description}</p>
                  </div>
                  <div className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Performance & Team Productivity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Project Performance */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white text-xl font-semibold">
                <Activity className="w-6 h-6 mr-3" />
                Project Performance
              </div>
              <Badge className="bg-white/20 text-white">{project_performance.length}</Badge>
            </div>
            <div className="text-blue-100 mt-2 text-sm">Current project status and progress</div>
          </div>
          <div className="p-6 space-y-4">
            {project_performance.map((project, index) => (
              <div key={index} className="p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-900">{project.project_name}</div>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Progress</div>
                    <div className="font-semibold">{project.completion_percentage}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Days Left</div>
                    <div className="font-semibold">{project.days_remaining} days</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Team Size</div>
                    <div className="font-semibold">{project.team_size} members</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Budget Used</div>
                    <div className="font-semibold">{project.budget_used}%</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{project.completion_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${project.completion_percentage}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Productivity */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white text-xl font-semibold">
                <Users className="w-6 h-6 mr-3" />
                Team Productivity
              </div>
              <Badge className="bg-white/20 text-white">{team_productivity.length}</Badge>
            </div>
            <div className="text-green-100 mt-2 text-sm">Individual team member performance</div>
          </div>
          <div className="p-6 space-y-4">
            {team_productivity.map((member, index) => (
              <div key={index} className="p-4 rounded-2xl border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-900">{member.member_name}</div>
                  <Badge className={getWorkloadColor(member.workload_level)}>
                    {member.workload_level.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Completed</div>
                    <div className="font-semibold">{member.tasks_completed} tasks</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Pending</div>
                    <div className="font-semibold">{member.tasks_pending} tasks</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Success Rate</div>
                    <div className="font-semibold">{member.completion_rate}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Projects</div>
                    <div className="font-semibold">{member.projects_assigned} active</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Completion Rate</span>
                    <span>{member.completion_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-300" style={{ width: `${member.completion_rate}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="border-0 shadow-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white overflow-hidden rounded-xl">
        <div className="p-8">
          <h3 className="text-2xl font-bold mb-6">Performance Summary</h3>
          <div className="grid md:grid-cols-4 gap-8 text-center relative">
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Target className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">{stats.completion_rate}%</div>
              <div className="text-purple-100 text-sm">Overall completion rate</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">{stats.team_utilization}%</div>
              <div className="text-purple-100 text-sm">Team utilization rate</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">{stats.on_time_delivery}%</div>
              <div className="text-purple-100 text-sm">On-time delivery rate</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Award className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">{stats.budget_efficiency}%</div>
              <div className="text-purple-100 text-sm">Budget efficiency rate</div>
            </div>

            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full translate-y-12 -translate-x-12"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

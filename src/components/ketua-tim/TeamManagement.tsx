// File: src/components/ketua-tim/TeamManagement.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MitraReviews } from ".";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Filter,
  TrendingUp,
  BarChart3,
  DollarSign,
  ClipboardList,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { LineChart, BarChart, PieChart } from "@/components/charts";
import Link from "next/link";

interface TeamMember {
  id: string;
  nama_lengkap: string;
  email: string;
  is_active: boolean;
  workload: {
    project_count: number;
    workload_level: "low" | "medium" | "high";
  };
  current_projects: Array<{
    id: string;
    nama_project: string;
    status: string;
    deadline: string;
  }>;
  task_stats: {
    pending: number;
    in_progress: number;
    completed: number;
    total: number;
  };
  monthly_earnings: number;
}

interface TeamAnalytics {
  overview: {
    total_team_members: number;
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    period_days: number;
  };
  workload_distribution: Array<{
    pegawai_id: string;
    nama_lengkap: string;
    project_count: number;
    workload_level: string;
  }>;
  task_trends: Array<{
    date: string;
    completed: number;
    in_progress: number;
    pending: number;
    total: number;
  }>;
  member_performance: Array<{
    pegawai_id: string;
    nama_lengkap: string;
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
  }>;
}

async function fetchTeamData(): Promise<TeamMember[]> {
  // Use authenticated ketua tim endpoint with stats
  const response = await fetch("/api/ketua-tim/team?include_stats=true", {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Failed to fetch team data");
  return result.data as TeamMember[];
}

async function fetchTeamAnalytics(
  analyticsPeriod: string,
): Promise<TeamAnalytics> {
  const response = await fetch(
    `/api/ketua-tim/team/analytics?period=${analyticsPeriod}`,
    { cache: "no-store" },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Failed to fetch analytics");
  return result.data as TeamAnalytics;
}

export default function TeamManagement() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [workloadFilter, setWorkloadFilter] = useState<string>("all");
  const [analyticsPeriod, setAnalyticsPeriod] = useState("30");

  const {
    data: teamMembers,
    isLoading,
    refetch,
  } = useQuery<TeamMember[], Error>({
    queryKey: ["ketua", "team", "members"],
    queryFn: fetchTeamData,
    staleTime: 5 * 60 * 1000,
  });

  const prefetchMemberDetail = useCallback(
    (memberId: string) => {
      const key = ["ketua", "team", "member", memberId];
      queryClient.prefetchQuery({
        queryKey: key,
        queryFn: async () => {
          const res = await fetch(`/api/ketua-tim/team/${memberId}`, {
            cache: "no-store",
          });
          const json = await res.json();
          if (!res.ok)
            throw new Error(json.error || "Failed to fetch member data");
          return json.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient],
  );

  // Prefetch member details for better UX
  useEffect(() => {
    if (!teamMembers || teamMembers.length === 0) return;
    const topMembers = teamMembers.slice(0, 10);
    topMembers.forEach((m) => {
      // Warm Next.js route cache
      router.prefetch(`/ketua-tim/team/${m.id}`);
      // Warm React Query cache
      prefetchMemberDetail(m.id);
    });
  }, [teamMembers, router, prefetchMemberDetail]);

  const {
    data: analytics,
    isFetching: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery<TeamAnalytics, Error>({
    queryKey: ["ketua", "team", "analytics", { analyticsPeriod }],
    queryFn: () => fetchTeamAnalytics(analyticsPeriod),
    staleTime: 0,
  });

  useEffect(() => {
    router.prefetch("/ketua-tim/team");
    router.prefetch("/ketua-tim/projects");
    router.prefetch("/ketua-tim/tasks");
  }, [router]);

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

  const getWorkloadLabel = (level: string) => {
    switch (level) {
      case "low":
        return "Ringan";
      case "medium":
        return "Sedang";
      case "high":
        return "Berat";
      default:
        return "Unknown";
    }
  };

  const getWorkloadIcon = (level: string) => {
    switch (level) {
      case "low":
        return CheckCircle;
      case "medium":
        return AlertCircle;
      case "high":
        return Clock;
      default:
        return CheckCircle;
    }
  };

  const getWorkloadGradient = (level: string) => {
    switch (level) {
      case "low":
        return "from-emerald-500 to-teal-500";
      case "medium":
        return "from-amber-500 to-orange-500";
      case "high":
        return "from-rose-600 to-red-600";
      default:
        return "from-blue-500 to-indigo-500";
    }
  };

  const filteredMembers = (teamMembers || []).filter((member) => {
    const matchesSearch =
      member.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesWorkload =
      workloadFilter === "all" ||
      member.workload.workload_level === workloadFilter;

    return matchesSearch && matchesWorkload;
  });

  // Ensure unique members by id to avoid duplicate React keys
  const uniqueFilteredMembers = React.useMemo(() => {
    const seen = new Set<string>();
    return filteredMembers.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [filteredMembers]);

  const workloadCounts = {
    all: teamMembers?.length || 0,
    low: (teamMembers || []).filter((m) => m.workload.workload_level === "low")
      .length,
    medium: (teamMembers || []).filter(
      (m) => m.workload.workload_level === "medium",
    ).length,
    high: (teamMembers || []).filter(
      (m) => m.workload.workload_level === "high",
    ).length,
  };

  // Prepare chart data
  const workloadChartData = [
    { name: "Ringan", value: workloadCounts.low, color: "#10B981" },
    { name: "Sedang", value: workloadCounts.medium, color: "#F59E0B" },
    { name: "Berat", value: workloadCounts.high, color: "#EF4444" },
  ];

  const taskTrendChartData =
    analytics?.task_trends.map((trend) => ({
      date: new Date(trend.date).toLocaleDateString("id-ID", {
        month: "short",
        day: "numeric",
      }),
      Completed: trend.completed,
      "In Progress": trend.in_progress,
      Pending: trend.pending,
    })) || [];

  const performanceChartData =
    analytics?.member_performance.map((perf) => ({
      name: perf.nama_lengkap.split(" ")[0],
      completion_rate: perf.completion_rate,
      total_tasks: perf.total_tasks,
    })) || [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading team data...</p>
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
            Team Management
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Monitor team workload, performance, and manage assignments
            effectively.
          </p>
        </div>

        <div className="flex space-x-4">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Users className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="flex items-center text-white text-xl font-semibold">
                <Users className="w-6 h-6 mr-3" />
                {analytics.overview.total_team_members}
              </div>
              <div className="text-blue-100 mt-2 text-sm">Team Members</div>
            </div>
          </div>

          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <div className="flex items-center text-white text-xl font-semibold">
                <ClipboardList className="w-6 h-6 mr-3" />
                {analytics.overview.total_tasks}
              </div>
              <div className="text-green-100 mt-2 text-sm">Total Tasks</div>
            </div>
          </div>

          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6">
              <div className="flex items-center text-white text-xl font-semibold">
                <CheckCircle className="w-6 h-6 mr-3" />
                {analytics.overview.completed_tasks}
              </div>
              <div className="text-orange-100 mt-2 text-sm">
                Completed Tasks
              </div>
            </div>
          </div>

          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <div className="flex items-center text-white text-xl font-semibold">
                <TrendingUp className="w-6 h-6 mr-3" />
                {analytics.overview.completion_rate}%
              </div>
              <div className="text-purple-100 mt-2 text-sm">
                Completion Rate
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team">Team Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Performance</TabsTrigger>
          <TabsTrigger value="mitra-reviews">Mitra Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          {/* Search & Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={workloadFilter} onValueChange={setWorkloadFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Workloads" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workloads</SelectItem>
                <SelectItem value="low">
                  Ringan ({workloadCounts.low})
                </SelectItem>
                <SelectItem value="medium">
                  Sedang ({workloadCounts.medium})
                </SelectItem>
                <SelectItem value="high">
                  Berat ({workloadCounts.high})
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

          {/* Team Members Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredMembers.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No team members found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            ) : (
              uniqueFilteredMembers.map((member) => {
                const WorkloadIcon = getWorkloadIcon(
                  member.workload.workload_level,
                );
                const completionRate =
                  member.task_stats.total > 0
                    ? Math.round(
                        (member.task_stats.completed /
                          member.task_stats.total) *
                          100,
                      )
                    : 0;

                return (
                  <div
                    key={member.id}
                    className="border-0 shadow-xl rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white"
                    onMouseEnter={() => {
                      router.prefetch(`/ketua-tim/team/${member.id}`);
                      prefetchMemberDetail(member.id);
                    }}
                  >
                    {/* Colorful accent matching workload */}
                    <div
                      className={`h-1 bg-gradient-to-r ${getWorkloadGradient(member.workload.workload_level)}`}
                    />
                    <div className="p-6">
                      {/* Member Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-16 h-16 bg-gradient-to-r ${getWorkloadGradient(member.workload.workload_level)} rounded-full flex items-center justify-center shadow-md`}
                          >
                            <span className="text-white font-bold text-xl">
                              {member.nama_lengkap.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {member.nama_lengkap}
                            </h3>
                            <p className="text-gray-500">{member.email}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge
                                className={`${getWorkloadColor(member.workload.workload_level)} border flex items-center space-x-1 shadow-sm`}
                              >
                                <WorkloadIcon className="w-3 h-3" />
                                <span>
                                  {getWorkloadLabel(
                                    member.workload.workload_level,
                                  )}
                                </span>
                              </Badge>
                              <Badge className="bg-blue-100 text-blue-800 shadow-sm">
                                {member.workload.project_count} Projects
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <Link
                            href={`/ketua-tim/team/${member.id}`}
                            prefetch
                            onMouseEnter={() => {
                              router.prefetch(`/ketua-tim/team/${member.id}`);
                              prefetchMemberDetail(member.id);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Link>
                        </Button>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-emerald-50 rounded-lg">
                          <div className="text-2xl font-bold text-emerald-600">
                            {completionRate}%
                          </div>
                          <div className="text-sm text-emerald-700">
                            Task Completion
                          </div>
                        </div>
                        <div className="text-center p-3 bg-indigo-50 rounded-lg">
                          <div className="text-2xl font-bold text-indigo-600">
                            {member.task_stats.total}
                          </div>
                          <div className="text-sm text-indigo-700">
                            Total Tasks
                          </div>
                        </div>
                      </div>

                      {/* Task Breakdown */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Task Progress</span>
                          <span className="font-semibold text-gray-900">
                            {member.task_stats.completed}/
                            {member.task_stats.total}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Pending: {member.task_stats.pending}</span>
                          <span>
                            In Progress: {member.task_stats.in_progress}
                          </span>
                          <span>Completed: {member.task_stats.completed}</span>
                        </div>
                      </div>

                      {/* Current Projects */}
                      <div className="space-y-2 mb-4">
                        <h4 className="font-semibold text-gray-900">
                          Current Projects
                        </h4>
                        {member.current_projects.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No active projects
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {member.current_projects
                              .slice(0, 2)
                              .map((project) => (
                                <div key={project.id} className="text-sm">
                                  <span className="font-medium text-gray-900">
                                    {project.nama_project}
                                  </span>
                                  <span className="text-gray-500 ml-2">
                                    • Due:{" "}
                                    {new Date(
                                      project.deadline,
                                    ).toLocaleDateString("id-ID")}
                                  </span>
                                </div>
                              ))}
                            {member.current_projects.length > 2 && (
                              <p className="text-sm text-gray-500">
                                +{member.current_projects.length - 2} more
                                projects
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Monthly Earnings */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm text-gray-600">
                            Monthly Earnings
                          </span>
                        </div>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(member.monthly_earnings)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics Controls */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Team Analytics
            </h2>
            <div className="flex items-center space-x-4">
              <Select
                value={analyticsPeriod}
                onValueChange={setAnalyticsPeriod}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => refetchAnalytics()}
                disabled={analyticsLoading}
                variant="outline"
                className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                {analyticsLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          {analyticsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Loading analytics...</p>
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Workload Distribution */}
              <div className="border-0 shadow-xl rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                  <div className="flex items-center text-white text-xl font-semibold">
                    <Users className="w-6 h-6 mr-3" />
                    Workload Distribution
                  </div>
                  <div className="text-purple-100 mt-2 text-sm">
                    Team workload breakdown
                  </div>
                </div>
                <div className="p-6">
                  <PieChart
                    data={workloadChartData}
                    dataKey="value"
                    nameKey="name"
                    colors={["#10B981", "#F59E0B", "#EF4444"]}
                    height={250}
                  />
                </div>
              </div>

              {/* Task Completion Trends */}
              <div className="border-0 shadow-xl rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                  <div className="flex items-center text-white text-xl font-semibold">
                    <TrendingUp className="w-6 h-6 mr-3" />
                    Task Completion Trends
                  </div>
                  <div className="text-blue-100 mt-2 text-sm">
                    Daily task completion over time
                  </div>
                </div>
                <div className="p-6">
                  <LineChart
                    data={taskTrendChartData}
                    xAxisKey="date"
                    height={250}
                    lines={[
                      {
                        dataKey: "Completed",
                        stroke: "#10B981",
                        name: "Completed",
                      },
                      {
                        dataKey: "In Progress",
                        stroke: "#3B82F6",
                        name: "In Progress",
                      },
                      {
                        dataKey: "Pending",
                        stroke: "#F59E0B",
                        name: "Pending",
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Member Performance */}
              <div className="lg:col-span-2 border-0 shadow-xl rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
                  <div className="flex items-center text-white text-xl font-semibold">
                    <BarChart3 className="w-6 h-6 mr-3" />
                    Member Performance Comparison
                  </div>
                  <div className="text-green-100 mt-2 text-sm">
                    Task completion rates by team member
                  </div>
                </div>
                <div className="p-6">
                  <BarChart
                    data={performanceChartData}
                    xAxisKey="name"
                    height={300}
                    bars={[
                      {
                        dataKey: "completion_rate",
                        fill: "#10B981",
                        name: "Completion Rate %",
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No analytics data
              </h3>
              <p className="text-gray-500">
                Analytics data will appear here once you have team activities.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mitra-reviews" className="space-y-6">
          <MitraReviews />
        </TabsContent>
      </Tabs>
    </div>
  );
}

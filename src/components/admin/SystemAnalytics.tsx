// File: src/components/admin/SystemAnalytics.tsx

"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, AreaChart, PieChart, BarChart } from "@/components/charts";
import {
  TrendingUp,
  Users,
  FolderOpen,
  DollarSign,
  Database,
  Activity,
  Download,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsData {
  userTrends: Array<{
    date: string;
    new_users: number;
    active_users: number;
  }>;
  projectAnalytics: Array<{
    month: string;
    total_projects: number;
    completed_projects: number;
  }>;
  financialAnalytics: Array<{
    month: string;
    total_spending: number;
    total_income: number;
  }>;
  systemMetrics: {
    uptime: number;
    response_time: number;
    error_rate: number;
    project_status_distribution: Record<string, number>;
  };
}

export default function SystemAnalytics() {
  const [timeRange, setTimeRange] = useState("30");

  const fetchAnalyticsData = useCallback(async (daysBack: string) => {
    const [userTrends, projectAnalytics, financialAnalytics, systemMetrics] =
      await Promise.all([
        fetch(
          `/api/admin/analytics?type=user_trends&days_back=${daysBack}`
        ).then((res) => res.json()),
        fetch(
          `/api/admin/analytics?type=project_analytics&days_back=${daysBack}`
        ).then((res) => res.json()),
        fetch(
          `/api/admin/analytics?type=financial_analytics&months_back=12`
        ).then((res) => res.json()),
        fetch(`/api/admin/analytics?type=system_metrics`).then((res) =>
          res.json()
        ),
      ]);

    const data: AnalyticsData = {
      userTrends: userTrends.data || [],
      projectAnalytics: projectAnalytics.data || [],
      financialAnalytics: financialAnalytics.data || [],
      systemMetrics: systemMetrics.data || {},
    };

    return data;
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery<
    AnalyticsData,
    Error
  >({
    queryKey: ["admin", "analytics", { timeRange }],
    queryFn: () => fetchAnalyticsData(timeRange),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    // trigger refetch when timeRange changes (React Query already does via key)
  }, [timeRange]);

  if (isLoading && !data) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    {
      title: "Total Users",
      value: data.systemMetrics.total_users,
      description: `${data.systemMetrics.active_users} active users`,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      change: "0%",
      changeType: "neutral" as const,
    },
    {
      title: "Active Projects",
      value: data.systemMetrics.active_projects,
      description: `${data.systemMetrics.completed_projects} completed`,
      icon: FolderOpen,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      change: "0%",
      changeType: "neutral" as const,
    },
    {
      title: "This Month Spending",
      value: formatCurrency(data.systemMetrics.this_month_spending),
      description: "Monthly expenses",
      icon: DollarSign,
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
      change: "0%",
      changeType: "neutral" as const,
    },
    {
      title: "Database Size",
      value: data.systemMetrics.database_size,
      description: `${data.systemMetrics.total_tables} tables`,
      icon: Database,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      change: "+5%",
      changeType: "positive" as const,
    },
  ];

  const userRoleData = Object.entries(
    data.systemMetrics.user_roles_distribution || {}
  ).map(([role, count]) => ({
    name: role.replace("_", " ").toUpperCase(),
    value: count,
  }));

  const projectStatusData = Object.entries(
    data.systemMetrics.project_status_distribution || {}
  ).map(([status, count]) => ({
    name: status.replace("_", " ").toUpperCase(),
    value: count,
  }));

  const roleColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
  const statusColors = ["#8B5CF6", "#06B6D4", "#84CC16", "#F97316"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            System Analytics
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Comprehensive insights and performance metrics
          </p>
        </div>

        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <Button
            variant="outline"
            className="border-2 border-green-200 text-green-600 hover:bg-green-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <Card
              key={index}
              className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${kpi.bgColor} opacity-50`}
              ></div>
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600 mb-2">
                      {kpi.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mb-1">
                      {kpi.value}
                    </p>
                    <p className="text-sm text-gray-500">{kpi.description}</p>
                  </div>
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${kpi.color} rounded-2xl flex items-center justify-center shadow-lg`}
                  >
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {kpi.changeType === "positive" ? (
                      <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        kpi.changeType === "positive"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {kpi.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      vs last month
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4" />
            <span>Projects</span>
          </TabsTrigger>
          <TabsTrigger
            value="financial"
            className="flex items-center space-x-2"
          >
            <DollarSign className="w-4 h-4" />
            <span>Financial</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Roles Distribution */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                <div className="font-semibold flex items-center text-white text-xl">
                  <PieChartIcon className="w-6 h-6 mr-3" />
                  User Roles Distribution
                </div>
                <div className="text-sm text-blue-100 mt-2">
                  Active users by role
                </div>
              </div>
              <div className="p-6">
                <PieChart
                  data={userRoleData}
                  dataKey="value"
                  nameKey="name"
                  colors={roleColors}
                  height={250}
                />
              </div>
            </div>

            {/* Project Status Distribution */}
            <div className="border-0 shadow-xl rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
                <div className="font-semibold flex items-center text-white text-xl">
                  <BarChart3 className="w-6 h-6 mr-3" />
                  Project Status Distribution
                </div>
                <div className="text-sm text-green-100 mt-2">
                  Projects by status
                </div>
              </div>
              <div className="p-6">
                <PieChart
                  data={projectStatusData}
                  dataKey="value"
                  nameKey="name"
                  colors={statusColors}
                  height={250}
                />
              </div>
            </div>
          </div>

          {/* System Health Metrics */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <div className="font-semibold flex items-center text-white text-xl">
                <Activity className="w-6 h-6 mr-3" />
                System Health Metrics
              </div>
              <div className="text-sm text-purple-100 mt-2">
                Real-time system performance indicators
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {data.systemMetrics.pending_tasks}
                  </div>
                  <div className="text-sm text-gray-500">Pending Tasks</div>
                  <Badge
                    variant="outline"
                    className="mt-2 text-yellow-600 border-yellow-600"
                  >
                    Active
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {data.systemMetrics.unread_notifications}
                  </div>
                  <div className="text-sm text-gray-500">
                    Unread Notifications
                  </div>
                  <Badge
                    variant="outline"
                    className="mt-2 text-blue-600 border-blue-600"
                  >
                    Normal
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {Math.round(data.systemMetrics.avg_project_duration)}
                  </div>
                  <div className="text-sm text-gray-500">Avg Project Days</div>
                  <Badge
                    variant="outline"
                    className="mt-2 text-green-600 border-green-600"
                  >
                    Good
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {data.systemMetrics.active_mitra}
                  </div>
                  <div className="text-sm text-gray-500">Active Partners</div>
                  <Badge
                    variant="outline"
                    className="mt-2 text-purple-600 border-purple-600"
                  >
                    Available
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="font-semibold flex items-center text-white text-xl">
                <Users className="w-6 h-6 mr-3" />
                User Registration Trends
              </div>
              <div className="text-sm text-blue-100 mt-2">
                Daily user registrations over time
              </div>
            </div>
            <div className="p-6">
              <LineChart
                data={data.userTrends}
                xAxisKey="date"
                height={400}
                lines={[
                  {
                    dataKey: "total_registrations",
                    stroke: "#3B82F6",
                    name: "Total Registrations",
                  },
                  { dataKey: "admin_count", stroke: "#EF4444", name: "Admins" },
                  {
                    dataKey: "ketua_tim_count",
                    stroke: "#10B981",
                    name: "Ketua Tim",
                  },
                  {
                    dataKey: "pegawai_count",
                    stroke: "#F59E0B",
                    name: "Pegawai",
                  },
                ]}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
              <div className="font-semibold flex items-center text-white text-xl">
                <FolderOpen className="w-6 h-6 mr-3" />
                Project Analytics
              </div>
              <div className="text-sm text-green-100 mt-2">
                Project creation and completion trends
              </div>
            </div>
            <div className="p-6">
              <AreaChart
                data={data.projectAnalytics}
                xAxisKey="date"
                height={400}
                areas={[
                  {
                    dataKey: "projects_created",
                    stroke: "#10B981",
                    fill: "#10B981",
                    name: "Created",
                  },
                  {
                    dataKey: "projects_completed",
                    stroke: "#3B82F6",
                    fill: "#3B82F6",
                    name: "Completed",
                  },
                  {
                    dataKey: "active_projects",
                    stroke: "#F59E0B",
                    fill: "#F59E0B",
                    name: "Active",
                  },
                ]}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6">
              <div className="font-semibold flex items-center text-white text-xl">
                <DollarSign className="w-6 h-6 mr-3" />
                Financial Analytics
              </div>
              <div className="text-sm text-orange-100 mt-2">
                Monthly spending breakdown and trends
              </div>
            </div>
            <div className="p-6">
              <BarChart
                data={data.financialAnalytics}
                xAxisKey="month_year"
                height={400}
                bars={[
                  {
                    dataKey: "transport_spending",
                    fill: "#3B82F6",
                    name: "Transport",
                  },
                  { dataKey: "honor_spending", fill: "#10B981", name: "Honor" },
                ]}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

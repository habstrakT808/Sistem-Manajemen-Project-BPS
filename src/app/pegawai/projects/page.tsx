"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, AlertCircle } from "lucide-react";
import ProjectView from "@/components/pegawai/ProjectView";
import { toast } from "sonner";

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

async function fetchProjectsRequest(): Promise<ProjectData[]> {
  const response = await fetch("/api/pegawai/projects", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch projects");
  }
  return result.data || [];
}

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const {
    data: projects = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<ProjectData[], Error>({
    queryKey: ["pegawai", "projects"],
    queryFn: fetchProjectsRequest,
    staleTime: 5 * 60 * 1000,
  });

  const projectCounts = useMemo(
    () => ({
      all: projects.length,
      upcoming: projects.filter((p) => p.status === "upcoming").length,
      active: projects.filter((p) => p.status === "active").length,
      completed: projects.filter((p) => p.status === "completed").length,
    }),
    [projects]
  );

  const getFilteredProjects = (status: string) => {
    if (status === "all") return projects;
    return projects.filter((project) => project.status === status);
  };

  const handleRefresh = async () => {
    const res = await refetch();
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success("Projects refreshed");
    }
  };

  if (error && projects.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Failed to Load Projects
            </h2>
            <p className="text-gray-600 max-w-md">{error.message}</p>
            <Button
              onClick={handleRefresh}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
              />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            My Projects
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Projects you&apos;re participating in and your contributions.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={handleRefresh}
            disabled={isFetching}
            variant="outline"
            className="border-2 border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            variant="outline"
            className="border-2 border-green-200 text-green-600 hover:bg-green-50"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Timeline View
          </Button>
        </div>
      </div>

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
            <span className="text-sm font-medium">All Projects</span>
            <Badge className="bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5">
              {projectCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="upcoming"
            className="flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
          >
            <span className="text-sm font-medium">Upcoming</span>
            <Badge className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5">
              {projectCounts.upcoming}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
          >
            <span className="text-sm font-medium">Active</span>
            <Badge className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5">
              {projectCounts.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
          >
            <span className="text-sm font-medium">Completed</span>
            <Badge className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
              {projectCounts.completed}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {["all", "upcoming", "active", "completed"].map((status) => (
          <TabsContent key={status} value={status}>
            <ProjectView
              projects={getFilteredProjects(status)}
              loading={isLoading && projects.length === 0}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

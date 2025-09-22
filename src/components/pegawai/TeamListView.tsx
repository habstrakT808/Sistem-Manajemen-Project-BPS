"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveTeam } from "@/components/providers";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthContext } from "@/components/auth/AuthProvider";
import {
  Crown,
  Users,
  ChevronRight,
  ArrowRight,
  Target,
  TrendingUp,
  Award,
  Calendar,
  MapPin,
  Star,
  Sparkles,
  Zap,
  Shield,
  Heart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TeamItem = {
  id: string;
  name: string;
  description: string | null;
  users?: { nama_lengkap: string; email: string } | null;
  role: "leader" | "member";
};

async function fetchTeams(): Promise<TeamItem[]> {
  const res = await fetch("/api/pegawai/teams", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch teams");
  return json.data || [];
}

export default function TeamListView() {
  const router = useRouter();
  const { setActiveTeam } = useActiveTeam();
  const { user, userProfile } = useAuthContext();

  // Force re-render when user changes
  const teamKey = user?.id || "no-user";

  const { data: teams = [], isLoading } = useQuery<TeamItem[], Error>({
    queryKey: ["pegawai", "teams", user?.id],
    queryFn: fetchTeams,
    staleTime: 120000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
            <Users className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Loading Teams...
            </h2>
            <p className="text-gray-600">Finding your team assignments</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={teamKey}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-90"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-8 right-8 w-1 h-1 bg-white rounded-full"></div>
          <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-white rounded-full"></div>
          <div className="absolute bottom-12 right-4 w-2 h-2 bg-white rounded-full"></div>
        </div>

        <div className="relative px-2 md:px-4 lg:px-6 py-12 md:py-16">
          <div className="max-w-[1600px] mx-auto text-center">
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white">
                    My Teams
                  </h1>
                  <p className="text-blue-100 text-lg md:text-xl mt-2">
                    Choose your team to get started
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Shield className="w-3 h-3 mr-1" />
                  Secure Access
                </Badge>
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Heart className="w-3 h-3 mr-1" />
                  Team Collaboration
                </Badge>
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Zap className="w-3 h-3 mr-1" />
                  Real-time Updates
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-2 md:px-4 lg:px-6 -mt-8 relative z-10">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Teams</p>
                <p className="text-3xl font-bold text-gray-900">
                  {teams.length}
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  Active assignments
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Leader Roles
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {teams.filter((team) => team.role === "leader").length}
                </p>
                <p className="text-xs text-purple-600 font-medium">
                  Leadership positions
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Member Roles
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {teams.filter((team) => team.role === "member").length}
                </p>
                <p className="text-xs text-green-600 font-medium">
                  Team participation
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-8">
                <Users className="w-16 h-16 text-gray-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>

            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              No Teams Found
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              You haven&apos;t been assigned to any teams yet. Contact your
              administrator to get started.
            </p>

            <div className="flex items-center justify-center space-x-4">
              <Button
                asChild
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <Link href="/pegawai/dashboard">
                  <Target className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 cursor-pointer"
                onClick={() => {
                  setActiveTeam({ id: team.id, role: team.role });
                  console.log("Team click:", {
                    teamRole: team.role,
                    userRole: userProfile?.role,
                  });
                  if (team.role === "leader") {
                    router.push("/ketua-tim");
                  } else {
                    router.push("/pegawai/dashboard");
                  }
                }}
              >
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Floating particles effect */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-full translate-y-8 -translate-x-8 group-hover:scale-150 transition-transform duration-700"></div>

                <div className="relative p-6 md:p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            team.role === "leader"
                              ? "bg-gradient-to-r from-purple-500 to-purple-600"
                              : "bg-gradient-to-r from-blue-500 to-blue-600"
                          }`}
                        >
                          {team.role === "leader" ? (
                            <Crown className="w-6 h-6 text-white" />
                          ) : (
                            <Users className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                            {team.name}
                          </h3>
                          <Badge
                            className={`${
                              team.role === "leader"
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            } text-sm font-semibold`}
                          >
                            {team.role.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {team.description && (
                        <p className="text-gray-600 mb-4 line-clamp-2 group-hover:text-gray-700 transition-colors duration-300">
                          {team.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-2 mb-4">
                        {team.users ? (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                            <span className="font-medium">
                              {team.users.nama_lengkap}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                              <Users className="w-3 h-3 text-gray-400" />
                            </div>
                            <span>No leader assigned</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </div>

                  {/* Action indicator */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-emerald-600 font-medium">
                        {team.role === "leader" ? "Manage Team" : "Join Team"}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveTeam } from "@/components/providers";
import { useActiveProject } from "@/components/providers";
import { useAuthContext } from "@/components/auth/AuthProvider";
import {
  Crown,
  Users,
  ChevronRight,
  ArrowRight,
  Target,
  Award,
  Sparkles,
  Building2,
  User,
  Star,
  Zap,
  Shield,
  LogOut,
  Settings,
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
  const { setActiveProject } = useActiveProject();
  const { user, userProfile, signOut } = useAuthContext();

  // Note: Removed automatic clearing of activeProject/activeTeam
  // This was causing issues with ProtectedRoute redirects

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

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
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
              <Users className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Memuat Tim...</h2>
            <p className="text-gray-600">Mencari penugasan tim Anda</p>
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
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden">
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700"></div>

        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-2 h-2 bg-white rounded-full animate-pulse delay-300"></div>
          <div className="absolute bottom-10 left-20 w-2.5 h-2.5 bg-white rounded-full animate-pulse delay-700"></div>
          <div className="absolute bottom-20 right-10 w-3 h-3 bg-white rounded-full animate-pulse delay-500"></div>
        </div>

        {/* Floating shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-20 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-20 right-1/4 w-40 h-40 bg-purple-300/20 rounded-full blur-xl animate-float-delayed"></div>
        </div>

        <div className="relative px-4 sm:px-6 lg:px-8 py-16">
          {/* Logout & Settings Buttons - Top Right */}
          <div className="absolute top-6 right-6 flex space-x-3 z-20">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
            >
              <Link href="/pegawai/settings">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="max-w-7xl mx-auto text-center">
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-xl">
                    <Building2 className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                    Tim Saya
                  </h1>
                  <p className="text-blue-100 text-lg md:text-xl">
                    Pilih tim untuk memulai bekerja dan berkolaborasi
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-4 flex-wrap">
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Shield className="w-3 h-3 mr-1" />
                  Akses Aman
                </Badge>
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Users className="w-3 h-3 mr-1" />
                  Kolaborasi Tim
                </Badge>
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Zap className="w-3 h-3 mr-1" />
                  Update Real-time
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Tim
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {teams.length}
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  Penugasan aktif
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Sebagai Ketua
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {teams.filter((team) => team.role === "leader").length}
                </p>
                <p className="text-xs text-purple-600 font-medium">
                  Posisi kepemimpinan
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Crown className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Sebagai Anggota
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {teams.filter((team) => team.role === "member").length}
                </p>
                <p className="text-xs text-green-600 font-medium">
                  Partisipasi tim
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Award className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <Users className="w-16 h-16 text-gray-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Belum Ada Tim
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              Anda belum ditugaskan ke tim manapun. Hubungi administrator untuk
              memulai.
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Link href="/pegawai/dashboard">
                <Target className="w-4 h-4 mr-2" />
                Ke Dashboard
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Daftar Tim ({teams.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teams.map((team, index) => (
                <div
                  key={team.id}
                  className="group relative bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 cursor-pointer overflow-hidden"
                  onClick={async () => {
                    // Set activeTeam with the correct role based on team.role
                    console.log("Team click:", {
                      teamRole: team.role,
                      userRole: userProfile?.role,
                    });

                    // Set activeTeam with the role from the team data
                    setActiveTeam({
                      id: team.id,
                      role: team.role, // This should be "leader" or "member"
                    });

                    router.push(
                      `/pegawai/projects?team_id=${encodeURIComponent(team.id)}`,
                    );
                  }}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* Animated background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  {/* Floating particles effect */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-full translate-y-8 -translate-x-8 group-hover:scale-150 transition-transform duration-700"></div>

                  <div className="relative p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                            team.role === "leader"
                              ? "bg-gradient-to-r from-purple-500 to-purple-600"
                              : "bg-gradient-to-r from-blue-500 to-blue-600"
                          }`}
                        >
                          {team.role === "leader" ? (
                            <Crown className="w-7 h-7 text-white" />
                          ) : (
                            <Users className="w-7 h-7 text-white" />
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
                            {team.role === "leader" ? "Ketua Tim" : "Anggota"}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-2 transition-all duration-300" />
                    </div>

                    {team.description && (
                      <p className="text-gray-600 mb-6 line-clamp-2 group-hover:text-gray-700 transition-colors duration-300">
                        {team.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      {team.users ? (
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium truncate">
                            {team.users.nama_lengkap}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <span>Belum ada ketua</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">
                          Aktif
                        </span>
                      </div>
                    </div>

                    {/* Action indicator */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-emerald-600 font-medium">
                          {team.role === "leader" ? "Kelola Tim" : "Bergabung"}
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(-180deg);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

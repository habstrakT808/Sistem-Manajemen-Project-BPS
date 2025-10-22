"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  FolderOpen,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  Plus,
  Activity,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useAuthContext } from "@/components/auth/AuthProvider";

interface DashboardStats {
  total_users: number;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_teams: number;
  total_mitra: number;
  monthly_transport: number;
}

export default function AdminDashboard() {
  const { user, userProfile, loading: authLoading } = useAuthContext();
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    total_teams: 0,
    total_mitra: 0,
    monthly_transport: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Force loading to false after 5 seconds as a fallback
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const fetchRealStats = async () => {
      // Don't fetch if auth is still loading
      if (authLoading) {
        return;
      }

      // Don't fetch if no user or auth is still loading
      if (!user || authLoading) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/admin/dashboard", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `API request failed: ${response.status} ${response.statusText}`,
          );
        }

        const newStats = await response.json();

        setStats(newStats);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        // Always set fallback stats to prevent infinite loading
        setStats({
          total_users: 0,
          total_projects: 0,
          active_projects: 0,
          completed_projects: 0,
          total_teams: 0,
          total_mitra: 0,
          monthly_transport: 0,
        });
      } finally {
        console.log(
          "=== fetchRealStats finally block - setting isLoading to false ===",
        );
        setIsLoading(false);
      }
    };

    fetchRealStats();
  }, [user, authLoading, userProfile?.role]); // Re-run when user, authLoading, or role changes

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statsCards = [
    {
      title: "Total Pengguna",
      value: stats.total_users,
      description: "Pengguna aktif di sistem",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      textColor: "text-blue-600",
      href: "/admin/users",
      change: "0%",
      changeType: "neutral",
    },
    {
      title: "Total Proyek",
      value: stats.total_projects,
      description: "Semua proyek di sistem",
      icon: FolderOpen,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      textColor: "text-green-600",
      href: "/admin/projects",
      change: "0%",
      changeType: "neutral",
    },
    {
      title: "Total Mitra",
      value: stats.total_mitra,
      description: "Mitra terdaftar",
      icon: Building2,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      textColor: "text-purple-600",
      href: "/admin/mitra",
      change: "0%",
      changeType: "neutral",
    },
    {
      title: "Transport Bulanan",
      value: formatCurrency(stats.monthly_transport),
      description: "Biaya transport bulan ini",
      icon: DollarSign,
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
      textColor: "text-orange-600",
      href: "/admin/financial",
      change: "0%",
      changeType: "neutral",
    },
  ];

  const quickActions = [
    {
      title: "Kelola Pengguna",
      description: "Tambah, ubah, atau hapus pengguna sistem",
      icon: Users,
      href: "/admin/users",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Kelola Mitra",
      description: "Kelola pendaftaran mitra",
      icon: Building2,
      href: "/admin/mitra",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Lihat Analitik",
      description: "Wawasan performa sistem",
      icon: TrendingUp,
      href: "/admin/analytics",
      color: "from-green-500 to-green-600",
    },
    {
      title: "Pengaturan Sistem",
      description: "Konfigurasi parameter sistem",
      icon: AlertCircle,
      href: "/admin/settings",
      color: "from-orange-500 to-orange-600",
    },
  ];

  const systemStatus = [
    {
      name: "Database",
      status: "healthy",
      color: "bg-green-500",
      badge: "Healthy",
      badgeColor: "text-green-600 border-green-600",
    },
    {
      name: "Authentication",
      status: "active",
      color: "bg-green-500",
      badge: "Active",
      badgeColor: "text-green-600 border-green-600",
    },
    {
      name: "Background Jobs",
      status: "running",
      color: "bg-yellow-500",
      badge: "Running",
      badgeColor: "text-yellow-600 border-yellow-600",
      icon: Clock,
    },
    {
      name: "Storage",
      status: "available",
      color: "bg-green-500",
      badge: "Available",
      badgeColor: "text-green-600 border-green-600",
    },
  ];

  // Show loading when either data is loading or auth is still loading
  if (isLoading || authLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
        </div>

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

  // Show error state if there's an error and all stats are zero (indicating failed fetch)
  if (
    error &&
    stats.total_users === 0 &&
    stats.total_mitra === 0 &&
    stats.active_projects === 0
  ) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Gagal Memuat Dasbor
            </h2>
            <p className="text-gray-600 max-w-md">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
            >
              <Activity className="w-4 h-4 mr-2" />
              Coba Lagi
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
            Dasbor Admin
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Selamat datang kembali! Berikut yang terjadi di sistem Anda.
          </p>
        </div>

        <div className="flex space-x-4">
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Link
              href="/admin/users"
              prefetch
              onMouseEnter={() => router.prefetch("/admin/users")}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Kelola Pengguna
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="border-2 border-purple-200 text-purple-600 hover:bg-purple-50 font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:border-purple-300"
          >
            <Link
              href="/admin/mitra"
              prefetch
              onMouseEnter={() => router.prefetch("/admin/mitra")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Kelola Mitra
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Link
              key={index}
              href={stat.href}
              prefetch
              onMouseEnter={() => router.prefetch(stat.href)}
            >
              <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group overflow-hidden">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-50`}
                ></div>
                <CardContent className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-600 mb-2">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900 mb-1">
                        {stat.value}
                      </p>
                      <p className="text-sm text-gray-500">
                        {stat.description}
                      </p>
                    </div>
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                    >
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span
                        className={`text-sm font-semibold ${stat.changeType === "positive" ? "text-green-600" : "text-red-600"}`}
                      >
                        {stat.change}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        vs last month
                      </span>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 ${stat.textColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions & System Status */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <div className="font-semibold flex items-center text-white text-xl">
              <Zap className="w-6 h-6 mr-3" />
              Quick Actions
            </div>
            <div className="text-sm text-blue-100 mt-2">
              Common administrative tasks
            </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Link
                  key={index}
                  href={action.href}
                  prefetch
                  onMouseEnter={() => router.prefetch(action.href)}
                >
                  <div className="group flex items-center p-4 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-gray-100 hover:border-blue-200 hover:shadow-lg">
                    <div
                      className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {action.title}
                      </div>
                      <div className="text-sm text-gray-500 group-hover:text-blue-500 mt-1">
                        {action.description}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* System Status */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
            <div className="font-semibold flex items-center text-white text-xl">
              <Activity className="w-6 h-6 mr-3" />
              System Status
            </div>
            <div className="text-sm text-green-100 mt-2">
              Current system health and status
            </div>
          </div>
          <div className="p-6 space-y-6 bg-white">
            {systemStatus.map((system, index) => {
              const IconComponent = system.icon;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-4 h-4 ${system.color} rounded-full animate-pulse`}
                    ></div>
                    <div className="flex items-center space-x-2">
                      {IconComponent && (
                        <IconComponent className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">
                        {system.name}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${system.badgeColor} bg-opacity-10 font-semibold`}
                  >
                    {system.badge}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden">
        <CardContent className="p-8">
          <div className="grid md:grid-cols-4 gap-8 text-center relative">
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Clock className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">90%</div>
              <div className="text-blue-100 text-sm">
                Pengurangan waktu administrasi
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">100%</div>
              <div className="text-blue-100 text-sm">
                Akurasi laporan keuangan
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Zap className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">Real-time</div>
              <div className="text-blue-100 text-sm">
                Monitoring dan notifikasi
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <Users className="w-8 h-8" />
              </div>
              <div className="text-3xl font-bold">Unlimited</div>
              <div className="text-blue-100 text-sm">
                Project dan team members
              </div>
            </div>

            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full translate-y-12 -translate-x-12"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

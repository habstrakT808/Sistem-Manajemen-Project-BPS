// File: src/components/layout/PegawaiLayout.tsx
// COMPLETELY UPDATED: Enhanced navigation with transport alerts

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  ClipboardList,
  Calendar,
  DollarSign,
  Star,
  MapPin,
  LogOut,
  X,
  Bell,
  Settings,
  CheckSquare,
  Play,
  Leaf,
  Menu,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

interface PegawaiLayoutProps {
  children: React.ReactNode;
}

interface NotificationData {
  pending_transport_allocations: number;
  urgent_tasks: number;
  pending_reviews: number;
}

async function fetchNotifications(): Promise<NotificationData> {
  const response = await fetch("/api/pegawai/notifications", {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch notifications");
  }
  return result.data;
}

const navigation = [
  {
    name: "Team",
    href: "/pegawai",
    icon: Users,
    description: "My team list",
    color: "from-blue-500 to-blue-600",
    isDefault: true,
  },
  {
    name: "Dashboard",
    href: "/pegawai/dashboard",
    icon: Home,
    description: "Today's focus",
    color: "from-green-500 to-green-600",
  },
  {
    name: "My Tasks",
    href: "/pegawai/tasks",
    icon: ClipboardList,
    description: "Task management",
    color: "from-orange-500 to-orange-600",
    notification: "urgent_tasks",
  },
  {
    name: "Schedule",
    href: "/pegawai/schedule",
    icon: Calendar,
    description: "Personal calendar",
    color: "from-purple-500 to-purple-600",
  },
  {
    name: "Earnings",
    href: "/pegawai/earnings",
    icon: DollarSign,
    description: "Financial tracking",
    color: "from-yellow-500 to-yellow-600",
  },
  {
    name: "Transport",
    href: "/pegawai/transport",
    icon: MapPin,
    description: "Allocate transport dates",
    color: "from-orange-500 to-red-500",
  },
  {
    name: "Reviews",
    href: "/pegawai/reviews",
    icon: Star,
    description: "Mitra evaluation",
    color: "from-pink-500 to-pink-600",
    notification: "pending_reviews",
  },
];

export function PegawaiLayout({ children }: PegawaiLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, userProfile, signOut } = useAuth();
  const router = useRouter();

  // Force re-render when user changes
  const layoutKey = user?.id || "no-user";

  const { data: notifications } = useQuery<NotificationData, Error>({
    queryKey: ["pegawai", "notifications"],
    queryFn: fetchNotifications,
    staleTime: 30 * 1000, // 30 seconds for real-time notifications
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const handleSignOut = async () => {
    router.prefetch("/");
    router.push("/");
    signOut();
  };

  const getNotificationCount = (notificationType?: string): number => {
    if (!notifications || !notificationType) return 0;
    return notifications[notificationType as keyof NotificationData] || 0;
  };

  const totalNotifications = notifications
    ? notifications.pending_transport_allocations +
      notifications.urgent_tasks +
      notifications.pending_reviews
    : 0;

  return (
    <div
      key={layoutKey}
      className="min-h-screen bg-gradient-to-br from-green-100 to-teal-100/60 flex"
    >
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex-shrink-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="relative bg-gradient-to-r from-green-500 to-teal-600 h-20 flex items-center px-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Pegawai Panel
                  </h1>
                  <p className="text-green-100 text-sm">Task Management</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-white hover:bg-white hover:bg-opacity-20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white bg-opacity-10 rounded-full"></div>
            <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-white bg-opacity-10 rounded-full"></div>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-gradient-to-r from-green-50 to-teal-50">
              <Avatar className="w-12 h-12 border-2 border-green-200">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold">
                  {userProfile?.nama_lengkap?.charAt(0) ||
                    user?.email?.charAt(0).toUpperCase() ||
                    "P"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {userProfile?.nama_lengkap || user?.email || "Pegawai"}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                    <Leaf className="w-3 h-3 mr-1" />
                    Pegawai
                  </Badge>
                  {totalNotifications > 0 && (
                    <Badge className="bg-red-100 text-red-800 border-red-200 text-xs animate-pulse">
                      {totalNotifications} alerts
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Transport Alert */}
          {notifications && notifications.pending_transport_allocations > 0 && (
            <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-orange-900">
                    Transport Dates Needed
                  </div>
                  <div className="text-xs text-orange-700">
                    {notifications.pending_transport_allocations} tasks need
                    date selection
                  </div>
                </div>
                <Badge className="bg-orange-100 text-orange-800 animate-pulse">
                  {notifications.pending_transport_allocations}
                </Badge>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-6 py-8 space-y-3 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              NAVIGATION
            </div>
            {navigation.map((item) => {
              const IconComponent = item.icon;
              const notificationCount = getNotificationCount(item.notification);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group block"
                  onClick={() => setSidebarOpen(false)}
                  prefetch
                  onMouseEnter={() => router.prefetch(item.href)}
                >
                  <div className="flex items-center px-4 py-3 text-sm font-medium rounded-2xl hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 transition-all duration-300 transform hover:scale-105 hover:shadow-md border border-transparent hover:border-green-100">
                    <div
                      className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 relative`}
                    >
                      <IconComponent className="w-5 h-5 text-white" />
                      {notificationCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">
                            {notificationCount > 9 ? "9+" : notificationCount}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 group-hover:text-green-600 font-semibold">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-green-500 mt-1">
                        {item.description}
                      </div>
                    </div>
                    {notificationCount > 0 && (
                      <Badge className="bg-red-100 text-red-800 text-xs animate-pulse">
                        {notificationCount}
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="p-6 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Quick Actions
            </div>
            <div className="space-y-2">
              <Button
                asChild
                className={`w-full font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${
                  notifications &&
                  notifications.pending_transport_allocations > 0
                    ? "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 animate-pulse"
                    : "bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                } text-white`}
              >
                <Link
                  href="/pegawai/tasks?filter=transport"
                  prefetch
                  onMouseEnter={() =>
                    router.prefetch("/pegawai/tasks?filter=transport")
                  }
                >
                  {notifications &&
                  notifications.pending_transport_allocations > 0 ? (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Select Transport Dates (
                      {notifications.pending_transport_allocations})
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Tasks
                    </>
                  )}
                </Link>
              </Button>

              <Button
                variant="outline"
                asChild
                className="w-full border-2 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300"
              >
                <Link
                  href="/pegawai/tasks?status=completed"
                  prefetch
                  onMouseEnter={() =>
                    router.prefetch("/pegawai/tasks?status=completed")
                  }
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  View Completed
                </Link>
              </Button>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-gray-200 hover:bg-gray-50 relative"
              >
                <Bell className="w-4 h-4" />
                {totalNotifications > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {totalNotifications > 9 ? "9+" : totalNotifications}
                    </span>
                  </div>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-gray-200 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="bg-white shadow-lg"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-2 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8">
          <div className="mx-auto max-w-[1600px] w-full">
            <div className="rounded-2xl bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border border-gray-200 shadow-xl shadow-teal-100/50">
              <div className="p-4 md:p-6 lg:p-8 xl:p-10">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

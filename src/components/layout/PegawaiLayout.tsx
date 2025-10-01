// File: src/components/layout/PegawaiLayout.tsx
// COMPLETELY UPDATED: Enhanced navigation with transport alerts

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  ClipboardList,
  Calendar,
  DollarSign,
  Star,
  MapPin,
  LogOut,
  Bell,
  Settings,
  CheckSquare,
  Play,
  Leaf,
  Users,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";

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
  const { user, userProfile, loading, signOut } = useAuthContext();
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
    try {
      // The signOut function from useAuth already handles navigation to home page
      await signOut();
    } catch (error) {
      console.error("Error during logout:", error);
      // useAuth signOut function handles navigation even on error
    }
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
    <div key={layoutKey} className="min-h-screen bg-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center h-20 px-6 bg-gradient-to-r from-green-600 to-teal-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-white font-bold text-lg">Pegawai Panel</div>
              <div className="text-green-100 text-sm">Task Management</div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <div className="font-semibold text-gray-900">
                {(() => {
                  const toTitleCase = (value: string) =>
                    value
                      .split(" ")
                      .filter(Boolean)
                      .map(
                        (part) => part.charAt(0).toUpperCase() + part.slice(1),
                      )
                      .join(" ");
                  const derivedNameFromEmail = user?.email
                    ? toTitleCase(
                        user.email.split("@")[0].replace(/[._-]/g, " "),
                      )
                    : undefined;
                  const displayName =
                    userProfile?.nama_lengkap ||
                    (user as any)?.user_metadata?.nama_lengkap ||
                    derivedNameFromEmail ||
                    user?.email ||
                    "";
                  return displayName || (loading ? "Loading..." : "-");
                })()}
              </div>
              <div className="text-sm text-gray-500">{user?.email}</div>
            </div>
            <Badge className="bg-green-100 text-green-800">Pegawai</Badge>
          </div>
          {totalNotifications > 0 && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-xs text-red-800 font-medium">
                {totalNotifications} notifikasi pending
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Transport Alert */}
          {notifications && notifications.pending_transport_allocations > 0 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl">
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

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-4">
            Navigation
          </div>

          {navigation.map((item) => {
            const IconComponent = item.icon;
            const notificationCount = getNotificationCount(item.notification);

            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch
                onMouseEnter={() => router.prefetch(item.href)}
              >
                <div className="group flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-transparent hover:border-green-200">
                  <div
                    className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 relative`}
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
                    <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                      {item.name}
                    </div>
                    <div className="text-sm text-gray-500 group-hover:text-green-500 mt-1">
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
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-100 mt-auto">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-4">
            Quick Actions
          </div>
          <div className="space-y-2">
            <Button
              asChild
              className={`w-full font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${
                notifications && notifications.pending_transport_allocations > 0
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
              asChild
              className="flex-1 border-gray-200 hover:bg-gray-50"
            >
              <Link href="/pegawai/settings">
                <Settings className="w-4 h-4" />
              </Link>
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

      {/* Main Content */}
      <div className="ml-72">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}

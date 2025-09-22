// File: src/components/layout/AdminLayout.tsx
// UPDATED: Add team management and transport analytics

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  Building2,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Home,
  UserCheck,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    router.prefetch("/");
    router.push("/");
    await signOut();
  };

  const [openManagement, setOpenManagement] = React.useState(true);
  const [openAnalytics, setOpenAnalytics] = React.useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl border-r border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-center h-20 px-6 bg-gradient-to-r from-red-600 to-orange-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-white font-bold text-lg">Admin Panel</div>
              <div className="text-red-100 text-sm">System Management</div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">
                {user?.user_metadata?.nama_lengkap || "Administrator"}
              </div>
              <div className="text-sm text-gray-500">{user?.email}</div>
            </div>
            <Badge className="bg-red-100 text-red-800">Admin</Badge>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-4">
            Navigation
          </div>
          {/* Dashboard */}
          <Link
            href="/admin"
            prefetch
            onMouseEnter={() => router.prefetch("/admin")}
          >
            <div className="group flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-transparent hover:border-red-200">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                  Dashboard
                </div>
                <div className="text-sm text-gray-500 group-hover:text-red-500 mt-1">
                  System overview
                </div>
              </div>
            </div>
          </Link>

          {/* Management dropdown */}
          <button
            type="button"
            onClick={() => setOpenManagement((v) => !v)}
            className="w-full group flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300 border border-transparent hover:border-red-200"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                Management
              </div>
              <div className="text-sm text-gray-500 group-hover:text-red-500 mt-1">
                Teams, users and partners
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${openManagement ? "rotate-180" : "rotate-0"}`}
            />
          </button>
          {openManagement && (
            <div className="ml-4 space-y-2">
              <Link
                href="/admin/teams"
                prefetch
                onMouseEnter={() => router.prefetch("/admin/teams")}
              >
                <div className="flex items-center p-3 rounded-xl hover:bg-red-50 transition-all cursor-pointer">
                  <Building2 className="w-4 h-4 text-red-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Team Management
                    </div>
                    <div className="text-xs text-gray-500">Manage teams</div>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/users"
                prefetch
                onMouseEnter={() => router.prefetch("/admin/users")}
              >
                <div className="flex items-center p-3 rounded-xl hover:bg-red-50 transition-all cursor-pointer">
                  <Users className="w-4 h-4 text-red-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      User Management
                    </div>
                    <div className="text-xs text-gray-500">Manage users</div>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/mitra"
                prefetch
                onMouseEnter={() => router.prefetch("/admin/mitra")}
              >
                <div className="flex items-center p-3 rounded-xl hover:bg-red-50 transition-all cursor-pointer">
                  <UserCheck className="w-4 h-4 text-red-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Mitra Management
                    </div>
                    <div className="text-xs text-gray-500">Manage partners</div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Analytics dropdown */}
          <button
            type="button"
            onClick={() => setOpenAnalytics((v) => !v)}
            className="w-full group flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300 border border-transparent hover:border-red-200"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                Analytics
              </div>
              <div className="text-sm text-gray-500 group-hover:text-red-500 mt-1">
                Insights and reports
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${openAnalytics ? "rotate-180" : "rotate-0"}`}
            />
          </button>
          {openAnalytics && (
            <div className="ml-4 space-y-2">
              <Link
                href="/admin/analytics/transport"
                prefetch
                onMouseEnter={() =>
                  router.prefetch("/admin/analytics/transport")
                }
              >
                <div className="flex items-center p-3 rounded-xl hover:bg-red-50 transition-all cursor-pointer">
                  <MapPin className="w-4 h-4 text-red-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Transport Analytics
                    </div>
                    <div className="text-xs text-gray-500">
                      Transport insights
                    </div>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/analytics"
                prefetch
                onMouseEnter={() => router.prefetch("/admin/analytics")}
              >
                <div className="flex items-center p-3 rounded-xl hover:bg-red-50 transition-all cursor-pointer">
                  <BarChart3 className="w-4 h-4 text-red-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      System Analytics
                    </div>
                    <div className="text-xs text-gray-500">System insights</div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* System Settings */}
          <Link
            href="/admin/settings"
            prefetch
            onMouseEnter={() => router.prefetch("/admin/settings")}
          >
            <div className="group flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-transparent hover:border-red-200">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                  System Settings
                </div>
                <div className="text-sm text-gray-500 group-hover:text-red-500 mt-1">
                  Configure system
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-100 mt-auto">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-gray-200 hover:bg-gray-50"
            >
              <Bell className="w-4 h-4" />
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

      {/* Main Content */}
      <div className="ml-72">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}

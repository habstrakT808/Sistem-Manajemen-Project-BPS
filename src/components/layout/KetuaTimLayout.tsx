// File: src/components/layout/KetuaTimLayout.tsx

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  Plus,
  Users,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Home,
  Calendar,
  DollarSign,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";

interface KetuaTimLayoutProps {
  children: React.ReactNode;
}

export function KetuaTimLayout({ children }: KetuaTimLayoutProps) {
  const { user, userProfile, loading, signOut } = useAuthContext();
  const router = useRouter();

  const toTitleCase = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const derivedNameFromEmail = user?.email
    ? toTitleCase(user.email.split("@")[0].replace(/[._-]/g, " "))
    : undefined;

  const handleSignOut = async () => {
    try {
      // signOut from useAuth already handles navigation to home page
      await signOut();
    } catch (error) {
      console.error("Error during logout:", error);
      // signOut handles navigation even on error, but add fallback just in case
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  };

  const [openManagement, setOpenManagement] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center h-20 px-6 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-white font-bold text-lg">
                Ketua Tim Panel
              </div>
              <div className="text-blue-100 text-sm">Project Management</div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <div className="font-semibold text-gray-900">
                {(() => {
                  const displayName =
                    userProfile?.nama_lengkap ||
                    user?.user_metadata?.nama_lengkap ||
                    derivedNameFromEmail ||
                    user?.email ||
                    "";
                  return displayName || (loading ? "Loading..." : "-");
                })()}
              </div>
              <div className="text-sm text-gray-500">{user?.email}</div>
            </div>
            <Badge className="bg-blue-100 text-blue-800">Ketua Tim</Badge>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-4">
            Navigation
          </div>
          {/* Dashboard */}
          <Link
            href="/ketua-tim"
            prefetch
            onMouseEnter={() => router.prefetch("/ketua-tim")}
          >
            <div className="group flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-transparent hover:border-blue-200">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Dashboard
                </div>
                <div className="text-sm text-gray-500 group-hover:text-blue-500 mt-1">
                  Overview sistem
                </div>
              </div>
            </div>
          </Link>

          {/* Management dropdown */}
          <button
            type="button"
            onClick={() => setOpenManagement((v) => !v)}
            className="w-full group flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 border border-transparent hover:border-blue-200"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                Management
              </div>
              <div className="text-sm text-gray-500 group-hover:text-blue-500 mt-1">
                Projects, tasks, and team
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${openManagement ? "rotate-180" : "rotate-0"}`}
            />
          </button>
          {openManagement && (
            <div className="ml-4 space-y-2">
              <Link
                href="/ketua-tim/projects"
                prefetch
                onMouseEnter={() => router.prefetch("/ketua-tim/projects")}
              >
                <div className="flex items-center p-3 rounded-xl hover:bg-blue-50 transition-all cursor-pointer">
                  <FolderOpen className="w-4 h-4 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Projects Management
                    </div>
                    <div className="text-xs text-gray-500">Kelola projects</div>
                  </div>
                </div>
              </Link>
              <Link
                href="/ketua-tim/tasks"
                prefetch
                onMouseEnter={() => router.prefetch("/ketua-tim/tasks")}
              >
                <div className="flex items-center p-3 rounded-xl hover:bg-blue-50 transition-all cursor-pointer">
                  <ClipboardList className="w-4 h-4 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Task Management
                    </div>
                    <div className="text-xs text-gray-500">Kelola tugas</div>
                  </div>
                </div>
              </Link>
              <Link
                href="/ketua-tim/team"
                prefetch
                onMouseEnter={() => router.prefetch("/ketua-tim/team")}
              >
                <div className="flex items-center p-3 rounded-xl hover:bg-blue-50 transition-all cursor-pointer">
                  <Users className="w-4 h-4 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Team Management
                    </div>
                    <div className="text-xs text-gray-500">Kelola tim</div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Financial Report */}
          <Link
            href="/ketua-tim/financial"
            prefetch
            onMouseEnter={() => router.prefetch("/ketua-tim/financial")}
          >
            <div className="group flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-transparent hover:border-blue-200">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Financial Report
                </div>
                <div className="text-sm text-gray-500 group-hover:text-blue-500 mt-1">
                  Laporan keuangan
                </div>
              </div>
            </div>
          </Link>

          {/* Analytics */}
          <Link
            href="/ketua-tim/analytics"
            prefetch
            onMouseEnter={() => router.prefetch("/ketua-tim/analytics")}
          >
            <div className="group flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-transparent hover:border-blue-200">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Analytics
                </div>
                <div className="text-sm text-gray-500 group-hover:text-blue-500 mt-1">
                  Analisis performa
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-100 mt-auto">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-4">
            Quick Actions
          </div>
          <div className="space-y-2">
            <Button
              asChild
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Link
                href="/ketua-tim/projects/new"
                prefetch
                onMouseEnter={() => router.prefetch("/ketua-tim/projects/new")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full border-2 border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-300"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-100">
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
              asChild
              className="flex-1 border-gray-200 hover:bg-gray-50"
            >
              <Link href="/ketua-tim/settings">
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

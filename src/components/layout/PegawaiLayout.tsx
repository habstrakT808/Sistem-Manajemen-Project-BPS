// File: src/components/layout/PegawaiLayout.tsx

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  ClipboardList,
  FolderOpen,
  Calendar,
  DollarSign,
  Star,
  User,
  LogOut,
  X,
  Bell,
  Settings,
  CheckSquare,
  Play,
  Leaf,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

interface PegawaiLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/pegawai",
    icon: Home,
    description: "Today's focus",
    color: "from-green-500 to-green-600",
  },
  {
    name: "My Tasks",
    href: "/pegawai/tasks",
    icon: ClipboardList,
    description: "Task management",
    color: "from-blue-500 to-blue-600",
  },
  {
    name: "My Projects",
    href: "/pegawai/projects",
    icon: FolderOpen,
    description: "Project participation",
    color: "from-purple-500 to-purple-600",
  },
  {
    name: "Schedule",
    href: "/pegawai/schedule",
    icon: Calendar,
    description: "Personal calendar",
    color: "from-orange-500 to-orange-600",
  },
  {
    name: "Earnings",
    href: "/pegawai/earnings",
    icon: DollarSign,
    description: "Financial tracking",
    color: "from-yellow-500 to-yellow-600",
  },
  {
    name: "Reviews",
    href: "/pegawai/reviews",
    icon: Star,
    description: "Mitra evaluation",
    color: "from-pink-500 to-pink-600",
  },
  {
    name: "Profile",
    href: "/pegawai/profile",
    icon: User,
    description: "Personal settings",
    color: "from-gray-500 to-gray-600",
  },
];

export function PegawaiLayout({ children }: PegawaiLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, userProfile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    router.prefetch("/");
    router.push("/");
    // Fire and forget sign out to avoid blocking UI navigation
    signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex">
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
                <Badge className="mt-1 bg-green-100 text-green-700 border-green-200 text-xs">
                  <Leaf className="w-3 h-3 mr-1" />
                  Pegawai
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-8 space-y-3 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              NAVIGATION
            </div>
            {navigation.map((item) => {
              const IconComponent = item.icon;
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
                      className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 group-hover:text-green-600 font-semibold">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-green-500 mt-1">
                        {item.description}
                      </div>
                    </div>
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
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <Link
                  href="/pegawai/tasks?status=pending"
                  prefetch
                  onMouseEnter={() =>
                    router.prefetch("/pegawai/tasks?status=pending")
                  }
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Tasks
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
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

// File: src/components/layout/PegawaiLayout.tsx

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  ClipboardList,
  FolderOpen,
  Calendar,
  DollarSign,
  Star,
  User,
  Bell,
  LogOut,
  CheckSquare,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

interface PegawaiLayoutProps {
  children: React.ReactNode;
}

export function PegawaiLayout({ children }: PegawaiLayoutProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const navigationItems = [
    {
      title: "Dashboard",
      href: "/pegawai",
      icon: Home,
      description: "Overview harian",
    },
    {
      title: "My Tasks",
      href: "/pegawai/tasks",
      icon: ClipboardList,
      description: "Tugas saya",
    },
    {
      title: "My Projects",
      href: "/pegawai/projects",
      icon: FolderOpen,
      description: "Project yang ditugaskan",
    },
    {
      title: "Schedule",
      href: "/pegawai/schedule",
      icon: Calendar,
      description: "Jadwal kerja",
    },
    {
      title: "Earnings",
      href: "/pegawai/earnings",
      icon: DollarSign,
      description: "Pendapatan bulanan",
    },
    {
      title: "Reviews",
      href: "/pegawai/reviews",
      icon: Star,
      description: "Review mitra",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl border-r border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-center h-20 px-6 bg-gradient-to-r from-green-600 to-teal-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-green-600" />
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
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">
                {user?.user_metadata?.nama_lengkap || "Pegawai"}
              </div>
              <div className="text-sm text-gray-500">{user?.email}</div>
            </div>
            <Badge className="bg-green-100 text-green-800">Pegawai</Badge>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-4">
            Navigation
          </div>
          {navigationItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <Link key={index} href={item.href}>
                <div className="group flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-transparent hover:border-green-200">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-sm text-gray-500 group-hover:text-green-500 mt-1">
                      {item.description}
                    </div>
                  </div>
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
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Link href="/pegawai/tasks?status=pending">
                <CheckSquare className="w-4 h-4 mr-2" />
                Complete Tasks
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="w-full border-2 border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-300"
            >
              <Link href="/pegawai/schedule">
                <Clock className="w-4 h-4 mr-2" />
                View Schedule
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
              asChild
              className="flex-1 border-gray-200 hover:bg-gray-50"
            >
              <Link href="/pegawai/profile">
                <User className="w-4 h-4" />
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

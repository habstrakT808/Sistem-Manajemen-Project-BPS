"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  Home,
} from "lucide-react";
import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: Home,
    description: "Overview sistem",
    color: "from-blue-500 to-blue-600",
  },
  {
    name: "User Management",
    href: "/admin/users",
    icon: Users,
    description: "Kelola pengguna",
    color: "from-green-500 to-green-600",
  },
  {
    name: "Mitra Management",
    href: "/admin/mitra",
    icon: Building2,
    description: "Kelola mitra",
    color: "from-purple-500 to-purple-600",
  },
  {
    name: "System Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "Analisa sistem",
    color: "from-yellow-500 to-orange-500",
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "Pengaturan sistem",
    color: "from-gray-500 to-gray-600",
  },
];

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userProfile, signOut } = useAuthContext();
  const router = useRouter();

  const handleSignOut = async () => {
    router.prefetch("/");
    router.push("/");
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex">
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
          <div className="relative bg-gradient-to-r from-red-500 to-red-600 h-20 flex items-center px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                  <p className="text-red-100 text-sm">System Management</p>
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
                  <div className="flex items-center px-4 py-3 text-sm font-medium rounded-2xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 transform hover:scale-105 hover:shadow-md border border-transparent hover:border-blue-100">
                    <div
                      className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 group-hover:text-blue-600 font-semibold">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-blue-500 mt-1">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-white shadow-sm">
              <Avatar className="w-12 h-12 border-2 border-red-100">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold">
                  {userProfile?.nama_lengkap?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {userProfile?.nama_lengkap || "Administrator"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userProfile?.email}
                </p>
                <Badge className="mt-1 bg-red-100 text-red-700 border-red-200 text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin Access
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="bg-white shadow-lg border-b border-gray-100 backdrop-blur-md bg-opacity-95">
          <div className="flex items-center justify-between h-20 px-8">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden hover:bg-blue-50"
              >
                <Menu className="w-5 h-5" />
              </Button>

              {title && (
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {title}
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin Access
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Button
                variant="ghost"
                size="sm"
                className="relative hover:bg-blue-50 rounded-xl p-3 group"
              >
                <Bell className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-3 hover:bg-blue-50 rounded-2xl p-3 transition-all duration-200"
                  >
                    <Avatar className="w-10 h-10 border-2 border-blue-100">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold">
                        {userProfile?.nama_lengkap?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-semibold text-gray-900">
                        {userProfile?.nama_lengkap || "Administrator"}
                      </div>
                      <div className="text-xs text-gray-500">
                        System Administrator
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 rounded-2xl shadow-2xl border-0 bg-white"
                >
                  <DropdownMenuLabel className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                          {userProfile?.nama_lengkap?.charAt(0) || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-gray-900">
                          My Account
                        </div>
                        <div className="text-sm text-gray-500">
                          {userProfile?.email}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="p-3 rounded-xl mx-2 my-1">
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-600 p-3 rounded-xl mx-2 my-1 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

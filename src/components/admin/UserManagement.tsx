"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/../database/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  User,
  Crown,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { UserForm } from "./UserForm";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

interface UserWithMeta extends UserRow {
  project_count?: number;
  last_login?: string;
}

const roleConfig = {
  admin: {
    label: "Admin",
    icon: Shield,
    color: "bg-gradient-to-r from-red-500 to-red-600 text-white",
    description: "System Administrator",
  },
  ketua_tim: {
    label: "Ketua Tim",
    icon: Crown,
    color: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
    description: "Project Manager",
  },
  pegawai: {
    label: "Pegawai",
    icon: User,
    color: "bg-gradient-to-r from-green-500 to-green-600 text-white",
    description: "Employee",
  },
};

export function UserManagement() {
  const [users, setUsers] = useState<UserWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const query = supabase
        .from("users")
        .select(
          `
          *,
          projects(count)
        `
        )
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
        return;
      }

      // Transform data to include project count
      const usersWithMeta: UserWithMeta[] =
        data?.map((user) => {
          const userWithProjects = user as UserRow & {
            projects?: { count: number }[];
          };
          return {
            ...userWithProjects,
            project_count: userWithProjects.projects?.[0]?.count || 0,
          };
        }) || [];

      setUsers(usersWithMeta);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (user: UserRow) => {
    try {
      const response = await fetch(`/api/admin/users?id=${user.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to delete user");
        return;
      }

      toast.success("User deleted successfully");
      fetchUsers();
      setDeletingUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleToggleUserStatus = async (user: UserRow) => {
    try {
      const updateData: Database["public"]["Tables"]["users"]["Update"] = {
        is_active: !user.is_active,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("users")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        console.error("Error updating user status:", error);
        toast.error("Failed to update user status");
        return;
      }

      toast.success(
        `User ${user.is_active ? "deactivated" : "activated"} successfully`
      );
      fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (showUserForm) {
    return (
      <UserForm
        user={editingUser}
        onClose={() => {
          setShowUserForm(false);
          setEditingUser(null);
        }}
        onSuccess={() => {
          setShowUserForm(false);
          setEditingUser(null);
          fetchUsers();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Manage system users and their permissions
          </p>
        </div>

        <Button
          onClick={() => setShowUserForm(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="font-semibold text-xl text-gray-900">
            Filters & Search
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Find and filter users based on their information
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 py-3 rounded-xl border-2 focus:border-blue-300 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl px-6"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Role:{" "}
                    {roleFilter === "all"
                      ? "All"
                      : roleConfig[roleFilter].label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl shadow-xl">
                  <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRoleFilter("all")}>
                    All Roles
                  </DropdownMenuItem>
                  {Object.entries(roleConfig).map(([role, config]) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => setRoleFilter(role as UserRole)}
                    >
                      <config.icon className="w-4 h-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl px-6"
                  >
                    Status: {statusFilter === "all" ? "All" : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl shadow-xl">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                    Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6">
          <div className="font-semibold text-xl">
            Users ({filteredUsers.length})
          </div>
          <div className="text-muted-foreground text-sm">
            A list of all users in the system with their roles and status
          </div>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Loading users...</span>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-900">
                    User
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Role
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Projects
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Created
                  </TableHead>
                  <TableHead className="w-[70px] font-semibold text-gray-900">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const config = roleConfig[user.role];
                  const IconComponent = config.icon;

                  return (
                    <TableRow
                      key={user.id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {user.nama_lengkap.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {user.nama_lengkap}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`${config.color} border-0 font-semibold`}
                        >
                          <IconComponent className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`${
                            user.is_active
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          } font-semibold`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm font-medium text-gray-600">
                          {user.project_count || 0} projects
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString(
                            "id-ID"
                          )}
                        </span>
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-blue-100 rounded-lg"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl shadow-xl"
                          >
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingUser(user);
                                setShowUserForm(true);
                              }}
                              className="rounded-lg"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleUserStatus(user)}
                              className="rounded-lg"
                            >
                              {user.is_active ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingUser(user)}
                              className="text-red-600 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="text-gray-500">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No users found</p>
                        <p className="text-sm mt-2">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingUser}
        onOpenChange={() => setDeletingUser(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user
              <strong> {deletingUser?.nama_lengkap}</strong> and remove all
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && handleDeleteUser(deletingUser)}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

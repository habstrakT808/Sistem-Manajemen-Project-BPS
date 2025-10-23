"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { useQuery } from "@tanstack/react-query";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

type UserWithMeta = UserRow & {
  project_count?: number;
};

const roleConfig = {
  admin: {
    label: "Admin",
    icon: Crown,
    color: "bg-gradient-to-r from-red-500 to-red-600 text-white",
    description: "System Administrator",
  },
  ketua_tim: {
    label: "Ketua Tim",
    icon: Shield,
    color: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
    description: "Team Leader",
  },
  pegawai: {
    label: "Pegawai",
    icon: User,
    color: "bg-gradient-to-r from-green-500 to-green-600 text-white",
    description: "Employee",
  },
};

export function UserManagement() {
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Gagal mengambil pengguna");
    const data = (result.data || []) as UserRow[];
    const usersWithMeta: UserWithMeta[] = data.map((u) => ({
      ...u,
      project_count: 0,
    }));
    return usersWithMeta;
  }, []);

  const {
    data: users = [],
    isLoading,
    refetch,
    isFetching: _isFetching,
  } = useQuery<UserWithMeta[], Error>({
    queryKey: ["admin", "users"],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    // No-op: kept to honor previous behavior of initial load
  }, []);

  const handleDeleteUser = async (user: UserRow) => {
    try {
      const response = await fetch(`/api/admin/users?id=${user.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Gagal menghapus pengguna");
        return;
      }
      toast.success("Pengguna berhasil dihapus");
      await refetch();
      setDeletingUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Gagal menghapus pengguna");
    }
  };

  const handleToggleUserStatus = async (user: UserRow) => {
    try {
      const response = await fetch(`/api/admin/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Gagal memperbarui status pengguna");
        return;
      }
      toast.success("Status pengguna diperbarui");
      await refetch();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (u.nama_lengkap || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term) ||
      (u.nip || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Manajemen Pengguna
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Kelola pengguna dan kontrol akses.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            setShowUserForm(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Tambah Pengguna
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Cari pengguna (nama, email, NIP)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          className="border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Users Table */}
      <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
          <div className="text-white text-xl font-semibold">Pengguna</div>
        </div>
        <div className="p-6 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Proyek</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Memuat pengguna...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-gray-500"
                  >
                    Tidak ada pengguna
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const _RoleIcon =
                    roleConfig[user.role as keyof typeof roleConfig].icon;
                  const roleColor =
                    roleConfig[user.role as keyof typeof roleConfig].color;
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-semibold text-gray-900">
                          {user.nama_lengkap || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {user.nip || "-"}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleColor}`}>
                          {user.role?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.project_count ?? 0}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {user.is_active ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingUser(user);
                                setShowUserForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" /> Ubah
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleUserStatus(user)}
                            >
                              {user.is_active ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />{" "}
                                  Nonaktifkan
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" /> Aktifkan
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingUser(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit User Dialog */}
      {showUserForm && (
        <UserForm
          user={editingUser}
          onClose={() => setShowUserForm(false)}
          onSuccess={async () => {
            setShowUserForm(false);
            await refetch();
          }}
        />
      )}

      {/* Confirm Delete */}
      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pengguna
              secara permanen dan menghapus datanya dari server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && handleDeleteUser(deletingUser)}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

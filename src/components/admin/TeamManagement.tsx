// File: src/components/admin/TeamManagement.tsx
// NEW: Team management for admin

"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  FolderOpen,
  User,
  Loader2,
  Crown,
  Building2,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  description: string | null;
  leader_user_id: string | null;
  created_at: string;
  updated_at: string;
  users: {
    nama_lengkap: string;
    email: string;
  } | null;
  project_count: number;
  total_members: number;
}

interface PegawaiUser {
  id: string;
  nama_lengkap: string;
  email: string;
}

interface TeamFormData {
  name: string;
  description: string;
  leader_user_id: string;
}

const initialFormData: TeamFormData = {
  name: "",
  description: "",
  leader_user_id: "",
};

async function fetchTeams(): Promise<Team[]> {
  const response = await fetch("/api/admin/teams", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Gagal mengambil data tim");
  return result.data;
}

async function fetchPegawaiUsers(): Promise<PegawaiUser[]> {
  const response = await fetch("/api/admin/users?role=pegawai&is_active=true", {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Gagal mengambil data pengguna");
  return result.data;
}

export default function TeamManagement() {
  // const router = useRouter(); // Available for future navigation
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<TeamFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const { data: teams, isLoading } = useQuery<Team[], Error>({
    queryKey: ["admin", "teams"],
    queryFn: fetchTeams,
    staleTime: 2 * 60 * 1000,
  });

  const { data: pegawaiUsers } = useQuery<PegawaiUser[], Error>({
    queryKey: ["admin", "pegawai_users"],
    queryFn: fetchPegawaiUsers,
    staleTime: 5 * 60 * 1000,
  });

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) {
      toast.error("Nama tim wajib diisi");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal membuat tim");
      }

      toast.success("Tim berhasil dibuat!");
      setFormData(initialFormData);
      setIsCreateDialogOpen(false);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error(error instanceof Error ? error.message : "Gagal membuat tim");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeamId) return;
    if (!formData.name.trim()) {
      toast.error("Nama tim wajib diisi");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/admin/teams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTeamId, ...formData }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal memperbarui tim");
      toast.success("Tim berhasil diperbarui!");
      setIsCreateDialogOpen(false);
      setEditingTeamId(null);
      setFormData(initialFormData);
      queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
    } catch (error) {
      console.error("Error updating team:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal memperbarui tim",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const confirmed = window.confirm(
        "Hapus tim ini? Tindakan ini tidak dapat dibatalkan.",
      );
      if (!confirmed) return;
      const response = await fetch(`/api/admin/teams?id=${teamId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menghapus tim");
      toast.success("Tim berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus tim",
      );
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredTeams = (teams || []).filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.users?.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Memuat data tim...</p>
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
            Manajemen Tim
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Buat dan kelola tim dengan penunjukan ketua.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/admin/monitoring">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              <Monitor className="w-4 h-4 mr-2" />
              Monitoring Tim
            </Button>
          </Link>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingTeamId(null);
                setFormData(initialFormData);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                <Plus className="w-4 h-4 mr-2" />
                Buat Tim
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTeamId ? "Ubah Tim" : "Buat Tim Baru"}
                </DialogTitle>
                <DialogDescription>
                  {editingTeamId
                    ? "Perbarui informasi tim dan penunjukan ketua."
                    : "Buat tim dan tetapkan ketua tim (opsional)."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Tim *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Masukkan nama tim"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Deskripsikan tujuan dan tanggung jawab tim"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leader">Ketua Tim</Label>
                  <Select
                    value={formData.leader_user_id || undefined}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        leader_user_id: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih ketua tim (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak ada ketua tim</SelectItem>
                      {(pegawaiUsers || []).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center space-x-2">
                            <Crown className="w-4 h-4 text-yellow-500" />
                            <div>
                              <div className="font-medium">
                                {user.nama_lengkap}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setFormData(initialFormData);
                    setEditingTeamId(null);
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingTeamId ? handleUpdateTeam : handleCreateTeam}
                  disabled={creating}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingTeamId ? "Saving..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      {editingTeamId ? "Save Changes" : "Create Team"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No teams found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Create your first team to get started"}
            </p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </div>
        ) : (
          filteredTeams.map((team) => (
            <div
              key={team.id}
              className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ring-1 ring-gray-100"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {team.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      {team.users ? (
                        <div className="flex items-center space-x-2">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {team.users.nama_lengkap}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {team.users.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div className="text-sm text-gray-500">
                            No leader assigned
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <FolderOpen className="w-4 h-4 text-blue-500" />
                            <span className="text-gray-600">
                              {team.project_count} projects
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-green-500" />
                            <span className="text-gray-600">
                              {team.total_members} members
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        setEditingTeamId(team.id);
                        setFormData({
                          name: team.name,
                          description: team.description || "",
                          leader_user_id: team.leader_user_id || "",
                        });
                        setIsCreateDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteTeam(team.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-400 border-t pt-4">
                  Created:{" "}
                  {new Date(team.created_at).toLocaleDateString("id-ID")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

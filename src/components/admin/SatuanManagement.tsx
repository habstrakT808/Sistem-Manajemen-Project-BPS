// File: src/components/admin/SatuanManagement.tsx

"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Save, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SatuanData {
  id: string;
  nama_satuan: string;
  deskripsi: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SatuanFormData {
  nama_satuan: string;
  deskripsi: string;
}

const initialFormData: SatuanFormData = {
  nama_satuan: "",
  deskripsi: "",
};

async function fetchSatuanRequest(): Promise<SatuanData[]> {
  const response = await fetch("/api/admin/satuan", {
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to fetch satuan");
  return result.data as SatuanData[];
}

export default function SatuanManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSatuan, setEditingSatuan] = useState<SatuanData | null>(null);
  const [formData, setFormData] = useState<SatuanFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const queryClient = useQueryClient();

  const {
    data: satuanList,
    isLoading,
    error,
  } = useQuery<SatuanData[], Error>({
    queryKey: ["admin", "satuan"],
    queryFn: fetchSatuanRequest,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: SatuanFormData) => {
      const response = await fetch("/api/admin/satuan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to create satuan");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "satuan"] });
      toast.success("Satuan berhasil dibuat!");
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SatuanFormData }) => {
      const response = await fetch(`/api/admin/satuan/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to update satuan");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "satuan"] });
      toast.success("Satuan berhasil diperbarui!");
      setIsEditDialogOpen(false);
      setEditingSatuan(null);
      setFormData(initialFormData);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/satuan/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to delete satuan");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "satuan"] });
      toast.success("Satuan berhasil dihapus!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = useCallback(async () => {
    if (!formData.nama_satuan.trim()) {
      toast.error("Nama satuan harus diisi");
      return;
    }

    setSubmitting(true);
    try {
      await createMutation.mutateAsync(formData);
    } finally {
      setSubmitting(false);
    }
  }, [formData, createMutation]);

  const handleEdit = useCallback((satuan: SatuanData) => {
    setEditingSatuan(satuan);
    setFormData({
      nama_satuan: satuan.nama_satuan,
      deskripsi: satuan.deskripsi || "",
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!editingSatuan || !formData.nama_satuan.trim()) {
      toast.error("Nama satuan harus diisi");
      return;
    }

    setSubmitting(true);
    try {
      await updateMutation.mutateAsync({
        id: editingSatuan.id,
        data: formData,
      });
    } finally {
      setSubmitting(false);
    }
  }, [editingSatuan, formData, updateMutation]);

  const handleDelete = useCallback(
    (satuan: SatuanData) => {
      if (
        confirm(
          `Apakah Anda yakin ingin menghapus satuan "${satuan.nama_satuan}"?`,
        )
      ) {
        deleteMutation.mutate(satuan.id);
      }
    },
    [deleteMutation],
  );

  const handleCloseCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false);
    setFormData(initialFormData);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingSatuan(null);
    setFormData(initialFormData);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Memuat data satuan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">Gagal memuat data satuan</p>
        <p className="text-sm text-gray-500 mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Satuan</h2>
          <p className="text-gray-600">
            Kelola jenis satuan untuk sistem honor dan transport
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Satuan
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Satuan</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {satuanList?.map((satuan) => (
              <TableRow key={satuan.id}>
                <TableCell className="font-medium">
                  {satuan.nama_satuan}
                </TableCell>
                <TableCell>{satuan.deskripsi || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={satuan.is_active ? "default" : "secondary"}
                    className={
                      satuan.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {satuan.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(satuan.created_at).toLocaleDateString("id-ID")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(satuan)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(satuan)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Satuan Baru</DialogTitle>
            <DialogDescription>
              Tambahkan jenis satuan baru untuk sistem honor dan transport
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nama_satuan">Nama Satuan *</Label>
              <Input
                id="nama_satuan"
                value={formData.nama_satuan}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nama_satuan: e.target.value,
                  }))
                }
                placeholder="Contoh: O-B, O-K, Segmen"
              />
            </div>
            <div>
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deskripsi: e.target.value,
                  }))
                }
                placeholder="Deskripsi singkat tentang satuan ini"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCreateDialog}>
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Satuan</DialogTitle>
            <DialogDescription>
              Perbarui informasi satuan yang dipilih
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_nama_satuan">Nama Satuan *</Label>
              <Input
                id="edit_nama_satuan"
                value={formData.nama_satuan}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nama_satuan: e.target.value,
                  }))
                }
                placeholder="Contoh: O-B, O-K, Segmen"
              />
            </div>
            <div>
              <Label htmlFor="edit_deskripsi">Deskripsi</Label>
              <Textarea
                id="edit_deskripsi"
                value={formData.deskripsi}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deskripsi: e.target.value,
                  }))
                }
                placeholder="Deskripsi singkat tentang satuan ini"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Perbarui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

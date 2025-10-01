"use client";

import React, { useEffect, useState } from "react";
import { Database } from "@/../database/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Star, DollarSign } from "lucide-react";
import { toast } from "sonner";

type MitraRow = Database["public"]["Tables"]["mitra"]["Row"];

interface MitraFormProps {
  mitra?: MitraRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  nama_mitra: string;
  jenis: "perusahaan" | "individu";
  kontak: string;
  alamat: string;
  is_active: boolean;
  posisi_id?: string | null;
  jeniskelamin?: "laki_laki" | "perempuan" | "";
  pendidikan?: "sma" | "d4s1" | "";
  pekerjaan_id?: string | null;
  pekerjaan_nama?: string;
  sobat_id?: string;
  email?: string;
}

interface OptionItem {
  id: string;
  name: string;
}

export function MitraForm({ mitra, onClose, onSuccess }: MitraFormProps) {
  const [formData, setFormData] = useState<FormData>({
    nama_mitra: mitra?.nama_mitra || "",
    jenis: mitra?.jenis || "individu",
    kontak: mitra?.kontak || "",
    alamat: mitra?.alamat || "",
    is_active: mitra?.is_active ?? true,

    posisi_id: (mitra as any)?.posisi_id || null,
    jeniskelamin: ((mitra as any)?.jeniskelamin as any) || "",
    pendidikan: ((mitra as any)?.pendidikan as any) || "",
    pekerjaan_id: (mitra as any)?.pekerjaan_id || null,
    sobat_id: (mitra as any)?.sobat_id || "",
    email: (mitra as any)?.email || "",
  });
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<OptionItem[]>([]);
  const [occupations, setOccupations] = useState<OptionItem[]>([]);

  const isEditing = !!mitra;

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, oRes] = await Promise.all([
          fetch("/api/admin/mitra-positions", { cache: "no-store" }),
          fetch("/api/admin/mitra-occupations", { cache: "no-store" }),
        ]);
        const pJson = await pRes.json();
        const oJson = await oRes.json();
        if (pRes.ok && Array.isArray(pJson.data)) setPositions(pJson.data);
        if (oRes.ok && Array.isArray(oJson.data)) setOccupations(oJson.data);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        // Update existing mitra
        const response = await fetch("/api/admin/mitra", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: mitra.id,
            nama_mitra: formData.nama_mitra,
            jenis: formData.jenis,
            kontak: formData.kontak || null,
            alamat: formData.alamat || null,
            is_active: formData.is_active,
            posisi_id: formData.posisi_id || null,
            jeniskelamin: formData.jeniskelamin || null,
            pendidikan: formData.pendidikan || null,
            pekerjaan_id: formData.pekerjaan_id || null,
            pekerjaan_nama: formData.pekerjaan_nama || undefined,
            sobat_id: formData.sobat_id || null,
            email: formData.email || null,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || "Failed to update mitra");
          return;
        }

        toast.success("Mitra updated successfully");
      } else {
        // Create new mitra
        const response = await fetch("/api/admin/mitra", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nama_mitra: formData.nama_mitra,
            jenis: formData.jenis,
            kontak: formData.kontak || null,
            alamat: formData.alamat || null,
            is_active: formData.is_active,
            posisi_id: formData.posisi_id || null,
            jeniskelamin: formData.jeniskelamin || null,
            pendidikan: formData.pendidikan || null,
            pekerjaan_id: formData.pekerjaan_id || null,
            pekerjaan_nama: formData.pekerjaan_nama || undefined,
            sobat_id: formData.sobat_id || null,
            email: formData.email || null,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || "Failed to create mitra");
          return;
        }

        toast.success("Mitra created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving mitra:", error);
      toast.error("Failed to save mitra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mitra
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Edit Mitra" : "Create New Mitra"}
          </h1>
          <p className="text-gray-600">
            {isEditing
              ? "Update partner information and details"
              : "Add a new business partner or contractor"}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
              <div className="font-semibold text-xl">Partner Information</div>
              <div className="text-muted-foreground text-sm">
                {isEditing
                  ? "Update the partner details below"
                  : "Enter the partner details below"}
              </div>
            </div>
            <div className="p-6 bg-white">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Partner Name */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="nama_mitra">Partner Name *</Label>
                    <Input
                      id="nama_mitra"
                      value={formData.nama_mitra}
                      onChange={(e) =>
                        setFormData({ ...formData, nama_mitra: e.target.value })
                      }
                      placeholder="e.g., PT Teknologi Maju or Ahmad Consultant"
                      required
                      className="rounded-xl border-2 focus:border-purple-300"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="is_active">Partner Status</Label>
                    <div className="flex items-center space-x-2 p-3 rounded-xl border-2 border-gray-200">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, is_active: checked })
                        }
                      />
                      <Label
                        htmlFor="is_active"
                        className="text-sm font-medium"
                      >
                        {formData.is_active
                          ? "Active Partner"
                          : "Inactive Partner"}
                      </Label>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-2">
                    <Label htmlFor="kontak">Contact Information</Label>
                    <Input
                      id="kontak"
                      value={formData.kontak}
                      onChange={(e) =>
                        setFormData({ ...formData, kontak: e.target.value })
                      }
                      placeholder="Phone, email, or WhatsApp"
                      className="rounded-xl border-2 focus:border-purple-300"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="alamat">Address</Label>
                    <Input
                      id="alamat"
                      value={formData.alamat}
                      onChange={(e) =>
                        setFormData({ ...formData, alamat: e.target.value })
                      }
                      placeholder="Business or home address"
                      className="rounded-xl border-2 focus:border-purple-300"
                    />
                  </div>
                </div>

                {/* Extra Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Posisi</Label>
                    <Select
                      value={formData.posisi_id || ""}
                      onValueChange={(v) =>
                        setFormData({ ...formData, posisi_id: v || null })
                      }
                    >
                      <SelectTrigger className="rounded-xl border-2 focus:border-purple-300">
                        <SelectValue placeholder="Pilih posisi" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jenis Kelamin</Label>
                    <Select
                      value={formData.jeniskelamin || ""}
                      onValueChange={(v: "laki_laki" | "perempuan") =>
                        setFormData({ ...formData, jeniskelamin: v })
                      }
                    >
                      <SelectTrigger className="rounded-xl border-2 focus:border-purple-300">
                        <SelectValue placeholder="Pilih jenis kelamin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="laki_laki">Laki-laki</SelectItem>
                        <SelectItem value="perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Pendidikan</Label>
                    <Select
                      value={formData.pendidikan || ""}
                      onValueChange={(v: "sma" | "d4s1") =>
                        setFormData({ ...formData, pendidikan: v })
                      }
                    >
                      <SelectTrigger className="rounded-xl border-2 focus:border-purple-300">
                        <SelectValue placeholder="Pilih pendidikan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sma">Tamat SMA/Sederajat</SelectItem>
                        <SelectItem value="d4s1">Tamat D4/S1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Pekerjaan</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={formData.pekerjaan_id || ""}
                        onValueChange={(v) =>
                          setFormData({ ...formData, pekerjaan_id: v || null })
                        }
                      >
                        <SelectTrigger className="rounded-xl border-2 focus:border-purple-300 w-full md:w-auto min-w-[220px]">
                          <SelectValue placeholder="Pilih pekerjaan" />
                        </SelectTrigger>
                        <SelectContent>
                          {occupations.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Or type new occupation"
                        value={formData.pekerjaan_nama || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pekerjaan_nama: e.target.value,
                          })
                        }
                        className="rounded-xl border-2 focus:border-purple-300"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="border-2"
                        onClick={async () => {
                          const name = (formData.pekerjaan_nama || "").trim();
                          if (!name) return;
                          const res = await fetch(
                            "/api/admin/mitra-occupations",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ name }),
                            },
                          );
                          const json = await res.json();
                          if (res.ok) {
                            setOccupations((prev) => [
                              { id: json.data.id, name },
                              ...prev,
                            ]);
                            setFormData({
                              ...formData,
                              pekerjaan_id: json.data.id,
                            });
                            toast.success("Occupation added");
                          } else
                            toast.error(
                              json.error || "Failed to add occupation",
                            );
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sobat_id">Sobat ID</Label>
                    <Input
                      id="sobat_id"
                      value={formData.sobat_id || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, sobat_id: e.target.value })
                      }
                      placeholder="Unique ID from client"
                      className="rounded-xl border-2 focus:border-purple-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@example.com"
                      className="rounded-xl border-2 focus:border-purple-300"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Save className="w-4 h-4" />
                        <span>
                          {isEditing ? "Update Mitra" : "Create Mitra"}
                        </span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          {/* Monthly Limit Info */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6">
              <div className="font-semibold text-lg flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Financial Limits
              </div>
            </div>
            <div className="p-6 bg-white">
              <div className="p-4 bg-white rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-orange-900">
                    Monthly Limit
                  </span>
                  <span className="text-2xl font-bold text-orange-600">
                    3.3M
                  </span>
                </div>
                <p className="text-sm text-orange-700">
                  Maximum honor per mitra per month is Rp 3,300,000. System will
                  automatically prevent assignments that exceed this limit.
                </p>
              </div>
            </div>
          </div>

          {/* Rating Info */}
          {isEditing && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100">
                <CardTitle className="text-lg flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {mitra?.rating_average?.toFixed(1) || "0.0"}
                  </div>
                  <div className="flex justify-center mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= (mitra?.rating_average || 0)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    Average rating from projects
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

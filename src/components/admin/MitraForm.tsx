"use client";

import React, { useState } from "react";
import { Database } from "@/../database/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Save,
  Building,
  User,
  Star,
  DollarSign,
} from "lucide-react";
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
  deskripsi: string;
  is_active: boolean;
}

export function MitraForm({ mitra, onClose, onSuccess }: MitraFormProps) {
  const [formData, setFormData] = useState<FormData>({
    nama_mitra: mitra?.nama_mitra || "",
    jenis: mitra?.jenis || "perusahaan",
    kontak: mitra?.kontak || "",
    alamat: mitra?.alamat || "",
    deskripsi: mitra?.deskripsi || "",
    is_active: mitra?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  const isEditing = !!mitra;

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
            deskripsi: formData.deskripsi || null,
            is_active: formData.is_active,
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
            deskripsi: formData.deskripsi || null,
            is_active: formData.is_active,
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
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
              <div className="font-semibold text-xl">Partner Information</div>
              <div className="text-muted-foreground text-sm">
                {isEditing
                  ? "Update the partner details below"
                  : "Enter the partner details below"}
              </div>
            </div>
            <div className="p-6">
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

                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="jenis">Partner Type *</Label>
                    <Select
                      value={formData.jenis}
                      onValueChange={(value: "perusahaan" | "individu") =>
                        setFormData({ ...formData, jenis: value })
                      }
                    >
                      <SelectTrigger className="rounded-xl border-2 focus:border-purple-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="perusahaan">
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-2" />
                            Perusahaan - Company
                          </div>
                        </SelectItem>
                        <SelectItem value="individu">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            Individu - Individual
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
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

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="deskripsi">Description</Label>
                  <Textarea
                    id="deskripsi"
                    value={formData.deskripsi}
                    onChange={(e) =>
                      setFormData({ ...formData, deskripsi: e.target.value })
                    }
                    placeholder="Brief description of services or expertise..."
                    rows={4}
                    className="rounded-xl border-2 focus:border-purple-300"
                  />
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
          {/* Partner Type Info */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6">
              <div className="font-semibold text-lg flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Partner Types
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center mb-2">
                  <Building className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-900">
                    Perusahaan
                  </span>
                </div>
                <p className="text-sm text-blue-700">
                  Corporate entities, companies, and organizations that provide
                  services or products.
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center mb-2">
                  <User className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-semibold text-green-900">Individu</span>
                </div>
                <p className="text-sm text-green-700">
                  Individual contractors, freelancers, and personal service
                  providers.
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Limit Info */}
          <div className="border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6">
              <div className="font-semibold text-lg flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Financial Limits
              </div>
            </div>
            <div className="p-6">
              <div className="p-4 bg-orange-50 rounded-xl">
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

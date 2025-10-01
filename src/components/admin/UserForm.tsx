"use client";

import React, { useState } from "react";
import { Database } from "@/../database/types/database.types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

interface UserFormProps {
  user?: UserRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  email: string;
  password: string;
  role: UserRole;
  nama_lengkap: string;
  no_telepon: string;
  alamat: string;
  is_active: boolean;
}

export function UserForm({ user, onClose, onSuccess }: UserFormProps) {
  const [formData, setFormData] = useState<FormData>({
    email: user?.email || "",
    password: "",
    role: user?.role || "pegawai",
    nama_lengkap: user?.nama_lengkap || "",
    no_telepon: user?.no_telepon || "",
    alamat: user?.alamat || "",
    is_active: user?.is_active ?? true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        // Update existing user
        const response = await fetch("/api/admin/users", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: user.id,
            email: formData.email,
            role: formData.role,
            nama_lengkap: formData.nama_lengkap,
            no_telepon: formData.no_telepon || null,
            alamat: formData.alamat || null,
            is_active: formData.is_active,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || "Failed to update user");
          return;
        }

        toast.success("User updated successfully");
      } else {
        // Create new user
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            role: formData.role,
            nama_lengkap: formData.nama_lengkap,
            no_telepon: formData.no_telepon || null,
            alamat: formData.alamat || null,
            is_active: formData.is_active,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || "Failed to create user");
          return;
        }

        toast.success("User created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("Failed to save user");
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
          Back to Users
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Edit User" : "Create New User"}
          </h1>
          <p className="text-gray-600">
            {isEditing
              ? "Update user information and permissions"
              : "Add a new user to the system"}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>
            {isEditing
              ? "Update the user details below"
              : "Enter the user details below"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              {/* Password (only for new users) */}
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                      minLength={8}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Minimum 8 characters</p>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="nama_lengkap">Full Name *</Label>
                <Input
                  id="nama_lengkap"
                  value={formData.nama_lengkap}
                  onChange={(e) =>
                    setFormData({ ...formData, nama_lengkap: e.target.value })
                  }
                  required
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pegawai">Pegawai - Employee</SelectItem>
                    <SelectItem value="admin">
                      Admin - System Administrator
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="no_telepon">Phone Number</Label>
                <Input
                  id="no_telepon"
                  type="tel"
                  value={formData.no_telepon}
                  onChange={(e) =>
                    setFormData({ ...formData, no_telepon: e.target.value })
                  }
                  placeholder="e.g., 0812-3456-7890"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="is_active">Account Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active" className="text-sm">
                    {formData.is_active ? "Active" : "Inactive"}
                  </Label>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="alamat">Address</Label>
              <Textarea
                id="alamat"
                value={formData.alamat}
                onChange={(e) =>
                  setFormData({ ...formData, alamat: e.target.value })
                }
                placeholder="Enter full address"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>{isEditing ? "Update User" : "Create User"}</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

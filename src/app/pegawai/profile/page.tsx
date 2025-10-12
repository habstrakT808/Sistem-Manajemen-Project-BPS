// File: src/app/pegawai/profile/page.tsx

"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Camera,
  Shield,
  Bell,
  Award,
  Edit,
  Save,
  Loader2,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Settings,
  Smartphone,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Leaf,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

interface ProfileData {
  id: string;
  email: string;
  nama_lengkap: string;
  no_telepon?: string;
  alamat?: string;
  avatar_url?: string;
  bio?: string;
  skills?: string[];
  joined_date: string;
  last_active: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  task_reminders: boolean;
  project_updates: boolean;
  deadline_alerts: boolean;
  system_announcements: boolean;
  mobile_push: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_notifications: boolean;
  session_timeout: number;
  password_last_changed: string;
}

interface SkillData {
  name: string;
  level: number;
  category: string;
}

function ProfilePageContent() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile Data
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nama_lengkap: "",
    no_telepon: "",
    alamat: "",
    bio: "",
  });

  // Password Change
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notifications
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      email_notifications: true,
      task_reminders: true,
      project_updates: true,
      deadline_alerts: true,
      system_announcements: true,
      mobile_push: false,
    });

  // Security
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_notifications: true,
    session_timeout: 480,
    password_last_changed: "",
  });

  // Skills
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [newSkill, setNewSkill] = useState({
    name: "",
    level: 1,
    category: "technical",
  });
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  const skillCategories = [
    { value: "technical", label: "Technical" },
    { value: "management", label: "Management" },
    { value: "communication", label: "Communication" },
    { value: "analytical", label: "Analytical" },
    { value: "creative", label: "Creative" },
  ];

  // Fetch profile data
  const fetchProfileData = useCallback(async () => {
    try {
      const response = await fetch("/api/pegawai/profile");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengambil profil");
      }

      setProfileData(result.profile);
      setNotificationSettings((prev) => result.notifications || prev);
      setSecuritySettings((prev) => result.security || prev);
      setSkills(result.skills || []);

      // Set form data
      setProfileForm({
        nama_lengkap: result.profile.nama_lengkap || "",
        no_telepon: result.profile.no_telepon || "",
        alamat: result.profile.alamat || "",
        bio: result.profile.bio || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Gagal memuat data profil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Handle avatar upload
  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file harus kurang dari 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Silakan pilih file gambar");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/pegawai/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengunggah avatar");
      }

      setProfileData((prev) =>
        prev ? { ...prev, avatar_url: result.avatar_url } : null,
      );
      toast.success("Avatar berhasil diperbarui!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Gagal mengunggah avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    setUpdating(true);
    try {
      const response = await fetch("/api/pegawai/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal memperbarui profil");
      }

      setProfileData((prev) => (prev ? { ...prev, ...profileForm } : null));
      setEditingProfile(false);
      toast.success("Profil berhasil diperbarui!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profil");
    } finally {
      setUpdating(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Password baru tidak cocok");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch("/api/pegawai/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengganti password");
      }

      setIsPasswordDialogOpen(false);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      toast.success("Password berhasil diganti!");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Gagal mengganti password");
    } finally {
      setUpdating(false);
    }
  };

  // Handle notification settings update
  const handleNotificationUpdate = async (
    key: keyof NotificationSettings,
    value: boolean,
  ) => {
    const updatedSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(updatedSettings);

    try {
      const response = await fetch("/api/pegawai/profile/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Gagal memperbarui notifikasi");
      }

      toast.success("Pengaturan notifikasi diperbarui!");
    } catch (error) {
      console.error("Error updating notifications:", error);
      toast.error("Gagal memperbarui pengaturan notifikasi");
      // Revert on error
      setNotificationSettings((prev) => ({ ...prev, [key]: !value }));
    }
  };

  // Handle skill addition
  const handleAddSkill = async () => {
    if (!newSkill.name.trim()) {
      toast.error("Silakan masukkan nama keahlian");
      return;
    }

    setIsAddingSkill(true);
    try {
      const response = await fetch("/api/pegawai/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSkill),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal menambahkan keahlian");
      }

      setSkills((prev) => [...prev, result.skill]);
      setNewSkill({ name: "", level: 1, category: "technical" });
      toast.success("Keahlian berhasil ditambahkan!");
    } catch (error) {
      console.error("Error adding skill:", error);
      toast.error("Gagal menambahkan keahlian");
    } finally {
      setIsAddingSkill(false);
    }
  };

  // Handle skill removal
  const handleRemoveSkill = async (skillName: string) => {
    try {
      const response = await fetch(
        `/api/pegawai/profile/skills/${encodeURIComponent(skillName)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Gagal menghapus keahlian");
      }

      setSkills((prev) => prev.filter((skill) => skill.name !== skillName));
      toast.success("Keahlian berhasil dihapus!");
    } catch (error) {
      console.error("Error removing skill:", error);
      toast.error("Gagal menghapus keahlian");
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="animate-pulse border-0 shadow-xl rounded-xl p-6 h-96"></div>
          <div className="lg:col-span-2 animate-pulse border-0 shadow-xl rounded-xl p-6 h-96"></div>
        </div>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Profil Saya
            </h1>
            <p className="text-gray-600 text-lg mt-2">
              Kelola informasi pribadi dan pengaturan akun
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-green-500 to-teal-600 text-white border-0">
              <Leaf className="w-3 h-3 mr-1" />
              Pegawai Account
            </Badge>
            <Badge className="bg-white text-green-600 border border-green-200">
              <Calendar className="w-3 h-3 mr-1" />
              Bergabung{" "}
              {new Date(profileData.joined_date).toLocaleDateString("id-ID", {
                month: "short",
                year: "numeric",
              })}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                  <AvatarImage src={profileData.avatar_url} />
                  <AvatarFallback className="bg-white text-green-600 text-2xl font-bold">
                    {profileData.nama_lengkap?.charAt(0) ||
                      user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-white text-green-600 rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </div>
              <h2 className="text-xl font-bold mb-1">
                {profileData.nama_lengkap}
              </h2>
              <p className="text-green-100 mb-4">{profileData.email}</p>
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Akun Terverifikasi</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3 text-gray-600">
              <Phone className="w-4 h-4" />
              <span className="text-sm">
                {profileData.no_telepon || "Belum diisi"}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                {profileData.alamat || "Belum diisi"}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                Terakhir aktif:{" "}
                {new Date(profileData.last_active).toLocaleDateString("id-ID")}
              </span>
            </div>

            {profileData.bio && (
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl">
                <p className="text-sm text-gray-700">{profileData.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="text-muted-foreground items-center justify-center grid w-full grid-cols-4 bg-white shadow-lg rounded-xl p-1 h-auto">
              <TabsTrigger
                value="personal"
                className="flex-1 gap-1.5 border border-transparent text-sm font-medium whitespace-nowrap focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
              >
                <User className="w-4 h-4" />
                <span>Pribadi</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="flex-1 gap-1.5 border border-transparent text-sm font-medium whitespace-nowrap focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
              >
                <Shield className="w-4 h-4" />
                <span>Keamanan</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex-1 gap-1.5 border border-transparent text-sm font-medium whitespace-nowrap focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
              >
                <Bell className="w-4 h-4" />
                <span>Notifikasi</span>
              </TabsTrigger>
              <TabsTrigger
                value="skills"
                className="flex-1 gap-1.5 border border-transparent text-sm font-medium whitespace-nowrap focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
              >
                <Award className="w-4 h-4" />
                <span>Keahlian</span>
              </TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent
              value="personal"
              className="border-0 shadow-xl rounded-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <User className="w-6 h-6 mr-3" />
                    Informasi Pribadi
                  </h3>
                  <Button
                    onClick={() => setEditingProfile(!editingProfile)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {editingProfile ? "Batal" : "Ubah"}
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
                    <Input
                      id="nama_lengkap"
                      value={profileForm.nama_lengkap}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          nama_lengkap: e.target.value,
                        }))
                      }
                      disabled={!editingProfile}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Alamat Email</Label>
                    <Input
                      id="email"
                      value={profileData.email}
                      disabled
                      className="mt-2 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Email tidak dapat diubah
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="no_telepon">Nomor Telepon</Label>
                    <Input
                      id="no_telepon"
                      value={profileForm.no_telepon}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          no_telepon: e.target.value,
                        }))
                      }
                      disabled={!editingProfile}
                      placeholder="contoh: +62-812-3456-7890"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="alamat">Alamat</Label>
                    <Input
                      id="alamat"
                      value={profileForm.alamat}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          alamat: e.target.value,
                        }))
                      }
                      disabled={!editingProfile}
                      placeholder="Alamat Anda"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    disabled={!editingProfile}
                    placeholder="Ceritakan tentang diri Anda..."
                    rows={4}
                    className="mt-2"
                  />
                </div>

                {editingProfile && (
                  <div className="flex items-center space-x-4 pt-4">
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={updating}
                      className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Memperbarui...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Simpan Perubahan
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileForm({
                          nama_lengkap: profileData.nama_lengkap || "",
                          no_telepon: profileData.no_telepon || "",
                          alamat: profileData.alamat || "",
                          bio: profileData.bio || "",
                        });
                      }}
                      variant="outline"
                    >
                      Batal
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent
              value="security"
              className="border-0 shadow-xl rounded-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-600 to-pink-600 p-6">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Shield className="w-6 h-6 mr-3" />
                  Pengaturan Keamanan
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Password Section */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Kata Sandi
                      </h4>
                      <p className="text-sm text-gray-500">
                        Terakhir diubah:{" "}
                        {new Date(
                          securitySettings.password_last_changed || Date.now(),
                        ).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsPasswordDialogOpen(true)}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Ganti Password
                    </Button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Autentikasi Dua Faktor
                      </h4>
                      <p className="text-sm text-gray-500">
                        Tambahkan lapisan keamanan ekstra pada akun Anda
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.two_factor_enabled}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          two_factor_enabled: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Login Notifications */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Notifikasi Login
                      </h4>
                      <p className="text-sm text-gray-500">
                        Dapatkan pemberitahuan saat ada yang masuk ke akun Anda
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.login_notifications}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          login_notifications: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Session Timeout */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Waktu Habis Sesi
                      </h4>
                      <p className="text-sm text-gray-500">
                        Keluar otomatis setelah periode tidak aktif
                      </p>
                    </div>
                    <Select
                      value={securitySettings.session_timeout.toString()}
                      onValueChange={(value) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          session_timeout: parseInt(value),
                        }))
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 jam</SelectItem>
                        <SelectItem value="240">4 jam</SelectItem>
                        <SelectItem value="480">8 jam</SelectItem>
                        <SelectItem value="720">12 jam</SelectItem>
                        <SelectItem value="1440">24 jam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent
              value="notifications"
              className="border-0 shadow-xl rounded-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Bell className="w-6 h-6 mr-3" />
                  Preferensi Notifikasi
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {[
                  {
                    key: "email_notifications" as keyof NotificationSettings,
                    title: "Notifikasi Email",
                    description: "Terima notifikasi melalui email",
                    icon: Mail,
                  },
                  {
                    key: "task_reminders" as keyof NotificationSettings,
                    title: "Pengingat Tugas",
                    description: "Pengingat tenggat tugas yang akan datang",
                    icon: AlertCircle,
                  },
                  {
                    key: "project_updates" as keyof NotificationSettings,
                    title: "Pembaruan Proyek",
                    description: "Notifikasi perubahan status proyek",
                    icon: TrendingUp,
                  },
                  {
                    key: "deadline_alerts" as keyof NotificationSettings,
                    title: "Peringatan Tenggat",
                    description: "Peringatan penting saat tenggat mendekat",
                    icon: Calendar,
                  },
                  {
                    key: "system_announcements" as keyof NotificationSettings,
                    title: "Pengumuman Sistem",
                    description: "Pembaruan dan pengumuman penting sistem",
                    icon: Settings,
                  },
                  {
                    key: "mobile_push" as keyof NotificationSettings,
                    title: "Notifikasi Push Mobile",
                    description: "Notifikasi push pada perangkat mobile",
                    icon: Smartphone,
                  },
                ].map((setting) => {
                  const IconComponent = setting.icon;
                  return (
                    <div
                      key={setting.key}
                      className="p-4 border border-gray-200 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {setting.title}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {setting.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSettings[setting.key]}
                          onCheckedChange={(checked) =>
                            handleNotificationUpdate(setting.key, checked)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent
              value="skills"
              className="border-0 shadow-xl rounded-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Award className="w-6 h-6 mr-3" />
                  Keahlian & Kompetensi
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Add New Skill */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Tambah Keahlian Baru
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Nama keahlian"
                        value={newSkill.name}
                        onChange={(e) =>
                          setNewSkill((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Select
                        value={newSkill.category}
                        onValueChange={(value) =>
                          setNewSkill((prev) => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {skillCategories.map((category) => (
                            <SelectItem
                              key={category.value}
                              value={category.value}
                            >
                              {category.value === "technical"
                                ? "Teknis"
                                : category.value === "management"
                                  ? "Manajemen"
                                  : category.value === "communication"
                                    ? "Komunikasi"
                                    : category.value === "analytical"
                                      ? "Analitis"
                                      : "Kreatif"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Button
                        onClick={handleAddSkill}
                        disabled={isAddingSkill || !newSkill.name.trim()}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      >
                        {isAddingSkill ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Tambah Keahlian"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Skills List */}
                <div className="space-y-4">
                  {skills.length === 0 ? (
                    <div className="text-center py-8">
                      <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Belum ada keahlian</p>
                      <p className="text-sm text-gray-400">
                        Tambahkan keahlian pertama Anda di atas
                      </p>
                    </div>
                  ) : (
                    skills.map((skill, index) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 rounded-xl"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {skill.name}
                            </h4>
                            <Badge className="mt-1 bg-purple-100 text-purple-800">
                              {(() => {
                                switch (skill.category) {
                                  case "technical":
                                    return "Teknis";
                                  case "management":
                                    return "Manajemen";
                                  case "communication":
                                    return "Komunikasi";
                                  case "analytical":
                                    return "Analitis";
                                  case "creative":
                                    return "Kreatif";
                                  default:
                                    return skill.category;
                                }
                              })()}
                            </Badge>
                          </div>
                          <Button
                            onClick={() => handleRemoveSkill(skill.name)}
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            Hapus
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Tingkat Kemahiran</span>
                            <span className="font-semibold">
                              {skill.level}/5
                            </span>
                          </div>
                          <Progress value={skill.level * 20} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Pemula</span>
                            <span>Ahli</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Password Change Dialog */}
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Key className="w-5 h-5 mr-2 text-red-600" />
              Ganti Password
            </DialogTitle>
            <DialogDescription>
              Masukkan kata sandi saat ini dan pilih kata sandi baru yang aman.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="current_password">Password Saat Ini</Label>
              <div className="relative mt-1">
                <Input
                  id="current_password"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      current_password: e.target.value,
                    }))
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 px-0"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      current: !prev.current,
                    }))
                  }
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="new_password">Password Baru</Label>
              <div className="relative mt-1">
                <Input
                  id="new_password"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      new_password: e.target.value,
                    }))
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 px-0"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                  }
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
              <div className="relative mt-1">
                <Input
                  id="confirm_password"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirm_password: e.target.value,
                    }))
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 px-0"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      confirm: !prev.confirm,
                    }))
                  }
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {passwordForm.new_password && (
              <div className="text-xs text-gray-500 space-y-1">
                <p
                  className={
                    passwordForm.new_password.length >= 8
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  • Minimal 8 karakter
                </p>
                <p
                  className={
                    /[A-Z]/.test(passwordForm.new_password)
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  • Mengandung huruf besar
                </p>
                <p
                  className={
                    /[a-z]/.test(passwordForm.new_password)
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  • Mengandung huruf kecil
                </p>
                <p
                  className={
                    /\d/.test(passwordForm.new_password)
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  • Mengandung angka
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPasswordDialogOpen(false);
                setPasswordForm({
                  current_password: "",
                  new_password: "",
                  confirm_password: "",
                });
              }}
              disabled={updating}
            >
              Batal
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={
                updating ||
                !passwordForm.current_password ||
                !passwordForm.new_password ||
                passwordForm.new_password !== passwordForm.confirm_password
              }
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengubah...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Ganti Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfilePageContent />
    </Suspense>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
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
  Edit,
  Save,
  Loader2,
  Key,
  Eye,
  EyeOff,
  Settings,
  Monitor,
  Moon,
  Sun,
  Palette,
  Globe,
  Clock,
  Calendar,
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

interface PreferenceSettings {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  date_format: string;
  time_format: "12h" | "24h";
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile Data
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: "",
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

  // Preferences
  const [preferenceSettings, setPreferenceSettings] =
    useState<PreferenceSettings>({
      theme: "system",
      language: "id",
      timezone: "Asia/Jakarta",
      date_format: "DD/MM/YYYY",
      time_format: "24h",
    });

  // Load profile data
  const loadProfileData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/pegawai/profile");
      if (response.ok) {
        const data = await response.json();
        const profile = data?.profile;
        if (profile) {
          setProfileData(profile);
          setProfileForm({
            email: profile.email || "",
            nama_lengkap: profile.nama_lengkap || "",
            no_telepon: profile.no_telepon || "",
            alamat: profile.alamat || "",
            bio: profile.bio || "",
          });
        }

        if (data?.notifications) {
          setNotificationSettings((prev) => ({
            ...prev,
            ...data.notifications,
          }));
        }
        if (data?.security) {
          setSecuritySettings((prev) => ({ ...prev, ...data.security }));
        }
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch profile");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Gagal memuat data profil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      setUpdating(true);
      const response = await fetch("/api/pegawai/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });

      if (response.ok) {
        const updatedData = await response.json();
        setProfileData(
          (prev) =>
            ({
              ...(updatedData?.profile || prev || {}),
              email:
                profileForm.email ||
                updatedData?.profile?.email ||
                prev?.email ||
                "",
              nama_lengkap: profileForm.nama_lengkap,
              no_telepon: profileForm.no_telepon,
              alamat: profileForm.alamat,
              bio: profileForm.bio,
            }) as any,
        );
        setEditingProfile(false);
        toast.success("Profil berhasil diperbarui");
      } else {
        throw new Error("Failed to update profile");
      }
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

    try {
      setUpdating(true);
      const response = await fetch("/api/pegawai/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      if (response.ok) {
        setIsPasswordDialogOpen(false);
        setPasswordForm({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
        toast.success("Password berhasil diubah");
      } else {
        const error = await response.json();
        toast.error(error.message || "Gagal mengubah password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Gagal mengubah password");
    } finally {
      setUpdating(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/pegawai/upload-avatar", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData((prev) =>
          prev ? { ...prev, avatar_url: data.avatar_url } : null,
        );
        toast.success("Foto profil berhasil diperbarui");
      } else {
        throw new Error("Failed to upload avatar");
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Gagal mengunggah foto profil");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle notification settings update
  const handleNotificationUpdate = async (
    key: keyof NotificationSettings,
    value: boolean,
  ) => {
    try {
      const updatedSettings = { ...notificationSettings, [key]: value };
      setNotificationSettings(updatedSettings);

      const response = await fetch("/api/pegawai/notification-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        toast.success("Pengaturan notifikasi diperbarui");
      } else {
        throw new Error("Failed to update notification settings");
      }
    } catch (error) {
      console.error("Error updating notification settings:", error);
      toast.error("Gagal memperbarui pengaturan notifikasi");
      setNotificationSettings((prev) => ({ ...prev, [key]: !value }));
    }
  };

  // Handle security settings update
  const handleSecurityUpdate = async (
    key: keyof SecuritySettings,
    value: any,
  ) => {
    try {
      const updatedSettings = { ...securitySettings, [key]: value };
      setSecuritySettings(updatedSettings);

      const response = await fetch("/api/pegawai/security-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        toast.success("Pengaturan keamanan diperbarui");
      } else {
        throw new Error("Failed to update security settings");
      }
    } catch (error) {
      console.error("Error updating security settings:", error);
      toast.error("Gagal memperbarui pengaturan keamanan");
      setSecuritySettings((prev) => ({ ...prev, [key]: value }));
    }
  };

  // Handle preference settings update
  const handlePreferenceUpdate = async (
    key: keyof PreferenceSettings,
    value: any,
  ) => {
    try {
      const updatedSettings = { ...preferenceSettings, [key]: value };
      setPreferenceSettings(updatedSettings);

      const response = await fetch("/api/pegawai/preference-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        toast.success("Preferensi diperbarui");
      } else {
        throw new Error("Failed to update preference settings");
      }
    } catch (error) {
      console.error("Error updating preference settings:", error);
      toast.error("Gagal memperbarui preferensi");
      setPreferenceSettings((prev) => ({ ...prev, [key]: value }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
          <p className="text-gray-600 font-medium">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Overview Card - Enhanced */}
        <Card className="mb-8 border-0 shadow-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl overflow-hidden">
          <div className="relative p-8">
            {/* Background decorations */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="absolute top-8 right-8 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-100"></div>
              <div className="absolute bottom-6 left-12 w-2 h-2 bg-white rounded-full animate-pulse delay-200"></div>
              <div className="absolute bottom-4 right-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-300"></div>
            </div>

            <div className="relative flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
              <div className="relative group">
                <Avatar className="w-28 h-28 border-4 border-white/30 shadow-2xl ring-4 ring-white/20">
                  <AvatarImage src={profileData?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-2xl font-bold">
                    {profileData?.nama_lengkap?.charAt(0) || "P"}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-2 -right-2 bg-white rounded-full p-3 shadow-xl cursor-pointer hover:bg-gray-50 transition-all duration-300 group-hover:scale-110">
                  <Camera className="w-5 h-5 text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left text-white">
                <h2 className="text-3xl font-bold mb-2">
                  {profileData?.nama_lengkap || "Profil Pegawai"}
                </h2>
                <p className="text-blue-100 text-lg mb-4">
                  {profileData?.email || user?.email}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-blue-100">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Bergabung{" "}
                      {profileData?.joined_date
                        ? new Date(profileData.joined_date).toLocaleDateString(
                            "id-ID",
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      Aktif{" "}
                      {profileData?.last_active
                        ? new Date(profileData.last_active).toLocaleDateString(
                            "id-ID",
                          )
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                {editingProfile ? (
                  <Button
                    variant="secondary"
                    onClick={handleProfileUpdate}
                    disabled={updating}
                    className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
                  >
                    {updating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Simpan
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setEditingProfile(true)}
                    className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profil
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-2 h-auto">
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifikasi</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Keamanan</span>
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Preferensi</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-r from-blue-500 to-indigo-500 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center text-white">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Informasi Profil</h3>
                    <p className="text-blue-100 mt-1">
                      Kelola informasi dasar profil Anda
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8 space-y-8 bg-white">
                {/* Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label
                      htmlFor="email"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      value={
                        editingProfile
                          ? profileForm.email
                          : profileData?.email || ""
                      }
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      disabled={!editingProfile}
                      className="bg-gray-50/80 border-gray-200 rounded-xl h-12 text-gray-600"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="nama_lengkap"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Nama Lengkap
                    </Label>
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
                      className="border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="no_telepon"
                      className="text-sm font-semibold text-gray-700"
                    >
                      No. Telepon
                    </Label>
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
                      className="border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="alamat"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Alamat
                    </Label>
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
                      className="border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="bio"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Bio
                  </Label>
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
                    rows={4}
                    placeholder="Ceritakan sedikit tentang diri Anda..."
                    className="border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                  {editingProfile ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileForm({
                            email: profileData?.email || "",
                            nama_lengkap: profileData?.nama_lengkap || "",
                            no_telepon: profileData?.no_telepon || "",
                            alamat: profileData?.alamat || "",
                            bio: profileData?.bio || "",
                          });
                        }}
                        className="rounded-xl px-6 border-gray-200 hover:bg-gray-50"
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={handleProfileUpdate}
                        disabled={updating}
                        className="rounded-xl px-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300"
                      >
                        {updating ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Simpan
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setEditingProfile(true)}
                      className="rounded-xl px-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profil
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-r from-purple-500 to-pink-500 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center text-white">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      Pengaturan Notifikasi
                    </h3>
                    <p className="text-purple-100 mt-1">
                      Kelola preferensi notifikasi dan pengingat
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8 bg-white">
                <div className="space-y-6">
                  {[
                    {
                      key: "email_notifications" as keyof NotificationSettings,
                      title: "Notifikasi Email",
                      description: "Terima notifikasi melalui email",
                      icon: "📧",
                    },
                    {
                      key: "task_reminders" as keyof NotificationSettings,
                      title: "Pengingat Tugas",
                      description: "Notifikasi untuk deadline tugas",
                      icon: "⏰",
                    },
                    {
                      key: "project_updates" as keyof NotificationSettings,
                      title: "Update Proyek",
                      description: "Notifikasi untuk perubahan proyek",
                      icon: "📋",
                    },
                    {
                      key: "deadline_alerts" as keyof NotificationSettings,
                      title: "Peringatan Deadline",
                      description: "Peringatan untuk deadline yang mendekat",
                      icon: "🚨",
                    },
                    {
                      key: "system_announcements" as keyof NotificationSettings,
                      title: "Pengumuman Sistem",
                      description: "Notifikasi untuk pengumuman penting",
                      icon: "📢",
                    },
                    {
                      key: "mobile_push" as keyof NotificationSettings,
                      title: "Push Notification Mobile",
                      description: "Notifikasi push untuk aplikasi mobile",
                      icon: "📱",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">{item.icon}</div>
                        <div>
                          <Label className="text-base font-semibold text-gray-800">
                            {item.title}
                          </Label>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings[item.key]}
                        onCheckedChange={(checked) =>
                          handleNotificationUpdate(item.key, checked)
                        }
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-pink-500"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-r from-red-500 to-pink-500 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center text-white">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Pengaturan Keamanan</h3>
                    <p className="text-red-100 mt-1">
                      Kelola keamanan akun dan autentikasi
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8 space-y-8 bg-white">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-300">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">🔐</div>
                      <div>
                        <Label className="text-base font-semibold text-gray-800">
                          Autentikasi Dua Faktor
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">
                          Tambahkan lapisan keamanan ekstra
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={securitySettings.two_factor_enabled}
                      onCheckedChange={(checked) =>
                        handleSecurityUpdate("two_factor_enabled", checked)
                      }
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-red-500 data-[state=checked]:to-pink-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-300">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">🔔</div>
                      <div>
                        <Label className="text-base font-semibold text-gray-800">
                          Notifikasi Login
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">
                          Terima notifikasi saat ada login baru
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={securitySettings.login_notifications}
                      onCheckedChange={(checked) =>
                        handleSecurityUpdate("login_notifications", checked)
                      }
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-red-500 data-[state=checked]:to-pink-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-800">
                      Timeout Sesi
                    </Label>
                    <Select
                      value={securitySettings.session_timeout.toString()}
                      onValueChange={(value) =>
                        handleSecurityUpdate("session_timeout", parseInt(value))
                      }
                    >
                      <SelectTrigger className="rounded-xl h-12 border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="30">30 menit</SelectItem>
                        <SelectItem value="60">1 jam</SelectItem>
                        <SelectItem value="120">2 jam</SelectItem>
                        <SelectItem value="240">4 jam</SelectItem>
                        <SelectItem value="480">8 jam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={() => setIsPasswordDialogOpen(true)}
                    className="w-full rounded-xl h-12 border-gray-200 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:border-red-200 transition-all duration-300"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Ubah Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-r from-indigo-500 to-purple-500 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center text-white">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                    <Palette className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Preferensi</h3>
                    <p className="text-indigo-100 mt-1">
                      Sesuaikan tampilan dan pengalaman aplikasi
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Tema
                    </Label>
                    <Select
                      value={preferenceSettings.theme}
                      onValueChange={(value) =>
                        handlePreferenceUpdate(
                          "theme",
                          value as "light" | "dark" | "system",
                        )
                      }
                    >
                      <SelectTrigger className="rounded-xl h-12 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="light">
                          <div className="flex items-center">
                            <Sun className="w-4 h-4 mr-2" />
                            Terang
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center">
                            <Moon className="w-4 h-4 mr-2" />
                            Gelap
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center">
                            <Monitor className="w-4 h-4 mr-2" />
                            Sistem
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Bahasa
                    </Label>
                    <Select
                      value={preferenceSettings.language}
                      onValueChange={(value) =>
                        handlePreferenceUpdate("language", value)
                      }
                    >
                      <SelectTrigger className="rounded-xl h-12 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="id">🇮🇩 Bahasa Indonesia</SelectItem>
                        <SelectItem value="en">🇺🇸 English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Zona Waktu
                    </Label>
                    <Select
                      value={preferenceSettings.timezone}
                      onValueChange={(value) =>
                        handlePreferenceUpdate("timezone", value)
                      }
                    >
                      <SelectTrigger className="rounded-xl h-12 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Asia/Jakarta">
                          🕐 WIB (Jakarta)
                        </SelectItem>
                        <SelectItem value="Asia/Makassar">
                          🕐 WITA (Makassar)
                        </SelectItem>
                        <SelectItem value="Asia/Jayapura">
                          🕐 WIT (Jayapura)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Format Tanggal
                    </Label>
                    <Select
                      value={preferenceSettings.date_format}
                      onValueChange={(value) =>
                        handlePreferenceUpdate("date_format", value)
                      }
                    >
                      <SelectTrigger className="rounded-xl h-12 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Format Waktu
                    </Label>
                    <Select
                      value={preferenceSettings.time_format}
                      onValueChange={(value) =>
                        handlePreferenceUpdate(
                          "time_format",
                          value as "12h" | "24h",
                        )
                      }
                    >
                      <SelectTrigger className="rounded-xl h-12 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="12h">🕐 12 Jam (AM/PM)</SelectItem>
                        <SelectItem value="24h">🕐 24 Jam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Password Change Dialog */}
        <Dialog
          open={isPasswordDialogOpen}
          onOpenChange={setIsPasswordDialogOpen}
        >
          <DialogContent className="rounded-3xl border-0 shadow-2xl max-w-md">
            <DialogHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold">
                Ubah Password
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Masukkan password lama dan password baru Anda
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-3">
                <Label
                  htmlFor="current_password"
                  className="text-sm font-semibold text-gray-700"
                >
                  Password Lama
                </Label>
                <div className="relative">
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
                    className="rounded-xl h-12 pr-12 border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
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
              <div className="space-y-3">
                <Label
                  htmlFor="new_password"
                  className="text-sm font-semibold text-gray-700"
                >
                  Password Baru
                </Label>
                <div className="relative">
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
                    className="rounded-xl h-12 pr-12 border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
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
              <div className="space-y-3">
                <Label
                  htmlFor="confirm_password"
                  className="text-sm font-semibold text-gray-700"
                >
                  Konfirmasi Password Baru
                </Label>
                <div className="relative">
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
                    className="rounded-xl h-12 pr-12 border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        confirm: !prev.confirm,
                      }))
                    }
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-6 space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
                className="rounded-xl px-6 border-gray-200 hover:bg-gray-50"
              >
                Batal
              </Button>
              <Button
                onClick={handlePasswordChange}
                disabled={updating}
                className="rounded-xl px-6 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 transition-all duration-300"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Ubah Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

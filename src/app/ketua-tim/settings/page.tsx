"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Users,
  Crown,
  Target,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

interface ProfileData {
  id: string;
  email: string;
  nama_lengkap: string;
  no_telepon?: string;
  alamat?: string;
  nip?: string;
  avatar_url?: string;
  bio?: string;
  joined_date: string;
  last_active: string;
  position?: string;
  department?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  task_reminders: boolean;
  project_updates: boolean;
  deadline_alerts: boolean;
  system_announcements: boolean;
  mobile_push: boolean;
  team_notifications: boolean;
  performance_reports: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_notifications: boolean;
  session_timeout: number;
  password_last_changed: string;
}

interface TeamSettings {
  auto_assign_tasks: boolean;
  require_approval: boolean;
  weekly_reports: boolean;
  track_activity: boolean;
  allow_overtime: boolean;
  performance_tracking: boolean;
}

interface PreferenceSettings {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  date_format: string;
  time_format: "12h" | "24h";
}

export default function KetuaTimSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Data
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: "",
    nama_lengkap: "",
    no_telepon: "",
    alamat: "",
    nip: "",
    bio: "",
    position: "",
    department: "",
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      email_notifications: true,
      task_reminders: true,
      project_updates: true,
      deadline_alerts: true,
      system_announcements: true,
      mobile_push: false,
      team_notifications: true,
      performance_reports: true,
    });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_notifications: true,
    session_timeout: 30,
    password_last_changed: "",
  });

  // Team Settings
  const [teamSettings, setTeamSettings] = useState<TeamSettings>({
    auto_assign_tasks: false,
    require_approval: true,
    weekly_reports: true,
    track_activity: true,
    allow_overtime: false,
    performance_tracking: true,
  });

  // Preference Settings
  const [preferenceSettings, setPreferenceSettings] =
    useState<PreferenceSettings>({
      theme: "system",
      language: "id",
      timezone: "Asia/Jakarta",
      date_format: "DD/MM/YYYY",
      time_format: "24h",
    });

  // Password Change
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
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

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ketua-tim/settings");
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 401) {
          setErrorMsg("Anda belum login. Silakan login terlebih dahulu.");
          return;
        }
        if (response.status === 403) {
          setErrorMsg(
            "Akses ditolak. Pastikan Anda login sebagai Ketua Tim untuk membuka halaman ini.",
          );
          return;
        }
        throw new Error(err?.error || "Failed to fetch settings");
      }
      const data = await response.json();

      const profile = data?.profile;
      if (profile) {
        setProfileData(profile);
        setProfileForm({
          email: profile.email || "",
          nama_lengkap: profile.nama_lengkap || "",
          no_telepon: profile.no_telepon || "",
          alamat: profile.alamat || "",
          nip: profile.nip || "",
          bio: profile.bio || "",
          position: (profile as any).position || "",
          department: (profile as any).department || "",
        });
      }

      if (data?.notifications) {
        setNotificationSettings((prev) => ({ ...prev, ...data.notifications }));
      }
      if (data?.preferences) {
        setPreferenceSettings((prev) => ({ ...prev, ...data.preferences }));
      }
      if (data?.team_management) {
        setTeamSettings((prev) => ({ ...prev, ...data.team_management }));
      }
      if (data?.security) {
        setSecuritySettings((prev) => ({ ...prev, ...data.security }));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      if (!errorMsg) {
        toast.error("Gagal memuat data pengguna");
      }
    } finally {
      setLoading(false);
    }
  }, [errorMsg]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      // Simulate upload
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Avatar berhasil diperbarui");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Gagal mengupload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setUpdating(true);
      const response = await fetch("/api/ketua-tim/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "profile", data: profileForm }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to update profile");
      }
      const result = await response.json();
      setProfileData(
        () =>
          ({
            ...(result?.profile || {}),
            // reflect metadata fields too
            bio: profileForm.bio,
            position: profileForm.position,
            department: profileForm.department,
            email: profileForm.email || result?.profile?.email || "",
            nama_lengkap: profileForm.nama_lengkap,
            no_telepon: profileForm.no_telepon,
            alamat: profileForm.alamat,
            nip: profileForm.nip,
          }) as any,
      );
      setEditingProfile(false);
      toast.success("Profil berhasil diperbarui");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profil");
    } finally {
      setUpdating(false);
    }
  };

  const handleNotificationUpdate = async (
    key: keyof NotificationSettings,
    value: boolean,
  ) => {
    try {
      const updated = { ...notificationSettings, [key]: value };
      setNotificationSettings(updated);
      const response = await fetch("/api/ketua-tim/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "notifications", data: updated }),
      });
      if (!response.ok) throw new Error("Failed to update notifications");
      toast.success("Pengaturan notifikasi diperbarui");
    } catch (error) {
      console.error("Error updating notification settings:", error);
      toast.error("Gagal memperbarui pengaturan notifikasi");
      setNotificationSettings((prev) => ({ ...prev, [key]: !value }));
    }
  };

  const handleSecurityUpdate = async (
    key: keyof SecuritySettings,
    value: boolean | number,
  ) => {
    try {
      setSecuritySettings((prev) => ({ ...prev, [key]: value }));
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Pengaturan keamanan diperbarui");
    } catch (error) {
      console.error("Error updating security settings:", error);
      toast.error("Gagal memperbarui pengaturan keamanan");
    }
  };

  const handleTeamUpdate = async (key: keyof TeamSettings, value: boolean) => {
    try {
      const updated = { ...teamSettings, [key]: value };
      setTeamSettings(updated);
      const response = await fetch("/api/ketua-tim/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "team_management", data: updated }),
      });
      if (!response.ok) throw new Error("Failed to update team settings");
      toast.success("Pengaturan tim diperbarui");
    } catch (error) {
      console.error("Error updating team settings:", error);
      toast.error("Gagal memperbarui pengaturan tim");
      setTeamSettings((prev) => ({ ...prev, [key]: !value }));
    }
  };

  const handlePreferenceUpdate = async (
    key: keyof PreferenceSettings,
    value: string,
  ) => {
    try {
      const updated = {
        ...preferenceSettings,
        [key]: value,
      } as PreferenceSettings;
      setPreferenceSettings(updated);
      const response = await fetch("/api/ketua-tim/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "preferences", data: updated }),
      });
      if (!response.ok) throw new Error("Failed to update preferences");
      toast.success("Preferensi diperbarui");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Gagal memperbarui preferensi");
      // No revert since it's select; optional to revert here
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Password baru tidak cocok");
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch("/api/ketua-tim/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "password", data: passwordForm }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to update password");
      }

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setShowPasswordDialog(false);
      toast.success("Password berhasil diubah");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Gagal mengubah password");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white shadow-xl rounded-2xl p-8 max-w-lg text-center">
          <Shield className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Tidak Memiliki Akses
          </h2>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <div className="flex justify-center gap-3">
            <a href="/auth/login">
              <Button>Login</Button>
            </a>
            <a href="/pegawai/settings">
              <Button variant="outline">Ke Halaman Pegawai</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Enhanced Profile Overview Card for Team Leader */}
        <Card className="mb-8 border-0 shadow-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl overflow-hidden">
          <div className="relative p-8">
            {/* Background decorations */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="absolute top-8 right-8 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-100"></div>
              <div className="absolute bottom-6 left-12 w-2 h-2 bg-white rounded-full animate-pulse delay-200"></div>
              <div className="absolute bottom-4 right-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-300"></div>
              <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse delay-500"></div>
              <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-700"></div>
            </div>

            <div className="relative flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-white/30 shadow-2xl ring-4 ring-white/20">
                  <AvatarImage src={profileData?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-3xl font-bold">
                    <Crown className="w-12 h-12" />
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
                <div className="flex items-center justify-center md:justify-start mb-2">
                  <Crown className="w-6 h-6 mr-2 text-yellow-300" />
                  <span className="text-yellow-300 font-semibold text-sm uppercase tracking-wide">
                    Team Leader
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-2">
                  {profileData?.nama_lengkap || "Ketua Tim"}
                </h2>
                <p className="text-emerald-100 text-lg mb-1">
                  {profileData?.email || user?.email}
                </p>
                <p className="text-emerald-200 text-base mb-4">
                  {profileData?.position} • {profileData?.department}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-emerald-100">
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

        {/* Enhanced Tabs for Team Leader */}
        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-2 h-auto">
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-300"
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
              value="team"
              className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Tim</span>
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
            <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center text-white">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Informasi Profil</h3>
                    <p className="text-emerald-100 mt-1">
                      Kelola informasi dasar profil Ketua Tim
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
                      className="border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="position"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Posisi
                    </Label>
                    <Input
                      id="position"
                      value={profileForm.position}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          position: e.target.value,
                        }))
                      }
                      disabled={!editingProfile}
                      className="border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="department"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Departemen
                    </Label>
                    <Input
                      id="department"
                      value={profileForm.department}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          department: e.target.value,
                        }))
                      }
                      disabled={!editingProfile}
                      className="border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
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
                      className="border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
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
                      className="border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="nip"
                      className="text-sm font-semibold text-gray-700"
                    >
                      NIP (Nomor Induk Pegawai)
                    </Label>
                    <Input
                      id="nip"
                      value={profileForm.nip}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          nip: e.target.value,
                        }))
                      }
                      disabled={!editingProfile}
                      placeholder="Masukkan NIP (opsional)"
                      className="border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
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
                    placeholder="Ceritakan sedikit tentang pengalaman kepemimpinan Anda..."
                    className="border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 resize-none"
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
                            nip: profileData?.nip || "",
                            bio: profileData?.bio || "",
                            position: profileData?.position || "",
                            department: profileData?.department || "",
                          });
                        }}
                        className="rounded-xl px-6 border-gray-200 hover:bg-gray-50"
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={handleProfileUpdate}
                        disabled={updating}
                        className="rounded-xl px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all duration-300"
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
                      className="rounded-xl px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all duration-300"
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
                      Kelola preferensi notifikasi dan pengingat tim
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
                      description: "Notifikasi untuk deadline tugas tim",
                      icon: "⏰",
                    },
                    {
                      key: "project_updates" as keyof NotificationSettings,
                      title: "Update Proyek",
                      description: "Pemberitahuan perubahan status proyek",
                      icon: "📊",
                    },
                    {
                      key: "deadline_alerts" as keyof NotificationSettings,
                      title: "Peringatan Deadline",
                      description: "Alert untuk deadline yang mendekat",
                      icon: "⚠️",
                    },
                    {
                      key: "team_notifications" as keyof NotificationSettings,
                      title: "Notifikasi Tim",
                      description: "Update aktivitas anggota tim",
                      icon: "👥",
                    },
                    {
                      key: "performance_reports" as keyof NotificationSettings,
                      title: "Laporan Performa",
                      description: "Laporan performa tim mingguan",
                      icon: "📈",
                    },
                    {
                      key: "system_announcements" as keyof NotificationSettings,
                      title: "Pengumuman Sistem",
                      description: "Pemberitahuan sistem dan maintenance",
                      icon: "📢",
                    },
                    {
                      key: "mobile_push" as keyof NotificationSettings,
                      title: "Push Notification",
                      description: "Notifikasi push di perangkat mobile",
                      icon: "📱",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl flex items-center justify-center text-lg">
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings[item.key] as boolean}
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
                    <h3 className="text-2xl font-bold">Keamanan Akun</h3>
                    <p className="text-red-100 mt-1">
                      Kelola pengaturan keamanan akun Ketua Tim
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8 bg-white">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-pink-100 rounded-xl flex items-center justify-center">
                        <Key className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Autentikasi Dua Faktor
                        </h4>
                        <p className="text-sm text-gray-600">
                          Tambahan keamanan untuk akun Anda
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

                  <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-pink-100 rounded-xl flex items-center justify-center">
                        <Bell className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Notifikasi Login
                        </h4>
                        <p className="text-sm text-gray-600">
                          Dapatkan notifikasi saat ada login baru
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

                  <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-pink-100 rounded-xl flex items-center justify-center">
                        <Clock className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Timeout Sesi
                        </h4>
                        <p className="text-sm text-gray-600">
                          Waktu otomatis logout (menit)
                        </p>
                      </div>
                    </div>
                    <Select
                      value={securitySettings.session_timeout.toString()}
                      onValueChange={(value) =>
                        handleSecurityUpdate("session_timeout", parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-full rounded-xl border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 menit</SelectItem>
                        <SelectItem value="30">30 menit</SelectItem>
                        <SelectItem value="60">1 jam</SelectItem>
                        <SelectItem value="120">2 jam</SelectItem>
                        <SelectItem value="480">8 jam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Ubah Password
                        </h4>
                        <p className="text-sm text-gray-600">
                          Terakhir diubah:{" "}
                          {securitySettings.password_last_changed ||
                            "Belum pernah"}
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowPasswordDialog(true)}
                        className="rounded-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Ubah Password
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Management Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-r from-orange-500 to-red-500 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center text-white">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Manajemen Tim</h3>
                    <p className="text-orange-100 mt-1">
                      Kelola pengaturan dan kebijakan tim
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8 bg-white">
                <div className="space-y-6">
                  {[
                    {
                      key: "auto_assign_tasks" as keyof TeamSettings,
                      title: "Auto-assign Tugas",
                      description: "Otomatis assign tugas ke anggota tim",
                      icon: <Target className="w-6 h-6 text-orange-600" />,
                    },
                    {
                      key: "require_approval" as keyof TeamSettings,
                      title: "Persetujuan Diperlukan",
                      description:
                        "Memerlukan persetujuan untuk perubahan penting",
                      icon: <Shield className="w-6 h-6 text-orange-600" />,
                    },
                    {
                      key: "weekly_reports" as keyof TeamSettings,
                      title: "Laporan Mingguan",
                      description: "Kirim laporan performa tim mingguan",
                      icon: <BarChart3 className="w-6 h-6 text-orange-600" />,
                    },
                    {
                      key: "track_activity" as keyof TeamSettings,
                      title: "Lacak Aktivitas",
                      description: "Monitor aktivitas anggota tim",
                      icon: <Monitor className="w-6 h-6 text-orange-600" />,
                    },
                    {
                      key: "allow_overtime" as keyof TeamSettings,
                      title: "Izinkan Lembur",
                      description: "Anggota tim dapat bekerja lembur",
                      icon: <Clock className="w-6 h-6 text-orange-600" />,
                    },
                    {
                      key: "performance_tracking" as keyof TeamSettings,
                      title: "Pelacakan Performa",
                      description: "Aktifkan sistem pelacakan performa",
                      icon: <BarChart3 className="w-6 h-6 text-orange-600" />,
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-100 to-red-100 rounded-xl flex items-center justify-center">
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={teamSettings[item.key]}
                        onCheckedChange={(checked) =>
                          handleTeamUpdate(item.key, checked)
                        }
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-red-500"
                      />
                    </div>
                  ))}
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
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Preferensi</h3>
                    <p className="text-indigo-100 mt-1">
                      Sesuaikan pengalaman aplikasi Anda
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8 bg-white">
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                        <Palette className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Tema</h4>
                        <p className="text-sm text-gray-600">
                          Pilih tema tampilan aplikasi
                        </p>
                      </div>
                    </div>
                    <Select
                      value={preferenceSettings.theme}
                      onValueChange={(value) =>
                        handlePreferenceUpdate("theme", value)
                      }
                    >
                      <SelectTrigger className="w-full rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center space-x-2">
                            <Sun className="w-4 h-4" />
                            <span>Terang</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center space-x-2">
                            <Moon className="w-4 h-4" />
                            <span>Gelap</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center space-x-2">
                            <Monitor className="w-4 h-4" />
                            <span>Sistem</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                        <Globe className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Bahasa</h4>
                        <p className="text-sm text-gray-600">
                          Pilih bahasa interface
                        </p>
                      </div>
                    </div>
                    <Select
                      value={preferenceSettings.language}
                      onValueChange={(value) =>
                        handlePreferenceUpdate("language", value)
                      }
                    >
                      <SelectTrigger className="w-full rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Password Change Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Ubah Password
              </DialogTitle>
              <DialogDescription>
                Masukkan password lama dan password baru untuk mengubah password
                Anda.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Password Lama</Label>
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
                    className="rounded-xl pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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

              <div className="space-y-2">
                <Label htmlFor="new_password">Password Baru</Label>
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
                    className="rounded-xl pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        new: !prev.new,
                      }))
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

              <div className="space-y-2">
                <Label htmlFor="confirm_password">
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
                    className="rounded-xl pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                onClick={handlePasswordChange}
                disabled={updating}
                className="rounded-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Key className="w-4 h-4 mr-2" />
                )}
                Ubah Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

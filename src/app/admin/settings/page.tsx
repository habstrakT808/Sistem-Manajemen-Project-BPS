"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
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
  User,
  Camera,
  Shield,
  Bell,
  Settings,
  Edit,
  Save,
  Loader2,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  Mail,
  Calendar,
  Database,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { adminAPI } from "@/lib/api/admin";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  nama_lengkap: string;
  email: string;
  no_telepon?: string;
  alamat?: string;
  bio?: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  last_login?: string;
  joined_date?: string;
  last_active?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  task_reminders: boolean;
  project_updates: boolean;
  deadline_alerts: boolean;
  system_announcements: boolean;
  mobile_push: boolean;
  user_management_alerts: boolean;
  system_maintenance_alerts: boolean;
  security_alerts: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_notifications: boolean;
  session_timeout: number;
  password_last_changed: string;
}

interface PreferenceSettings {
  theme: "light" | "dark" | "system";
  language: "id" | "en";
  timezone: string;
  date_format: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  time_format: "12h" | "24h";
  currency_format: "IDR" | "USD";
}

interface AdminSettings {
  auto_backup_enabled: boolean;
  system_monitoring: boolean;
  user_activity_tracking: boolean;
  advanced_analytics: boolean;
}

export default function AdminSettingsPage() {
  const { user } = useAuthContext();
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
      user_management_alerts: true,
      system_maintenance_alerts: true,
      security_alerts: true,
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
      currency_format: "IDR",
    });

  // Admin Settings
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    auto_backup_enabled: true,
    system_monitoring: true,
    user_activity_tracking: true,
    advanced_analytics: false,
  });

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);
        const data = await adminAPI.getSettings();

        // Add null checking for data and data.profile
        if (data && data.profile) {
          setProfileData(data.profile);
          setProfileForm({
            nama_lengkap: data.profile.nama_lengkap || "",
            no_telepon: data.profile.no_telepon || "",
            alamat: data.profile.alamat || "",
            bio: data.profile.bio || "",
          });
        } else {
          toast.error("Data profil tidak ditemukan");
          return;
        }

        // Add null checking for other data properties
        if (data.notifications) {
          setNotificationSettings(data.notifications);
        }
        if (data.security) {
          setSecuritySettings(data.security);
        }
        if (data.preferences) {
          setPreferenceSettings(data.preferences);
        }
        if (data.admin_settings) {
          setAdminSettings(data.admin_settings);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error("Gagal memuat data profil");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadProfileData();
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    try {
      setUpdating(true);
      await adminAPI.updateProfile(profileForm);

      // Refresh profile data
      const updatedData = await adminAPI.getSettings();
      if (updatedData && updatedData.profile) {
        setProfileData(updatedData.profile);
      } else {
        toast.error("Gagal memuat data profil yang diperbarui");
      }

      setEditingProfile(false);
      toast.success("Profil berhasil diperbarui");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profil");
    } finally {
      setUpdating(false);
    }
  };

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
      await adminAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setIsPasswordDialogOpen(false);
      toast.success("Password berhasil diubah");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengubah password",
      );
    } finally {
      setUpdating(false);
    }
  };

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
      const avatarUrl = await adminAPI.uploadAvatar(file);

      if (profileData) {
        setProfileData({
          ...profileData,
          avatar_url: avatarUrl,
        });
      }

      toast.success("Avatar berhasil diperbarui");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Gagal mengupload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleNotificationUpdate = async (
    key: keyof NotificationSettings,
    value: boolean,
  ) => {
    try {
      const updatedSettings = { ...notificationSettings, [key]: value };
      setNotificationSettings(updatedSettings);

      await adminAPI.updateNotifications(updatedSettings);
      toast.success("Pengaturan notifikasi diperbarui");
    } catch (error) {
      console.error("Error updating notifications:", error);
      toast.error("Gagal memperbarui pengaturan notifikasi");
      // Revert on error
      setNotificationSettings((prev) => ({ ...prev, [key]: !value }));
    }
  };

  const handleSecurityUpdate = async (
    key: keyof SecuritySettings,
    value: boolean | number,
  ) => {
    try {
      const updatedSettings = { ...securitySettings, [key]: value };
      setSecuritySettings(updatedSettings);

      await adminAPI.updateSecurity(updatedSettings);
      toast.success("Pengaturan keamanan diperbarui");
    } catch (error) {
      console.error("Error updating security:", error);
      toast.error("Gagal memperbarui pengaturan keamanan");
      // Revert on error
      setSecuritySettings((prev) => ({ ...prev, [key]: prev[key] }));
    }
  };

  const handlePreferenceUpdate = async (
    key: keyof PreferenceSettings,
    value: string,
  ) => {
    try {
      const updatedSettings = { ...preferenceSettings, [key]: value };
      setPreferenceSettings(updatedSettings);

      await adminAPI.updatePreferences(updatedSettings);
      toast.success("Preferensi diperbarui");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Gagal memperbarui preferensi");
      // Revert on error
      setPreferenceSettings((prev) => ({ ...prev, [key]: prev[key] }));
    }
  };

  const handleAdminSettingsUpdate = async (
    key: keyof AdminSettings,
    value: boolean,
  ) => {
    try {
      const updatedSettings = { ...adminSettings, [key]: value };
      setAdminSettings(updatedSettings);

      await adminAPI.updateAdminSettings(updatedSettings);
      toast.success("Pengaturan admin diperbarui");
    } catch (error) {
      console.error("Error updating admin settings:", error);
      toast.error("Gagal memperbarui pengaturan admin");
      // Revert on error
      setAdminSettings((prev) => ({ ...prev, [key]: !value }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Pengaturan Profil
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Kelola profil dan preferensi akun Anda
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-red-100 text-red-800 px-4 py-2"
        >
          <Shield className="w-4 h-4 mr-2" />
          Admin
        </Badge>
      </div>

      {/* Profile Overview Card */}
      <Card className="border-0 shadow-xl bg-white">
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                <AvatarImage src={profileData?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xl font-bold">
                  {profileData?.nama_lengkap?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Camera className="w-4 h-4 text-gray-600" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {profileData?.nama_lengkap}
              </h2>
              <p className="text-gray-600 flex items-center mt-1">
                <Mail className="w-4 h-4 mr-2" />
                {profileData?.email}
              </p>
              <div className="flex items-center space-x-4 mt-3">
                <Badge className="bg-red-100 text-red-800">
                  <Shield className="w-3 h-3 mr-1" />
                  {profileData?.role}
                </Badge>
                <span className="text-sm text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Bergabung{" "}
                  {new Date(profileData?.created_at || "").toLocaleDateString(
                    "id-ID",
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Profil</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center space-x-2"
          >
            <Bell className="w-4 h-4" />
            <span>Notifikasi</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Keamanan</span>
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Preferensi</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>Admin</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          {/* Page Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-8 px-8 mb-6 mt-6">
            <h1 className="flex items-center text-2xl font-bold">
              <User className="w-8 h-8 mr-3" />
              Informasi Profil
            </h1>
            <p className="text-blue-100 mt-2 text-lg">
              Kelola informasi dasar profil administrator
            </p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
                  <Input
                    id="nama_lengkap"
                    value={
                      editingProfile
                        ? profileForm.nama_lengkap
                        : profileData?.nama_lengkap || ""
                    }
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        nama_lengkap: e.target.value,
                      }))
                    }
                    disabled={!editingProfile}
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profileData?.email || ""}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="no_telepon">Nomor Telepon</Label>
                  <Input
                    id="no_telepon"
                    value={
                      editingProfile
                        ? profileForm.no_telepon
                        : profileData?.no_telepon || ""
                    }
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        no_telepon: e.target.value,
                      }))
                    }
                    disabled={!editingProfile}
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alamat">Alamat</Label>
                  <Input
                    id="alamat"
                    value={
                      editingProfile
                        ? profileForm.alamat
                        : profileData?.alamat || ""
                    }
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        alamat: e.target.value,
                      }))
                    }
                    disabled={!editingProfile}
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={
                    editingProfile ? profileForm.bio : profileData?.bio || ""
                  }
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  disabled={!editingProfile}
                  className="bg-gray-50 min-h-[100px]"
                  placeholder="Ceritakan tentang diri Anda..."
                />
              </div>
              <div className="flex justify-between items-center pt-4">
                <Dialog
                  open={isPasswordDialogOpen}
                  onOpenChange={setIsPasswordDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Ubah Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-80 h-auto max-w-none mx-auto">
                    <DialogHeader>
                      <DialogTitle>Ubah Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current_password">
                          Password Saat Ini
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
                      <Button
                        onClick={handlePasswordChange}
                        disabled={updating}
                        className="w-full"
                      >
                        {updating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="w-4 h-4 mr-2" />
                        )}
                        {updating ? "Mengubah..." : "Ubah Password"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="space-x-2">
                  {editingProfile ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileForm({
                            nama_lengkap: profileData?.nama_lengkap || "",
                            no_telepon: profileData?.no_telepon || "",
                            alamat: profileData?.alamat || "",
                            bio: profileData?.bio || "",
                          });
                        }}
                      >
                        Batal
                      </Button>
                      <Button onClick={handleProfileUpdate} disabled={updating}>
                        {updating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {updating ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditingProfile(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profil
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          {/* Page Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl py-8 px-8 mb-6 mt-6">
            <h1 className="flex items-center text-2xl font-bold">
              <Bell className="w-8 h-8 mr-3" />
              Pengaturan Notifikasi
            </h1>
            <p className="text-purple-100 mt-2 text-lg">
              Kelola preferensi notifikasi dan pengingat sistem
            </p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    Notifikasi Umum
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Terima notifikasi melalui email
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.email_notifications}
                        onCheckedChange={(checked) =>
                          handleNotificationUpdate(
                            "email_notifications",
                            checked,
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Pengingat Tugas</Label>
                        <p className="text-sm text-gray-500">
                          Notifikasi deadline tugas
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.task_reminders}
                        onCheckedChange={(checked) =>
                          handleNotificationUpdate("task_reminders", checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Update Proyek</Label>
                        <p className="text-sm text-gray-500">
                          Notifikasi perubahan status proyek
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.project_updates}
                        onCheckedChange={(checked) =>
                          handleNotificationUpdate("project_updates", checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Peringatan Deadline</Label>
                        <p className="text-sm text-gray-500">
                          Alert mendekati deadline
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.deadline_alerts}
                        onCheckedChange={(checked) =>
                          handleNotificationUpdate("deadline_alerts", checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    Notifikasi Admin
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Manajemen User</Label>
                        <p className="text-sm text-gray-500">
                          Notifikasi aktivitas user
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.user_management_alerts}
                        onCheckedChange={(checked) =>
                          handleNotificationUpdate(
                            "user_management_alerts",
                            checked,
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Maintenance Sistem</Label>
                        <p className="text-sm text-gray-500">
                          Alert maintenance dan update
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.system_maintenance_alerts}
                        onCheckedChange={(checked) =>
                          handleNotificationUpdate(
                            "system_maintenance_alerts",
                            checked,
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Alert Keamanan</Label>
                        <p className="text-sm text-gray-500">
                          Notifikasi masalah keamanan
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.security_alerts}
                        onCheckedChange={(checked) =>
                          handleNotificationUpdate("security_alerts", checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Push Mobile</Label>
                        <p className="text-sm text-gray-500">
                          Notifikasi push ke mobile
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.mobile_push}
                        onCheckedChange={(checked) =>
                          handleNotificationUpdate("mobile_push", checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          {/* Page Header */}
          <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl py-8 px-8 mb-6 mt-6">
            <h1 className="flex items-center text-2xl font-bold">
              <Shield className="w-8 h-8 mr-3" />
              Pengaturan Keamanan
            </h1>
            <p className="text-red-100 mt-2 text-lg">
              Kelola keamanan akun dan autentikasi sistem
            </p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-500">
                        Keamanan tambahan dengan 2FA
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.two_factor_enabled}
                      onCheckedChange={(checked) =>
                        handleSecurityUpdate("two_factor_enabled", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Notifikasi Login</Label>
                      <p className="text-sm text-gray-500">
                        Alert saat ada login baru
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.login_notifications}
                      onCheckedChange={(checked) =>
                        handleSecurityUpdate("login_notifications", checked)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Session Timeout (menit)</Label>
                    <Input
                      type="number"
                      value={securitySettings.session_timeout}
                      onChange={(e) =>
                        handleSecurityUpdate(
                          "session_timeout",
                          parseInt(e.target.value),
                        )
                      }
                      min="30"
                      max="1440"
                    />
                    <p className="text-sm text-gray-500">
                      Otomatis logout setelah tidak aktif
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    Status Keamanan: Aman
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Akun Anda memiliki tingkat keamanan yang baik
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          {/* Page Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl py-8 px-8 mb-6 mt-6">
            <h1 className="flex items-center text-2xl font-bold">
              <Settings className="w-8 h-8 mr-3" />
              Preferensi
            </h1>
            <p className="text-indigo-100 mt-2 text-lg">
              Sesuaikan pengaturan tampilan dan pengalaman pengguna
            </p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <Select
                      value={preferenceSettings.theme}
                      onValueChange={(value) =>
                        handlePreferenceUpdate("theme", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Terang</SelectItem>
                        <SelectItem value="dark">Gelap</SelectItem>
                        <SelectItem value="system">Sistem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bahasa</Label>
                    <Select
                      value={preferenceSettings.language}
                      onValueChange={(value) =>
                        handlePreferenceUpdate("language", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Zona Waktu</Label>
                    <Select
                      value={preferenceSettings.timezone}
                      onValueChange={(value) =>
                        handlePreferenceUpdate("timezone", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Jakarta">
                          WIB (Jakarta)
                        </SelectItem>
                        <SelectItem value="Asia/Makassar">
                          WITA (Makassar)
                        </SelectItem>
                        <SelectItem value="Asia/Jayapura">
                          WIT (Jayapura)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Format Tanggal</Label>
                    <Select
                      value={preferenceSettings.date_format}
                      onValueChange={(value) =>
                        handlePreferenceUpdate("date_format", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Format Waktu</Label>
                    <Select
                      value={preferenceSettings.time_format}
                      onValueChange={(value) =>
                        handlePreferenceUpdate("time_format", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 Jam</SelectItem>
                        <SelectItem value="12h">12 Jam (AM/PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Settings Tab */}
        <TabsContent value="admin">
          {/* Page Header */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl py-8 px-8 mb-6 mt-6">
            <h1 className="flex items-center text-2xl font-bold">
              <Database className="w-8 h-8 mr-3" />
              Pengaturan Admin
            </h1>
            <p className="text-orange-100 mt-2 text-lg">
              Kelola pengaturan sistem dan konfigurasi administrator
            </p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Auto Backup</Label>
                      <p className="text-sm text-gray-500">
                        Backup otomatis data sistem
                      </p>
                    </div>
                    <Switch
                      checked={adminSettings.auto_backup_enabled}
                      onCheckedChange={(checked) =>
                        handleAdminSettingsUpdate(
                          "auto_backup_enabled",
                          checked,
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>System Monitoring</Label>
                      <p className="text-sm text-gray-500">
                        Monitor performa sistem
                      </p>
                    </div>
                    <Switch
                      checked={adminSettings.system_monitoring}
                      onCheckedChange={(checked) =>
                        handleAdminSettingsUpdate("system_monitoring", checked)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>User Activity Tracking</Label>
                      <p className="text-sm text-gray-500">
                        Lacak aktivitas pengguna
                      </p>
                    </div>
                    <Switch
                      checked={adminSettings.user_activity_tracking}
                      onCheckedChange={(checked) =>
                        handleAdminSettingsUpdate(
                          "user_activity_tracking",
                          checked,
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Advanced Analytics</Label>
                      <p className="text-sm text-gray-500">
                        Analitik mendalam sistem
                      </p>
                    </div>
                    <Switch
                      checked={adminSettings.advanced_analytics}
                      onCheckedChange={(checked) =>
                        handleAdminSettingsUpdate("advanced_analytics", checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Status Sistem: Optimal
                  </span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Semua layanan berjalan dengan baik
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

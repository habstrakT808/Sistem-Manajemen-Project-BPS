// File: src/app/pegawai/profile/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
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

export default function ProfilePage() {
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
        throw new Error(result.error || "Failed to fetch profile");
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
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Handle avatar upload
  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
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
        throw new Error(result.error || "Failed to upload avatar");
      }

      setProfileData((prev) =>
        prev ? { ...prev, avatar_url: result.avatar_url } : null
      );
      toast.success("Avatar updated successfully!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
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
        throw new Error(result.error || "Failed to update profile");
      }

      setProfileData((prev) => (prev ? { ...prev, ...profileForm } : null));
      setEditingProfile(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error("Password must be at least 8 characters");
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
        throw new Error(result.error || "Failed to change password");
      }

      setIsPasswordDialogOpen(false);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      toast.success("Password changed successfully!");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
    } finally {
      setUpdating(false);
    }
  };

  // Handle notification settings update
  const handleNotificationUpdate = async (
    key: keyof NotificationSettings,
    value: boolean
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
        throw new Error(result.error || "Failed to update notifications");
      }

      toast.success("Notification settings updated!");
    } catch (error) {
      console.error("Error updating notifications:", error);
      toast.error("Failed to update notification settings");
      // Revert on error
      setNotificationSettings((prev) => ({ ...prev, [key]: !value }));
    }
  };

  // Handle skill addition
  const handleAddSkill = async () => {
    if (!newSkill.name.trim()) {
      toast.error("Please enter a skill name");
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
        throw new Error(result.error || "Failed to add skill");
      }

      setSkills((prev) => [...prev, result.skill]);
      setNewSkill({ name: "", level: 1, category: "technical" });
      toast.success("Skill added successfully!");
    } catch (error) {
      console.error("Error adding skill:", error);
      toast.error("Failed to add skill");
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
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to remove skill");
      }

      setSkills((prev) => prev.filter((skill) => skill.name !== skillName));
      toast.success("Skill removed successfully!");
    } catch (error) {
      console.error("Error removing skill:", error);
      toast.error("Failed to remove skill");
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
              My Profile
            </h1>
            <p className="text-gray-600 text-lg mt-2">
              Manage your personal information and account settings
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-green-500 to-teal-600 text-white border-0">
              <Leaf className="w-3 h-3 mr-1" />
              Pegawai Account
            </Badge>
            <Badge className="bg-white text-green-600 border border-green-200">
              <Calendar className="w-3 h-3 mr-1" />
              Joined{" "}
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
                <span className="text-sm">Verified Account</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3 text-gray-600">
              <Phone className="w-4 h-4" />
              <span className="text-sm">
                {profileData.no_telepon || "Not provided"}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                {profileData.alamat || "Not provided"}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                Last active:{" "}
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
                <span>Personal</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="flex-1 gap-1.5 border border-transparent text-sm font-medium whitespace-nowrap focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
              >
                <Shield className="w-4 h-4" />
                <span>Security</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex-1 gap-1.5 border border-transparent text-sm font-medium whitespace-nowrap focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
              >
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger
                value="skills"
                className="flex-1 gap-1.5 border border-transparent text-sm font-medium whitespace-nowrap focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 transition-all duration-200 h-10"
              >
                <Award className="w-4 h-4" />
                <span>Skills</span>
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
                    Personal Information
                  </h3>
                  <Button
                    onClick={() => setEditingProfile(!editingProfile)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {editingProfile ? "Cancel" : "Edit"}
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="nama_lengkap">Full Name</Label>
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
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={profileData.email}
                      disabled
                      className="mt-2 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="no_telepon">Phone Number</Label>
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
                      placeholder="e.g., +62-812-3456-7890"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="alamat">Address</Label>
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
                      placeholder="Your address"
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
                    placeholder="Tell us about yourself..."
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
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
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
                      Cancel
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
                  Security Settings
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Password Section */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">Password</h4>
                      <p className="text-sm text-gray-500">
                        Last changed:{" "}
                        {new Date(
                          securitySettings.password_last_changed || Date.now()
                        ).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsPasswordDialogOpen(true)}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Two-Factor Authentication
                      </h4>
                      <p className="text-sm text-gray-500">
                        Add an extra layer of security to your account
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
                        Login Notifications
                      </h4>
                      <p className="text-sm text-gray-500">
                        Get notified when someone logs into your account
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
                        Session Timeout
                      </h4>
                      <p className="text-sm text-gray-500">
                        Automatically log out after period of inactivity
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
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="480">8 hours</SelectItem>
                        <SelectItem value="720">12 hours</SelectItem>
                        <SelectItem value="1440">24 hours</SelectItem>
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
                  Notification Preferences
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {[
                  {
                    key: "email_notifications" as keyof NotificationSettings,
                    title: "Email Notifications",
                    description: "Receive notifications via email",
                    icon: Mail,
                  },
                  {
                    key: "task_reminders" as keyof NotificationSettings,
                    title: "Task Reminders",
                    description: "Get reminded about upcoming task deadlines",
                    icon: AlertCircle,
                  },
                  {
                    key: "project_updates" as keyof NotificationSettings,
                    title: "Project Updates",
                    description: "Notifications about project status changes",
                    icon: TrendingUp,
                  },
                  {
                    key: "deadline_alerts" as keyof NotificationSettings,
                    title: "Deadline Alerts",
                    description: "Important alerts for approaching deadlines",
                    icon: Calendar,
                  },
                  {
                    key: "system_announcements" as keyof NotificationSettings,
                    title: "System Announcements",
                    description: "Important system updates and announcements",
                    icon: Settings,
                  },
                  {
                    key: "mobile_push" as keyof NotificationSettings,
                    title: "Mobile Push Notifications",
                    description: "Push notifications on mobile devices",
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
                  Skills & Competencies
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Add New Skill */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Add New Skill
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Skill name"
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
                              {category.label}
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
                          "Add Skill"
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
                      <p className="text-gray-500">No skills added yet</p>
                      <p className="text-sm text-gray-400">
                        Add your first skill above
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
                              {skillCategories.find(
                                (c) => c.value === skill.category
                              )?.label || skill.category}
                            </Badge>
                          </div>
                          <Button
                            onClick={() => handleRemoveSkill(skill.name)}
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Proficiency Level</span>
                            <span className="font-semibold">
                              {skill.level}/5
                            </span>
                          </div>
                          <Progress value={skill.level * 20} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Beginner</span>
                            <span>Expert</span>
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
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new secure password.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="current_password">Current Password</Label>
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
              <Label htmlFor="new_password">New Password</Label>
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
              <Label htmlFor="confirm_password">Confirm New Password</Label>
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
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
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
                  • At least 8 characters
                </p>
                <p
                  className={
                    /[A-Z]/.test(passwordForm.new_password)
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  • Contains uppercase letter
                </p>
                <p
                  className={
                    /[a-z]/.test(passwordForm.new_password)
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  • Contains lowercase letter
                </p>
                <p
                  className={
                    /\d/.test(passwordForm.new_password)
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  • Contains number
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
              Cancel
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
                  Changing...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// File: src/lib/api/admin.ts
// API helper functions for admin profile settings

interface ProfileData {
  id: string;
  email: string;
  nama_lengkap: string;
  no_telepon?: string;
  alamat?: string;
  bio?: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  updated_at: string;
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

interface SettingsData {
  profile: ProfileData;
  notifications: NotificationSettings;
  security: SecuritySettings;
  preferences: PreferenceSettings;
  admin_settings: AdminSettings;
}

interface UpdateProfileData {
  nama_lengkap: string;
  no_telepon?: string;
  alamat?: string;
  bio?: string;
}

interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

class AdminAPI {
  private baseUrl = "/api/admin/profile-settings";

  async getSettings(): Promise<SettingsData> {
    const response = await fetch(this.baseUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch settings");
    }

    const result = await response.json();
    return result;
  }

  async updateProfile(data: UpdateProfileData): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "profile",
        data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update profile");
    }
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "password",
        data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to change password");
    }
  }

  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch(this.baseUrl, {
      method: "PUT",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload avatar");
    }

    const result = await response.json();
    return result.data.avatar_url;
  }

  async updateNotifications(settings: NotificationSettings): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "notifications",
        data: settings,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update notification settings");
    }
  }

  async updateSecurity(settings: SecuritySettings): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "security",
        data: settings,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update security settings");
    }
  }

  async updatePreferences(settings: PreferenceSettings): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "preferences",
        data: settings,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update preference settings");
    }
  }

  async updateAdminSettings(settings: AdminSettings): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "admin_settings",
        data: settings,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update admin settings");
    }
  }
}

export const adminAPI = new AdminAPI();
export type {
  ProfileData,
  NotificationSettings,
  SecuritySettings,
  PreferenceSettings,
  AdminSettings,
  SettingsData,
  UpdateProfileData,
  ChangePasswordData,
};

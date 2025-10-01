// File: src/app/api/admin/profile-settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/../database/types/database.types";
import { z } from "zod";

// Validation schemas
const ProfileUpdateSchema = z.object({
  email: z.string().email().optional(),
  nama_lengkap: z.string().min(1, "Name is required").max(100),
  no_telepon: z.string().optional(),
  alamat: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

const PasswordUpdateSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

const NotificationSettingsSchema = z.object({
  email_notifications: z.boolean(),
  task_reminders: z.boolean(),
  project_updates: z.boolean(),
  deadline_alerts: z.boolean(),
  system_announcements: z.boolean(),
  mobile_push: z.boolean(),
  admin_alerts: z.boolean(),
  security_notifications: z.boolean(),
  system_health_alerts: z.boolean(),
});

const PreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.enum(["id", "en"]),
  timezone: z.string(),
  date_format: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
  time_format: z.enum(["12h", "24h"]),
});

const AdminSettingsSchema = z.object({
  auto_backup_enabled: z.boolean(),
  maintenance_notifications: z.boolean(),
  user_activity_monitoring: z.boolean(),
  system_performance_alerts: z.boolean(),
  security_audit_logs: z.boolean(),
});

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = (await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()) as {
      data: {
        role: Database["public"]["Tables"]["users"]["Row"]["role"];
      } | null;
      error: unknown;
    };

    if (profileError || !userProfile || userProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get profile data
    const { data: profile, error: fetchError } = (await supabase
      .from("users")
      .select(
        `
        id,
        email,
        nama_lengkap,
        no_telepon,
        alamat,
        created_at,
        updated_at
      `,
      )
      .eq("id", user.id)
      .single()) as {
      data:
        | (Pick<
            Database["public"]["Tables"]["users"]["Row"],
            | "id"
            | "email"
            | "nama_lengkap"
            | "no_telepon"
            | "alamat"
            | "created_at"
            | "updated_at"
          > & {})
        | null;
      error: unknown;
    };

    if (fetchError) {
      throw new Error("Failed to fetch profile");
    }

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Get avatar URL from Supabase Storage
    const { data: avatarData } = await supabase.storage
      .from("avatars")
      .getPublicUrl(`${user.id}/avatar.jpg`);

    // Get user metadata for additional info
    const userMetadata = user.user_metadata || {};

    // Default settings
    const defaultNotifications = {
      email_notifications: true,
      task_reminders: true,
      project_updates: true,
      deadline_alerts: true,
      system_announcements: true,
      mobile_push: false,
      admin_alerts: true,
      security_notifications: true,
      system_health_alerts: true,
    };

    const defaultPreferences = {
      theme: "light" as const,
      language: "id" as const,
      timezone: "Asia/Jakarta",
      date_format: "DD/MM/YYYY" as const,
      time_format: "24h" as const,
    };

    const defaultAdminSettings = {
      auto_backup_enabled: true,
      maintenance_notifications: true,
      user_activity_monitoring: true,
      system_performance_alerts: true,
      security_audit_logs: true,
    };

    const defaultSecurity = {
      two_factor_enabled: false,
      login_notifications: true,
      session_timeout: 480,
      password_last_changed: user.created_at,
    };

    // Get system statistics
    const { data: systemStats } = await supabase
      .from("users")
      .select("role")
      .neq("id", user.id);

    const userCounts =
      (systemStats as { role: string }[])?.reduce(
        (acc, userData) => {
          acc[userData.role] = (acc[userData.role] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    return NextResponse.json({
      profile: {
        ...profile!,
        avatar_url: avatarData?.publicUrl,
        bio: userMetadata.bio || "",
        joined_date: profile!.created_at,
        last_active: profile!.updated_at,
      },
      notifications: userMetadata.notifications || defaultNotifications,
      preferences: userMetadata.preferences || defaultPreferences,
      admin_settings: userMetadata.admin_settings || defaultAdminSettings,
      security: defaultSecurity,
      system_stats: {
        total_users: systemStats?.length || 0,
        user_counts: userCounts,
      },
    });
  } catch (error) {
    console.error("Admin Settings API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = (await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()) as {
      data: {
        role: Database["public"]["Tables"]["users"]["Row"]["role"];
      } | null;
      error: unknown;
    };

    if (profileError || !userProfile || userProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case "profile": {
        const validatedData = ProfileUpdateSchema.parse(data);

        // Update profile in database
        const updatePayload: Database["public"]["Tables"]["users"]["Update"] = {
          email: validatedData.email || undefined,
          nama_lengkap: validatedData.nama_lengkap,
          no_telepon: validatedData.no_telepon || null,
          alamat: validatedData.alamat || null,
          updated_at: new Date().toISOString(),
        };

        const { data: updatedProfile, error: updateError } = await supabase
          .from("users")
          .update(updatePayload as never)
          .eq("id", user.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(updateError.message);
        }

        // Update bio in user metadata
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            bio: validatedData.bio || "",
          },
        });

        if (metadataError) {
          console.error("Metadata update error:", metadataError);
        }

        return NextResponse.json({
          message: "Profile updated successfully",
          profile: updatedProfile,
        });
      }

      case "password": {
        const validatedData = PasswordUpdateSchema.parse(data);

        // Update password
        const { error: passwordError } = await supabase.auth.updateUser({
          password: validatedData.new_password,
        });

        if (passwordError) {
          throw new Error(passwordError.message);
        }

        return NextResponse.json({
          message: "Password updated successfully",
        });
      }

      case "notifications": {
        const validatedData = NotificationSettingsSchema.parse(data);

        // Update notification settings in user metadata
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            notifications: validatedData,
          },
        });

        if (metadataError) {
          throw new Error(metadataError.message);
        }

        return NextResponse.json({
          message: "Notification settings updated successfully",
          notifications: validatedData,
        });
      }

      case "preferences": {
        const validatedData = PreferencesSchema.parse(data);

        // Update preferences in user metadata
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            preferences: validatedData,
          },
        });

        if (metadataError) {
          throw new Error(metadataError.message);
        }

        return NextResponse.json({
          message: "Preferences updated successfully",
          preferences: validatedData,
        });
      }

      case "admin_settings": {
        const validatedData = AdminSettingsSchema.parse(data);

        // Update admin settings in user metadata
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            admin_settings: validatedData,
          },
        });

        if (metadataError) {
          throw new Error(metadataError.message);
        }

        return NextResponse.json({
          message: "Admin settings updated successfully",
          admin_settings: validatedData,
        });
      }

      case "avatar": {
        const { avatar_file } = data;

        if (!avatar_file) {
          return NextResponse.json(
            { error: "Avatar file is required" },
            { status: 400 },
          );
        }

        // Upload avatar to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(`${user.id}/avatar.jpg`, avatar_file, {
            upsert: true,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // Get new avatar URL
        const { data: avatarData } = await supabase.storage
          .from("avatars")
          .getPublicUrl(`${user.id}/avatar.jpg`);

        return NextResponse.json({
          message: "Avatar updated successfully",
          avatar_url: avatarData?.publicUrl,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid update type" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Admin Settings Update Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

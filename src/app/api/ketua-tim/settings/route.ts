// File: src/app/api/ketua-tim/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";
import { z } from "zod";

// Validation schemas
const ProfileUpdateSchema = z.object({
  email: z.string().email().optional(),
  nama_lengkap: z.string().min(1, "Name is required").max(100),
  no_telepon: z.string().optional(),
  alamat: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  position: z.string().optional(),
  department: z.string().optional(),
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
  team_notifications: z.boolean(),
  budget_alerts: z.boolean(),
});

const PreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.enum(["id", "en"]),
  timezone: z.string(),
  date_format: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
  time_format: z.enum(["12h", "24h"]),
});

const TeamManagementSchema = z.object({
  auto_assign_tasks: z.boolean(),
  require_task_approval: z.boolean(),
  allow_member_task_creation: z.boolean(),
  send_daily_reports: z.boolean(),
  track_member_activity: z.boolean(),
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

    // Authorization: user must be a team leader by assignment, not by global role
    // 1) teams.leader_user_id = user.id OR
    // 2) project_members where role = 'leader' OR
    // 3) projects.leader_user_id = user.id
    let isLeader = false;
    try {
      const svc = createServiceClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data: t1 } = (await (svc as any)
        .from("teams")
        .select("id")
        .eq("leader_user_id", user.id)
        .limit(1)) as { data: { id: string }[] | null };
      const { data: t2 } = (await (svc as any)
        .from("project_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "leader")
        .limit(1)) as { data: { id: string }[] | null };
      const { data: t3 } = (await (svc as any)
        .from("projects")
        .select("id")
        .eq("leader_user_id", user.id)
        .limit(1)) as { data: { id: string }[] | null };
      isLeader = Boolean(
        (t1 && t1.length) || (t2 && t2.length) || (t3 && t3.length),
      );
    } catch {}

    if (!isLeader) {
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
      team_notifications: true,
      budget_alerts: true,
    };

    const defaultPreferences = {
      theme: "light" as const,
      language: "id" as const,
      timezone: "Asia/Jakarta",
      date_format: "DD/MM/YYYY" as const,
      time_format: "24h" as const,
    };

    const defaultTeamManagement = {
      auto_assign_tasks: false,
      require_task_approval: true,
      allow_member_task_creation: false,
      send_daily_reports: true,
      track_member_activity: true,
    };

    const defaultSecurity = {
      two_factor_enabled: false,
      login_notifications: true,
      session_timeout: 480,
      password_last_changed: user.created_at,
    };

    // Get team statistics
    const { data: teamStats } = await supabase
      .from("teams")
      .select(
        `
        id,
        name,
        description,
        project_assignments!inner(
          projects(
            id,
            nama_project,
            status
          )
        )
      `,
      )
      .eq("leader_user_id", user.id);

    return NextResponse.json({
      profile: {
        ...profile!,
        // gunakan nilai dari tabel users agar perubahan langsung tercermin
        email: profile!.email,
        nama_lengkap: (profile as any).nama_lengkap || "",
        no_telepon:
          (profile as any).no_telepon ??
          (userMetadata as any).no_telepon ??
          null,
        avatar_url: avatarData?.publicUrl,
        bio: userMetadata.bio || "",
        position: (userMetadata as any).position || "",
        department: (userMetadata as any).department || "",
        joined_date: profile!.created_at,
        last_active: profile!.updated_at,
      },
      notifications: userMetadata.notifications || defaultNotifications,
      preferences: userMetadata.preferences || defaultPreferences,
      team_management: userMetadata.team_management || defaultTeamManagement,
      security: defaultSecurity,
      team_stats: teamStats || [],
    });
  } catch (error) {
    console.error("Settings API Error:", error);
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

    // Authorization: same rule as GET - user must be a leader via teams/projects membership
    let isLeader = false;
    try {
      const svc = createServiceClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data: t1 } = (await (svc as any)
        .from("teams")
        .select("id")
        .eq("leader_user_id", user.id)
        .limit(1)) as { data: { id: string }[] | null };
      const { data: t2 } = (await (svc as any)
        .from("project_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "leader")
        .limit(1)) as { data: { id: string }[] | null };
      const { data: t3 } = (await (svc as any)
        .from("projects")
        .select("id")
        .eq("leader_user_id", user.id)
        .limit(1)) as { data: { id: string }[] | null };
      isLeader = Boolean(
        (t1 && t1.length) || (t2 && t2.length) || (t3 && t3.length),
      );
    } catch {}

    if (!isLeader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case "profile": {
        const validatedData = ProfileUpdateSchema.parse(data);

        // Update profile in database (allow updating email, name, phone, address, position, department)
        const normalizedPhone =
          validatedData.no_telepon && validatedData.no_telepon.trim() !== ""
            ? validatedData.no_telepon.trim()
            : null;
        const normalizedAlamat =
          validatedData.alamat && validatedData.alamat.trim() !== ""
            ? validatedData.alamat.trim()
            : null;

        const updatePayload: Database["public"]["Tables"]["users"]["Update"] = {
          email: validatedData.email || undefined,
          nama_lengkap: validatedData.nama_lengkap,
          no_telepon: normalizedPhone,
          alamat: normalizedAlamat,
          updated_at: new Date().toISOString(),
        } as any;

        // Use service role for update to avoid any RLS edge cases on specific columns
        const svcUpdate = createServiceClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );
        const { data: updatedProfile, error: updateError } = (await (
          svcUpdate as any
        )
          .from("users")
          .update(updatePayload as never)
          .eq("id", user.id)
          .select()
          .single()) as { data: any; error: any };

        if (updateError) {
          throw new Error(updateError.message);
        }

        // Update user metadata (bio + optional position/department and display name)
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            bio: validatedData.bio || "",
            ...(validatedData.nama_lengkap
              ? { nama_lengkap: validatedData.nama_lengkap }
              : {}),
            ...(validatedData.no_telepon
              ? { no_telepon: validatedData.no_telepon }
              : {}),
            ...(validatedData.alamat ? { alamat: validatedData.alamat } : {}),
            ...(validatedData.position
              ? { position: validatedData.position }
              : {}),
            ...(validatedData.department
              ? { department: validatedData.department }
              : {}),
          },
        } as any);

        if (metadataError) {
          console.error("Metadata update error:", metadataError);
        }

        // Force update auth email using service role (bypass confirmation)
        if (validatedData.email) {
          try {
            const svc = createServiceClient<Database>(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
            );
            const { error: adminErr } = await (
              svc as any
            ).auth.admin.updateUserById(user.id, {
              email: validatedData.email,
            });
            if (adminErr) {
              console.error("Admin email update error:", adminErr);
            }
          } catch (e) {
            console.error("Service role email update failed:", e);
          }
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

      case "team_management": {
        const validatedData = TeamManagementSchema.parse(data);

        // Update team management settings in user metadata
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            team_management: validatedData,
          },
        });

        if (metadataError) {
          throw new Error(metadataError.message);
        }

        return NextResponse.json({
          message: "Team management settings updated successfully",
          team_management: validatedData,
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
    console.error("Settings Update Error:", error);

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

// File: src/app/api/pegawai/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";
import { z } from "zod";

// Validation schema
const ProfileUpdateSchema = z.object({
  email: z.string().email().optional(),
  nama_lengkap: z.string().min(1, "Name is required").max(100),
  no_telepon: z.string().optional(),
  alamat: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
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

    if (
      profileError ||
      !userProfile ||
      (userProfile as any).role !== "pegawai"
    ) {
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

    // Default notification settings
    const defaultNotifications = {
      email_notifications: true,
      task_reminders: true,
      project_updates: true,
      deadline_alerts: true,
      system_announcements: true,
      mobile_push: false,
    };

    // Default security settings
    const defaultSecurity = {
      two_factor_enabled: false,
      login_notifications: true,
      session_timeout: 480,
      password_last_changed: user.created_at,
    };

    // Get skills from user metadata or database
    const skills = userMetadata.skills || [];

    return NextResponse.json({
      profile: {
        ...profile!,
        avatar_url: avatarData?.publicUrl,
        bio: userMetadata.bio || "",
        joined_date: profile!.created_at,
        last_active: profile!.updated_at,
      },
      notifications: userMetadata.notifications || defaultNotifications,
      security: defaultSecurity,
      skills,
    });
  } catch (error) {
    console.error("Profile API Error:", error);
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

    if (
      profileError ||
      !userProfile ||
      (userProfile as any).role !== "pegawai"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const validatedData = ProfileUpdateSchema.parse(body);

    // Normalize phone and address
    const normalizedPhone =
      validatedData.no_telepon && validatedData.no_telepon.trim() !== ""
        ? validatedData.no_telepon.trim()
        : null;
    const normalizedAlamat =
      validatedData.alamat && validatedData.alamat.trim() !== ""
        ? validatedData.alamat.trim()
        : null;

    // Update profile in database using service role to avoid RLS edge cases
    const updatePayload: Database["public"]["Tables"]["users"]["Update"] = {
      email: validatedData.email || undefined,
      nama_lengkap: validatedData.nama_lengkap,
      no_telepon: normalizedPhone,
      alamat: normalizedAlamat,
      updated_at: new Date().toISOString(),
    };

    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: updatedProfile, error: updateError } = (await (svc as any)
      .from("users")
      .update(updatePayload as never)
      .eq("id", user.id)
      .select()
      .single()) as { data: any; error: any };

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Update metadata mirror fields (bio, nama_lengkap, no_telepon, alamat)
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        bio: validatedData.bio || "",
        ...(validatedData.nama_lengkap
          ? { nama_lengkap: validatedData.nama_lengkap }
          : {}),
        ...(normalizedPhone ? { no_telepon: normalizedPhone } : {}),
        ...(normalizedAlamat ? { alamat: normalizedAlamat } : {}),
      },
    });

    if (metadataError) {
      console.error("Metadata update error:", metadataError);
      // Don't throw error for metadata update failure
    }

    // Force update auth email using service role (no verification)
    if (validatedData.email) {
      try {
        const svc = createServiceClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );
        const { error: adminErr } = await (
          svc as any
        ).auth.admin.updateUserById(user.id, { email: validatedData.email });
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
  } catch (error) {
    console.error("Profile Update Error:", error);

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

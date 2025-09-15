// File: src/app/api/pegawai/profile/notifications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/../database/types/database.types";
import { z } from "zod";

const NotificationSettingsSchema = z.object({
  email_notifications: z.boolean(),
  task_reminders: z.boolean(),
  project_updates: z.boolean(),
  deadline_alerts: z.boolean(),
  system_announcements: z.boolean(),
  mobile_push: z.boolean(),
});

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

    if (profileError || !userProfile || userProfile.role !== "pegawai") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const notificationSettings = NotificationSettingsSchema.parse(body);

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        notifications: notificationSettings,
      },
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      message: "Notification settings updated successfully",
      settings: notificationSettings,
    });
  } catch (error) {
    console.error("Notification Settings Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
}

// File: src/app/api/attendance/check-in/route.ts
// API endpoint for check-in

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

// Helper function to get WIB time (UTC+7)
function getWIBTime(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const wibTime = new Date(utc + 7 * 3600000); // UTC+7
  return wibTime;
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is pegawai or ketua_tim
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single<{ role: string }>();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    if (userProfile.role !== "pegawai" && userProfile.role !== "ketua_tim") {
      return NextResponse.json(
        { error: "Only pegawai and ketua_tim can check in" },
        { status: 403 },
      );
    }

    // Get current time in WIB
    const now = new Date();
    const wibTime = getWIBTime(now);
    const wibDate = format(wibTime, "yyyy-MM-dd");

    // Check if within working hours (07:30 - 15:30)
    const currentHour = wibTime.getHours();
    const currentMinute = wibTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const workStartMinutes = 7 * 60 + 30; // 07:30
    const workEndMinutes = 15 * 60 + 30; // 15:30

    if (
      currentTimeMinutes < workStartMinutes ||
      currentTimeMinutes > workEndMinutes
    ) {
      return NextResponse.json(
        {
          error:
            "Check-in hanya dapat dilakukan pada jam kerja (07:30 - 15:30)",
        },
        { status: 400 },
      );
    }

    // Create check-in record
    const insertPayload = {
      user_id: user.id,
      check_in_at: now.toISOString(),
      date: wibDate,
    };
    const { data: attendanceLog, error: insertError } = await (
      supabase.from("attendance_logs") as any
    )
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting attendance log:", insertError);
      return NextResponse.json(
        { error: "Gagal melakukan check-in" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: attendanceLog,
      message: "Check-in berhasil",
    });
  } catch (error) {
    console.error("Error in check-in:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

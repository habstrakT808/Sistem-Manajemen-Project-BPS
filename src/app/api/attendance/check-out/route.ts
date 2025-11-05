// File: src/app/api/attendance/check-out/route.ts
// API endpoint for check-out

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

// Helper function to get WIB time (UTC+7)
function getWIBTime(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const wibTime = new Date(utc + 7 * 3600000); // UTC+7
  return wibTime;
}

export async function POST(request: NextRequest) {
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
        { error: "Only pegawai and ketua_tim can check out" },
        { status: 403 },
      );
    }

    // Get request body
    const body = await request.json();
    const { attendanceLogId, reason } = body;

    if (!attendanceLogId) {
      return NextResponse.json(
        { error: "attendanceLogId is required" },
        { status: 400 },
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Alasan checkout wajib diisi" },
        { status: 400 },
      );
    }

    // Get current time in WIB
    const now = new Date();
    const wibTime = getWIBTime(now);
    const wibTimeStr = format(wibTime, "HH:mm:ss");

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
            "Check-out hanya dapat dilakukan pada jam kerja (07:30 - 15:30)",
        },
        { status: 400 },
      );
    }

    // Verify attendance log belongs to user and doesn't already have check_out_at
    const { data: existingLog, error: fetchError } = await supabase
      .from("attendance_logs")
      .select("*")
      .eq("id", attendanceLogId)
      .eq("user_id", user.id)
      .is("check_out_at", null)
      .single();

    if (fetchError || !existingLog) {
      return NextResponse.json(
        { error: "Attendance log tidak ditemukan atau sudah checkout" },
        { status: 404 },
      );
    }

    // Update attendance log with checkout
    const updateData = {
      check_out_at: now.toISOString(),
      check_out_reason: reason.trim(),
    };
    const { data: updatedLog, error: updateError } = await supabase
      .from("attendance_logs")
      .update(updateData as any)
      .eq("id", attendanceLogId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating attendance log:", updateError);
      return NextResponse.json(
        { error: "Gagal melakukan check-out" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedLog,
      message: "Check-out berhasil",
    });
  } catch (error) {
    console.error("Error in check-out:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

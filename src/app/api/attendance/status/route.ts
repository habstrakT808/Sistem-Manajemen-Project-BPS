// File: src/app/api/attendance/status/route.ts
// API endpoint to get current attendance status

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

// Helper function to get WIB time (UTC+7)
function getWIBTime(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const wibTime = new Date(utc + 7 * 3600000); // UTC+7
  return wibTime;
}

export async function GET(_request: NextRequest) {
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
        { error: "Only pegawai and ketua_tim can check attendance" },
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
    const isWorkingHours =
      currentTimeMinutes >= workStartMinutes &&
      currentTimeMinutes <= workEndMinutes;

    // Get today's attendance logs for this user
    const { data: todayLogs, error: logsError } = await (
      supabase.from("attendance_logs") as any
    )
      .select("*")
      .eq("user_id", user.id)
      .eq("date", wibDate)
      .order("check_in_at", { ascending: false });

    if (logsError) {
      console.error("Error fetching attendance logs:", logsError);
      return NextResponse.json(
        { error: "Gagal mengambil data kehadiran" },
        { status: 500 },
      );
    }

    // Find the most recent active log (check-in without check-out)
    const activeLog =
      todayLogs?.find((log: any) => log.check_out_at === null) || null;

    // Determine status
    let status: "check_in" | "check_out" | "off" = "check_in";
    let currentLog = null;

    if (!isWorkingHours) {
      status = "off";
    } else if (activeLog) {
      // Has active check-in (no checkout yet)
      status = "check_in";
      currentLog = activeLog;
    } else if (todayLogs && todayLogs.length > 0) {
      // Has logs but all are checked out
      status = "check_out";
      currentLog = null;
    } else {
      // No logs today, default to check_in (user hasn't checked in yet today)
      status = "check_in";
      currentLog = null;
    }

    return NextResponse.json({
      status,
      isWorkingHours,
      currentLog,
      todayLogs: todayLogs || [],
      message: "Status berhasil diambil",
    });
  } catch (error) {
    console.error("Error in get status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

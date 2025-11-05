// File: src/app/api/admin/attendance/monitoring/route.ts
// API endpoint for admin attendance monitoring

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format, parse } from "date-fns";

// Helper function to get WIB time (UTC+7)
function getWIBTime(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const wibTime = new Date(utc + 7 * 3600000); // UTC+7
  return wibTime;
}

export async function GET(request: NextRequest) {
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

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single<{ role: string }>();

    if (profileError || !userProfile || userProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin only" },
        { status: 403 },
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get("date");

    // Parse date or use today
    let targetDate: Date;
    if (dateStr) {
      try {
        targetDate = parse(dateStr, "yyyy-MM-dd", new Date());
      } catch {
        targetDate = new Date();
      }
    } else {
      targetDate = new Date();
    }

    const wibTime = getWIBTime(targetDate);
    const dateStrFormatted = format(wibTime, "yyyy-MM-dd");

    // Fetch all active pegawai
    const { data: pegawaiList, error: pegawaiError } = (await supabase
      .from("users")
      .select("id, nama_lengkap, email")
      .eq("role", "pegawai")
      .eq("is_active", true)
      .order("nama_lengkap", { ascending: true })) as {
      data: Array<{
        id: string;
        nama_lengkap: string;
        email: string;
      }> | null;
      error: any;
    };

    if (pegawaiError) {
      console.error("Error fetching pegawai:", pegawaiError);
      return NextResponse.json(
        { error: "Gagal mengambil data pegawai" },
        { status: 500 },
      );
    }

    // Fetch attendance logs for the selected date
    const { data: attendanceLogs, error: logsError } = (await supabase
      .from("attendance_logs")
      .select("*")
      .eq("date", dateStrFormatted)
      .order("check_in_at", { ascending: false })) as {
      data: Array<{
        id: string;
        user_id: string;
        check_in_at: string;
        check_out_at: string | null;
        check_out_reason: string | null;
        date: string;
      }> | null;
      error: any;
    };

    if (logsError) {
      console.error("Error fetching attendance logs:", logsError);
      return NextResponse.json(
        { error: "Gagal mengambil data kehadiran" },
        { status: 500 },
      );
    }

    // Get current time for status calculation
    const now = new Date();
    const nowWib = getWIBTime(now);
    const currentHour = nowWib.getHours();
    const currentMinute = nowWib.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const workStartMinutes = 7 * 60 + 30; // 07:30
    const workEndMinutes = 15 * 60 + 30; // 15:30
    const isWorkingHours =
      currentTimeMinutes >= workStartMinutes &&
      currentTimeMinutes <= workEndMinutes;

    // Process data: combine pegawai with their attendance logs
    const monitoringData = (pegawaiList || []).map((pegawai) => {
      // Get all logs for this pegawai on this date
      const userLogs = (attendanceLogs || []).filter(
        (log) => log.user_id === pegawai.id,
      );

      // Find active log (check-in without check-out)
      const activeLog = userLogs.find((log) => log.check_out_at === null);

      // Determine status
      let status: "check_in" | "check_out" | "off" = "off";
      if (!isWorkingHours) {
        status = "off";
      } else if (activeLog) {
        // Has active check-in (no checkout yet)
        status = "check_in";
      } else if (userLogs.length > 0) {
        // Has logs but all are checked out
        status = "check_out";
      } else {
        // No logs today, default to check_in during working hours
        status = "check_in";
      }

      // Format logs for display
      const formattedLogs = userLogs.map((log) => {
        const checkInTime = log.check_in_at
          ? format(getWIBTime(new Date(log.check_in_at)), "HH:mm:ss")
          : null;
        const checkOutTime = log.check_out_at
          ? format(getWIBTime(new Date(log.check_out_at)), "HH:mm:ss")
          : null;

        return {
          id: log.id,
          check_in_at: log.check_in_at,
          check_out_at: log.check_out_at,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          check_out_reason: log.check_out_reason,
          duration:
            checkOutTime && checkInTime
              ? calculateDuration(checkInTime, checkOutTime)
              : null,
        };
      });

      return {
        user_id: pegawai.id,
        nama_lengkap: pegawai.nama_lengkap,
        email: pegawai.email,
        status,
        logs: formattedLogs,
        activeLog: activeLog
          ? {
              id: activeLog.id,
              check_in_at: activeLog.check_in_at,
              check_in_time: format(
                getWIBTime(new Date(activeLog.check_in_at)),
                "HH:mm:ss",
              ),
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: monitoringData,
      date: dateStrFormatted,
      isWorkingHours,
      message: "Data monitoring berhasil diambil",
    });
  } catch (error) {
    console.error("Error in monitoring:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper function to calculate duration between two times
function calculateDuration(startTime: string, endTime: string): string {
  const [startHours, startMinutes, startSeconds] = startTime
    .split(":")
    .map(Number);
  const [endHours, endMinutes, endSeconds] = endTime.split(":").map(Number);

  const startTotalSeconds =
    startHours * 3600 + startMinutes * 60 + startSeconds;
  const endTotalSeconds = endHours * 3600 + endMinutes * 60 + endSeconds;

  const diffSeconds = endTotalSeconds - startTotalSeconds;

  if (diffSeconds < 0) {
    return "00:00:00";
  }

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

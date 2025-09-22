// File: src/app/api/admin/analytics/transport/export/route.ts
// NEW: Export transport analytics as CSV

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TransportRecord {
  occurred_on: string;
  amount: number;
  posted_at: string;
  users?: {
    nama_lengkap: string;
    email: string;
  };
  tasks?: {
    title: string;
    start_date: string;
    end_date: string;
    projects?: {
      nama_project: string;
      users?: {
        nama_lengkap: string;
      };
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30";

    // Auth check - admin only
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    type UserProfile = { role: "admin" | "ketua_tim" | "pegawai" };
    if (
      profileError ||
      !userProfile ||
      (userProfile as UserProfile).role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const daysBack = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get detailed transport data
    const { data: transportData, error: transportError } = await supabase
      .from("earnings_ledger")
      .select(
        `
        occurred_on,
        amount,
        posted_at,
        users (
          nama_lengkap,
          email
        ),
        tasks!earnings_ledger_source_id_fkey (
          title,
          start_date,
          end_date,
          projects (
            nama_project,
            users!projects_leader_user_id_fkey (
              nama_lengkap
            )
          )
        )
      `
      )
      .eq("type", "transport")
      .gte("occurred_on", startDate.toISOString().split("T")[0])
      .order("occurred_on", { ascending: false });

    if (transportError) {
      throw transportError;
    }

    // Generate CSV
    const csvHeaders = [
      "Date",
      "Amount",
      "Employee Name",
      "Employee Email",
      "Task Title",
      "Task Period",
      "Project Name",
      "Project Leader",
      "Posted At",
    ];

    const csvRows = (transportData || []).map((record: TransportRecord) => [
      record.occurred_on,
      record.amount,
      record.users?.nama_lengkap || "Unknown",
      record.users?.email || "Unknown",
      record.tasks?.title || "Unknown Task",
      record.tasks
        ? `${record.tasks.start_date} to ${record.tasks.end_date}`
        : "Unknown",
      record.tasks?.projects?.nama_project || "Unknown Project",
      record.tasks?.projects?.users?.nama_lengkap || "Unknown Leader",
      record.posted_at,
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row: (string | number)[]) =>
        row.map((field: string | number) => `"${field}"`).join(",")
      ),
    ].join("\n");

    const filename = `transport_analytics_${daysBack}days_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Transport Export API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// File: src/app/api/pegawai/earnings/export/route.ts
// NEW: Export earnings data as CSV

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface EarningsRecord {
  occurred_on: string;
  type: string;
  amount: number;
  tasks?: {
    title: string;
    projects?: {
      nama_project: string;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const month = parseInt(
      searchParams.get("month") || String(new Date().getMonth() + 1)
    );
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear())
    );

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get earnings data
    const { data: earnings, error: earningsError } = await supabase
      .from("earnings_ledger")
      .select(
        `
        type,
        amount,
        occurred_on,
        tasks!earnings_ledger_source_id_fkey (
          title,
          projects (nama_project)
        )
      `
      )
      .eq("user_id", user.id)
      .gte("occurred_on", `${year}-${month.toString().padStart(2, "0")}-01`)
      .lt(
        "occurred_on",
        `${year}-${(month + 1).toString().padStart(2, "0")}-01`
      )
      .order("occurred_on", { ascending: false });

    if (earningsError) {
      throw earningsError;
    }

    // Generate CSV
    const csvHeaders = ["Date", "Type", "Amount", "Task", "Project"];
    const csvRows = (earnings || []).map((record: EarningsRecord) => [
      record.occurred_on,
      record.type,
      record.amount,
      record.tasks?.title || "Unknown Task",
      record.tasks?.projects?.nama_project || "Unknown Project",
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.map((field) => `"${field}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="earnings_${year}_${month.toString().padStart(2, "0")}.csv"`,
      },
    });
  } catch (error) {
    console.error("Earnings Export API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

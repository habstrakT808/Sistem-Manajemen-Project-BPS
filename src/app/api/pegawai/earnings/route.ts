// File: src/app/api/pegawai/earnings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const month = monthParam
      ? parseInt(monthParam, 10)
      : new Date().getMonth() + 1;
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role validation
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "pegawai"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service client to bypass RLS for analytics aggregations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get monthly earnings (explicit select to avoid ambiguity)
    const { data: financialRecords, error: recordsError } = await serviceClient
      .from("financial_records")
      .select(
        `amount, description, created_at, project_id,
         projects ( nama_project, tanggal_mulai, deadline )`
      )
      .eq("recipient_type", "pegawai")
      .eq("recipient_id", user.id)
      .eq("bulan", month)
      .eq("tahun", year)
      .order("created_at", { ascending: false });

    if (recordsError) {
      throw recordsError;
    }

    // Calculate totals
    const totalEarnings = (financialRecords || []).reduce(
      (sum: number, record: { amount: number }) => sum + record.amount,
      0
    );

    // Get historical data (last 6 months)
    const historicalData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const histMonth = date.getMonth() + 1;
      const histYear = date.getFullYear();

      const { data: histRecords } = await serviceClient
        .from("financial_records")
        .select("amount")
        .eq("recipient_type", "pegawai")
        .eq("recipient_id", user.id)
        .eq("bulan", histMonth)
        .eq("tahun", histYear);

      const monthTotal = (histRecords || []).reduce(
        (sum: number, record: { amount: number }) => sum + record.amount,
        0
      );

      historicalData.push({
        month: histMonth,
        year: histYear,
        month_name: date.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
        total: monthTotal,
      });
    }

    return NextResponse.json({
      current_month: {
        month: parseInt(month.toString()),
        year: parseInt(year.toString()),
        total_earnings: totalEarnings,
        records: financialRecords || [],
      },
      historical_data: historicalData,
    });
  } catch (error) {
    console.error("Pegawai Earnings API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

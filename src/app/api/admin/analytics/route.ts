// File: src/app/api/admin/analytics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const daysBack = parseInt(searchParams.get("days_back") || "30");
    const monthsBack = parseInt(searchParams.get("months_back") || "12");

    // Check if user is admin
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

    if (
      profileError ||
      !userProfile ||
      (userProfile as { role: string }).role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    switch (type) {
      case "user_trends":
        const { data: userTrends, error: userError } = await (
          supabase as any
        ).rpc("get_user_registration_trends", {
          days_back: daysBack,
        });

        if (userError) throw userError;
        return NextResponse.json({ data: userTrends });

      case "project_analytics":
        const { data: projectAnalytics, error: projectError } = await (
          supabase as any
        ).rpc("get_project_analytics", {
          days_back: daysBack,
        });

        if (projectError) throw projectError;
        return NextResponse.json({ data: projectAnalytics });

      case "financial_analytics":
        const { data: financialAnalytics, error: financialError } = await (
          supabase as any
        ).rpc("get_financial_analytics", {
          months_back: monthsBack,
        });

        if (financialError) throw financialError;
        return NextResponse.json({ data: financialAnalytics });

      case "system_metrics":
        const { data: systemMetrics, error: systemError } = await (
          supabase as any
        ).rpc("get_system_performance_metrics");

        if (systemError) throw systemError;
        return NextResponse.json({ data: systemMetrics });

      default:
        return NextResponse.json(
          { error: "Invalid analytics type" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// File: src/app/api/ketua-tim/team-data/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// Removed unused Database import

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;
    const { searchParams } = new URL(request.url);
    const includeWorkload = searchParams.get("include_workload") === "true";

    // Check if user is ketua tim
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
      (userProfile as { role: string }).role !== "ketua_tim"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get pegawai list
    const { data: pegawai, error: pegawaiError } = await supabase
      .from("users")
      .select("id, nama_lengkap, email")
      .eq("role", "pegawai")
      .eq("is_active", true)
      .order("nama_lengkap");

    if (pegawaiError) {
      throw pegawaiError;
    }

    // Get mitra list
    const { data: mitra, error: mitraError } = await supabase
      .from("mitra")
      .select("id, nama_mitra, jenis, rating_average")
      .eq("is_active", true)
      .order("nama_mitra");

    if (mitraError) {
      throw mitraError;
    }

    let pegawaiWithWorkload = pegawai || [];

    // Get workload data if requested
    if (includeWorkload && pegawai) {
      pegawaiWithWorkload = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pegawai.map(async (p: any) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: workload } = await (supabase as any).rpc(
              "get_pegawai_workload",
              {
                pegawai_id: p.id,
                start_date: new Date().toISOString().split("T")[0],
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
              }
            );

            return {
              ...p,
              workload: workload?.[0] || {
                project_count: 0,
                workload_level: "low",
              },
            };
          } catch (error) {
            console.error(`Error getting workload for pegawai ${p.id}:`, error);
            return {
              ...p,
              workload: { project_count: 0, workload_level: "low" },
            };
          }
        })
      );
    }

    // Get mitra monthly totals
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const mitraWithLimits = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mitra || []).map(async (m: any) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: monthlyTotal } = await (supabase as any).rpc(
            "get_mitra_monthly_total",
            {
              mitra_id: m.id,
              month: currentMonth,
              year: currentYear,
            }
          );

          const currentTotal = monthlyTotal?.[0]?.total_amount || 0;
          const remainingLimit = 3300000 - currentTotal;

          return {
            ...m,
            monthly_usage: {
              current_total: currentTotal,
              remaining_limit: remainingLimit,
              limit_percentage: (currentTotal / 3300000) * 100,
            },
          };
        } catch (error) {
          console.error(
            `Error getting monthly total for mitra ${m.id}:`,
            error
          );
          return {
            ...m,
            monthly_usage: {
              current_total: 0,
              remaining_limit: 3300000,
              limit_percentage: 0,
            },
          };
        }
      })
    );

    return NextResponse.json({
      pegawai: pegawaiWithWorkload,
      mitra: mitraWithLimits,
    });
  } catch (error) {
    console.error("Team data fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

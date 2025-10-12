// File: src/app/api/force-cleanup-earnings/route.ts
// Force cleanup all transport earnings and recalculate from scratch

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/../database/types/database.types";

export async function POST(_request: NextRequest) {
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

    // Use service client to avoid RLS issues
    const svc = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Step 1: Delete ALL transport earnings for this user
    const { error: deleteError } = await svc
      .from("earnings_ledger")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "transport");

    if (deleteError) {
      throw deleteError;
    }

    // Step 2: Get all allocated transport allocations
    const { data: allocations, error: allocError } = await svc
      .from("task_transport_allocations")
      .select(
        `
        id,
        amount,
        allocation_date,
        user_id
      `,
      )
      .eq("user_id", user.id)
      .not("allocation_date", "is", null)
      .is("canceled_at", null);

    if (allocError) {
      throw allocError;
    }

    // Type the allocations properly
    type Allocation = {
      id: string;
      amount: number;
      allocation_date: string;
      user_id: string;
    };

    // Step 3: Recreate earnings entries for allocated allocations only
    let recreatedCount = 0;
    if (allocations && allocations.length > 0) {
      type EarningsToInsert = {
        user_id: string;
        type: string;
        amount: number;
        occurred_on: string;
        posted_at: string;
        source_id: string;
        source_table: string;
      };

      const earningsToInsert: EarningsToInsert[] = (
        (allocations as Allocation[]) || []
      ).map((alloc) => ({
        user_id: user.id,
        type: "transport",
        amount: alloc.amount,
        occurred_on: alloc.allocation_date,
        posted_at: new Date().toISOString(),
        source_id: alloc.id,
        source_table: "task_transport_allocations",
      }));

      const { error: insertError } = await svc
        .from("earnings_ledger")
        .insert(earningsToInsert as any);

      if (insertError) {
        throw insertError;
      }

      recreatedCount = earningsToInsert.length;
    }

    // Step 4: Get final totals
    const { data: finalEarnings, error: finalError } = await svc
      .from("earnings_ledger")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "transport");

    if (finalError) {
      throw finalError;
    }

    type FinalEarning = { amount: number };
    const totalEarnings = ((finalEarnings as FinalEarning[]) || []).reduce(
      (sum, earning) => sum + earning.amount,
      0,
    );
    const totalAllocations = ((allocations as Allocation[]) || []).reduce(
      (sum, alloc) => sum + alloc.amount,
      0,
    );

    return NextResponse.json({
      success: true,
      deleted_all_earnings: true,
      recreated_earnings: recreatedCount,
      total_earnings_after_force_cleanup: totalEarnings,
      total_allocations: totalAllocations,
      message: `Force cleanup completed. Deleted all earnings, recreated ${recreatedCount} entries. Total: ${totalEarnings}`,
    });
  } catch (error) {
    console.error("Force Cleanup Earnings Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

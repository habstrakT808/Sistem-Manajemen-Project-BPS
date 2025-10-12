// File: src/app/api/cleanup-transport-earnings/route.ts
// Clean up incorrect transport earnings entries

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

    // Get all transport allocations for this user
    const { data: allocations, error: allocError } = await svc
      .from("task_transport_allocations")
      .select(
        `
        id,
        task_id,
        amount,
        allocation_date,
        canceled_at
      `,
      )
      .eq("user_id", user.id)
      .is("canceled_at", null);

    if (allocError) {
      throw allocError;
    }

    // Get all earnings entries for this user
    const { data: earnings, error: earningsError } = await svc
      .from("earnings_ledger")
      .select(
        `
        id,
        type,
        amount,
        occurred_on,
        posted_at,
        source_id,
        source_table
      `,
      )
      .eq("user_id", user.id)
      .eq("type", "transport")
      .order("posted_at", { ascending: false });

    if (earningsError) {
      throw earningsError;
    }

    // Type the allocations and earnings properly
    type Allocation = {
      id: string;
      task_id: string;
      amount: number;
      allocation_date: string | null;
      canceled_at: string | null;
    };

    type Earning = {
      id: string;
      type: string;
      amount: number;
      occurred_on: string;
      posted_at: string;
      source_id: string;
      source_table: string;
    };

    // Find allocations that have allocation_date (should have earnings)
    const allocatedAllocations = ((allocations as Allocation[]) || []).filter(
      (alloc) => alloc.allocation_date !== null,
    );
    const allocatedAllocationIds = new Set(
      allocatedAllocations.map((alloc) => alloc.id),
    );

    // Find earnings that should exist (for allocated allocations)
    const validEarnings = ((earnings as Earning[]) || []).filter(
      (earning) =>
        earning.source_table === "task_transport_allocations" &&
        allocatedAllocationIds.has(earning.source_id),
    );

    // Find earnings that should NOT exist (for non-allocated allocations)
    const invalidEarnings = ((earnings as Earning[]) || []).filter(
      (earning) =>
        earning.source_table === "task_transport_allocations" &&
        !allocatedAllocationIds.has(earning.source_id),
    );

    // Remove invalid earnings
    let removedCount = 0;
    if (invalidEarnings.length > 0) {
      const { error: deleteError } = await svc
        .from("earnings_ledger")
        .delete()
        .in(
          "id",
          invalidEarnings.map((e) => e.id),
        );

      if (deleteError) {
        throw deleteError;
      }

      removedCount = invalidEarnings.length;
    }

    // Get updated totals
    const { data: updatedEarnings, error: updatedError } = await svc
      .from("earnings_ledger")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "transport");

    if (updatedError) {
      throw updatedError;
    }

    type UpdatedEarning = { amount: number };
    const totalEarnings = ((updatedEarnings as UpdatedEarning[]) || []).reduce(
      (sum, earning) => sum + earning.amount,
      0,
    );
    const totalAllocations = allocatedAllocations.reduce(
      (sum, alloc) => sum + alloc.amount,
      0,
    );

    return NextResponse.json({
      success: true,
      removed_invalid_entries: removedCount,
      total_earnings_after_cleanup: totalEarnings,
      total_allocations: totalAllocations,
      message: `Removed ${removedCount} invalid entries. Total earnings: ${totalEarnings}, Total allocations: ${totalAllocations}`,
    });
  } catch (error) {
    console.error("Cleanup Transport Earnings Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// File: src/app/api/fix-transport-earnings/route.ts
// Fix duplicate transport earnings by removing duplicates and keeping the latest

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

    // Get all transport earnings for this user
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

    // Type the earnings properly
    type Earning = {
      id: string;
      type: string;
      amount: number;
      occurred_on: string;
      posted_at: string;
      source_id: string;
      source_table: string;
    };

    // Group by source_id to find duplicates
    const earningsBySource = new Map<string, Earning>();
    const duplicatesToRemove: string[] = [];

    ((earnings as Earning[]) || []).forEach((earning) => {
      const key = `${earning.source_table}-${earning.source_id}`;
      if (earningsBySource.has(key)) {
        // Keep the latest (first in our sorted list) and mark others for removal
        duplicatesToRemove.push(earning.id);
      } else {
        earningsBySource.set(key, earning);
      }
    });

    // Remove duplicate entries
    let removedCount = 0;
    if (duplicatesToRemove.length > 0) {
      const { error: deleteError } = await svc
        .from("earnings_ledger")
        .delete()
        .in("id", duplicatesToRemove);

      if (deleteError) {
        throw deleteError;
      }

      removedCount = duplicatesToRemove.length;
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

    return NextResponse.json({
      success: true,
      removed_duplicates: removedCount,
      total_earnings_after_fix: totalEarnings,
      message: `Removed ${removedCount} duplicate entries. Total earnings: ${totalEarnings}`,
    });
  } catch (error) {
    console.error("Fix Transport Earnings Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

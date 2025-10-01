import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 DEBUG: Debug earnings API called!");

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get all earnings records
    const { data: allEarnings, error: earningsError } = await serviceClient
      .from("earnings_ledger")
      .select("*");

    console.log("🔍 DEBUG: All earnings:", allEarnings);
    console.log("🔍 DEBUG: Earnings error:", earningsError);

    // Get earnings for specific user
    const userId = "87aa041a-80bb-4c94-9d83-472ae25eb451";
    const { data: userEarnings, error: userEarningsError } = await serviceClient
      .from("earnings_ledger")
      .select("*")
      .eq("user_id", userId);

    console.log("🔍 DEBUG: User earnings:", userEarnings);
    console.log("🔍 DEBUG: User earnings error:", userEarningsError);

    // Get earnings with source details
    const { data: earningsWithSource, error: sourceError } = await serviceClient
      .from("earnings_ledger")
      .select(
        `
        *,
        tasks!inner (
          id,
          project_id,
          projects!inner (
            id,
            nama_project
          )
        )
      `,
      )
      .eq("user_id", userId);

    console.log("🔍 DEBUG: Earnings with source:", earningsWithSource);
    console.log("🔍 DEBUG: Source error:", sourceError);

    return NextResponse.json({
      all_earnings: allEarnings,
      user_earnings: userEarnings,
      earnings_with_source: earningsWithSource,
      summary: {
        total_earnings: (allEarnings || []).length,
        user_earnings_count: (userEarnings || []).length,
        earnings_with_source_count: (earningsWithSource || []).length,
      },
    });
  } catch (error) {
    console.error("🔍 DEBUG: Debug earnings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

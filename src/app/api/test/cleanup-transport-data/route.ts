import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(_request: NextRequest) {
  try {
    console.log("🧹 [CLEANUP] Transport data cleanup API called!");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get the user ID for dhikaedit@gmail.com
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, nama_lengkap")
      .eq("email", "dhikaedit@gmail.com")
      .single();

    if (userError || !userData) {
      console.log("🧹 [CLEANUP] User dhikaedit@gmail.com not found");
      return NextResponse.json({
        success: false,
        message: "User dhikaedit@gmail.com not found",
        error: userError?.message,
      });
    }

    console.log("🧹 [CLEANUP] Found user:", userData);

    // Get all transport allocations for this user
    const { data: allocations, error: allocationsError } = await supabase
      .from("task_transport_allocations")
      .select("id, task_id, amount, allocation_date, allocated_at")
      .eq("user_id", userData.id);

    if (allocationsError) {
      console.error(
        "🧹 [CLEANUP] Error fetching allocations:",
        allocationsError,
      );
      throw allocationsError;
    }

    console.log("🧹 [CLEANUP] Found allocations:", allocations?.length || 0);

    if (!allocations || allocations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No transport allocations found for user dhikaedit@gmail.com",
        user: userData,
        deleted_count: 0,
      });
    }

    // Delete all transport allocations for this user
    const { error: deleteError } = await supabase
      .from("task_transport_allocations")
      .delete()
      .eq("user_id", userData.id);

    if (deleteError) {
      console.error("🧹 [CLEANUP] Error deleting allocations:", deleteError);
      throw deleteError;
    }

    // Also clean up any related earnings ledger entries
    const { error: earningsDeleteError } = await supabase
      .from("earnings_ledger")
      .delete()
      .eq("user_id", userData.id)
      .eq("type", "transport");

    if (earningsDeleteError) {
      console.error(
        "🧹 [CLEANUP] Error deleting earnings:",
        earningsDeleteError,
      );
      // Don't throw here, just log the error
    }

    console.log(
      "🧹 [CLEANUP] Successfully deleted",
      allocations.length,
      "transport allocations",
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${allocations.length} transport allocations for user dhikaedit@gmail.com`,
      user: userData,
      deleted_count: allocations.length,
      deleted_allocations: allocations,
    });
  } catch (error) {
    console.error("🧹 [CLEANUP] Transport cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to cleanup transport data",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "Use POST method to cleanup transport data for dhikaedit@gmail.com",
  });
}

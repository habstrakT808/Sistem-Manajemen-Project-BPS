import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] Checking database tables...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get all tables in public schema
    const { data: tables, error } = await supabase.rpc("get_table_names");

    if (error) {
      // Fallback: try to query information_schema
      const { data: fallbackTables, error: fallbackError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public");

      if (fallbackError) {
        console.error("Tables fetch error:", fallbackError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch tables",
            details: fallbackError,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          tables: fallbackTables?.map((t) => t.table_name) || [],
          method: "information_schema",
        },
      });
    }

    console.log("🔍 [DEBUG] Tables found:", tables?.length || 0);

    return NextResponse.json({
      success: true,
      data: {
        tables: tables || [],
        method: "rpc",
      },
    });
  } catch (error) {
    console.error("🔍 [DEBUG] Error checking tables:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

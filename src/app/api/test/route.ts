import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 [TEST] Starting test API");

    // Test Supabase connection
    const supabase = await createClient();
    console.log("🔍 [TEST] Supabase client created successfully");

    // Test auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log("🔍 [TEST] Auth result:", {
      user: user ? { id: user.id, email: user.email } : null,
      authError: authError?.message || null,
    });

    // Test database connection
    const { data: testData, error: dbError } = await supabase
      .from("users")
      .select("id, role")
      .limit(1);

    console.log("🔍 [TEST] Database test result:", {
      testDataCount: testData?.length || 0,
      dbError: dbError?.message || null,
    });

    return NextResponse.json({
      success: true,
      auth: {
        user: user ? { id: user.id, email: user.email } : null,
        error: authError?.message || null,
      },
      database: {
        connected: !dbError,
        error: dbError?.message || null,
        testData: testData || [],
      },
    });
  } catch (error) {
    console.error("🔍 [TEST] Test API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

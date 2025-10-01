import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(_request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] Checking auth users...");

    // Use service client to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get auth users
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("Auth users fetch error:", authError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch auth users",
          details: authError,
        },
        { status: 500 },
      );
    }

    // Get user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("*");

    if (profilesError) {
      console.error("Profiles fetch error:", profilesError);
    }

    console.log("🔍 [DEBUG] Auth users found:", authUsers.users.length);
    console.log("🔍 [DEBUG] Profiles found:", profiles?.length || 0);

    return NextResponse.json({
      success: true,
      data: {
        authUsersCount: authUsers.users.length,
        profilesCount: profiles?.length || 0,
        authUsers: authUsers.users.map((user) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          email_confirmed_at: user.email_confirmed_at,
          user_metadata: user.user_metadata,
        })),
        profiles: profiles || [],
      },
    });
  } catch (error) {
    console.error("🔍 [DEBUG] Error checking auth users:", error);
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
